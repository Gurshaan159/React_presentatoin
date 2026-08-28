-- ============================================================================
-- Estacado Acquisition — Well disposition screen
-- Which wells to DECOMMISSION/PLUG, SELL/DIVEST, or KEEP.
--
-- Inputs (loaded by decommission_screen.py):
--   hse_incidents(well_id, occurred_on, category, title, description, business_unit)
--       <- hse_incidents.json, well IDs canonicalised to W00NN
--   well_signals(well, site, status, year_profit, margin_pct, cost_per_boe,
--                wc_recent, decl_ann, ...)   <- cleaned/well_investment_signals.csv
--
-- Rationale is HSE-led (safety / environmental liability), with the economic
-- columns used only to decide PLUG vs SELL once a well is flagged.
-- ============================================================================

WITH
-- 1. Weight every incident by consequence severity ------------------------------
inc AS (
    SELECT
        well_id,
        date(occurred_on) AS d,
        category,
        title,
        CASE title
            WHEN 'Uncontrolled release'     THEN 10   -- loss of well control / H2S to atmosphere
            WHEN 'Serious injury'           THEN 8    -- hospitalisation (all are H2S exposures)
            WHEN 'Fire / near miss'         THEN 5    -- compressor / facility fire
            WHEN 'Hydrocarbon spill'        THEN 4
            WHEN 'Produced water release'   THEN 3
            WHEN 'Permit violation'         THEN 3    -- wilful / repeat flare breach
            WHEN 'Lost-time injury'         THEN 3
            WHEN 'Regulatory citation'      THEN 2
            WHEN 'Environmental exceedance' THEN 2    -- flare over permit
            WHEN 'Recordable injury'        THEN 2
            WHEN 'Vehicle incident'         THEN 2
            WHEN 'Minor spill'              THEN 1
            WHEN 'Slip / trip / fall'       THEN 1
            ELSE 1
        END AS sev
    FROM hse_incidents
),

-- 2. Roll incidents up to one row per well ------------------------------------
w AS (
    SELECT
        well_id,
        COUNT(*)                                                          AS n_incidents,
        SUM(sev)                                                          AS sev_total,
        -- last 6 months before the 2026-08-11 portal export = is it still happening?
        SUM(CASE WHEN d >= date('2026-02-11') THEN sev ELSE 0 END)        AS sev_6mo,
        SUM(title = 'Uncontrolled release')                               AS n_uncontrolled,
        SUM(title = 'Serious injury')                                     AS n_serious_injury,
        SUM(title = 'Fire / near miss')                                   AS n_fire,
        SUM(title = 'Hydrocarbon spill')                                  AS n_hc_spill,
        SUM(title = 'Produced water release')                             AS n_pw_release,
        SUM(title IN ('Environmental exceedance', 'Permit violation'))    AS n_flare_breach,
        SUM(title IN ('Regulatory citation', 'Permit violation'))         AS n_regulatory,
        -- distinct environmental hits = breadth of an environmental problem
        SUM(category = 'Environment' OR title = 'Uncontrolled release')   AS n_env,
        -- catastrophic = loss of containment or an H2S hospitalisation, in 2026
        SUM(CASE WHEN title IN ('Uncontrolled release', 'Serious injury')
                  AND d >= date('2026-01-01') THEN 1 ELSE 0 END)          AS n_catastrophic_2026
    FROM inc
    GROUP BY well_id
),

-- 3. Join economics and classify --------------------------------------------
scored AS (
    SELECT
        w.*,
        s.site, s.status,
        s.year_profit, s.margin_pct, s.cost_per_boe, s.wc_recent, s.decl_ann,
        CASE
            -- (A) Chronic HSE record AND an unresolved catastrophic hazard
            --     -> the liability travels with the well; retire it.
            WHEN (w.sev_total >= 34 OR w.n_incidents >= 9)
             AND (w.n_catastrophic_2026 >= 1 OR w.n_fire >= 2 OR w.n_pw_release >= 3)
                THEN 'DECOMMISSION / PLUG'

            -- (B) High HSE burden on a well that already loses money
            --     -> no buyer, no upside; plug it.
            WHEN w.sev_total >= 34
             AND COALESCE(s.year_profit, -1) <= 0
                THEN 'DECOMMISSION / PLUG'

            -- (C) Elevated, repeated ENVIRONMENTAL record (>=3 distinct env events)
            --     but contained, with no H2S hospitalisation ("no major safety
            --     event"), and the barrel still has positive value
            --     -> monetise it and transfer the obligation to a buyer.
            WHEN w.sev_total >= 15
             AND w.n_env  >= 3
             AND w.n_serious_injury = 0
             AND COALESCE(s.year_profit, -1e9) > -1000000
                THEN 'SELL / DIVEST'

            ELSE 'KEEP'
        END AS recommendation
    FROM w
    JOIN well_signals s ON s.well = w.well_id
)

SELECT
    recommendation,
    well_id,
    site,
    status,
    n_incidents,
    sev_total,
    sev_6mo,
    n_uncontrolled   AS unctrl_release,
    n_serious_injury AS h2s_hosp,
    n_fire           AS fires,
    n_hc_spill       AS hc_spills,
    n_pw_release     AS pw_releases,
    n_flare_breach   AS flare_breaches,
    n_regulatory     AS reg_actions,
    ROUND(year_profit / 1e6, 1) AS profit_musd_yr,
    margin_pct,
    cost_per_boe,
    wc_recent        AS water_cut_pct,
    decl_ann         AS decline_pct_yr
FROM scored
WHERE recommendation <> 'KEEP'
ORDER BY
    CASE recommendation WHEN 'DECOMMISSION / PLUG' THEN 0 ELSE 1 END,
    sev_total DESC;
