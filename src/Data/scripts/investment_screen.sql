-- ============================================================================
-- Estacado Acquisition — Well investment screen
-- Which wells should receive additional capital, and what intervention.
--
-- Inputs (loaded by investment_screen.py):
--   well_signals(well, site, status, boe_recent, boe_first, decl_ann,
--                wc_first, wc_recent, uptime, load_psi, iot, iot_temp_f,
--                iot_press_psi, iot_vib_p95, year_profit, margin_pct,
--                cost_per_boe, ...)          <- cleaned/well_investment_signals.csv
--   hse_incidents(well_id, occurred_on, category, title, ...)
--                                            <- hse_incidents.json (canon IDs)
--
-- Logic: this is PRODUCTION-led (does the barrel justify the spend?), with the
-- HSE record used to (a) veto wells whose liability makes new capital unwise
-- and (b) add a compliance-capex leg where a fix also removes a permit/
-- containment problem. Intervention type is inferred from the signal that
-- triggers the flag. See investment_screen.py header for the full criteria.
-- ============================================================================

WITH
-- 1. HSE roll-up (same severity weights as decommission_screen.sql) -----------
inc AS (
    SELECT well_id, title,
        CASE title
            WHEN 'Uncontrolled release'     THEN 10
            WHEN 'Serious injury'           THEN 8
            WHEN 'Fire / near miss'         THEN 5
            WHEN 'Hydrocarbon spill'        THEN 4
            WHEN 'Produced water release'   THEN 3
            WHEN 'Permit violation'         THEN 3
            WHEN 'Lost-time injury'         THEN 3
            WHEN 'Regulatory citation'      THEN 2
            WHEN 'Environmental exceedance' THEN 2
            WHEN 'Recordable injury'        THEN 2
            WHEN 'Vehicle incident'         THEN 2
            WHEN 'Minor spill'              THEN 1
            WHEN 'Slip / trip / fall'       THEN 1
            ELSE 1
        END AS sev,
        date(occurred_on) AS d
    FROM hse_incidents
),
hse AS (
    SELECT well_id,
        COUNT(*)                                                       AS n_incidents,
        SUM(sev)                                                       AS sev_total,
        SUM(title = 'Uncontrolled release')                            AS n_uncontrolled,
        SUM(title = 'Serious injury')                                  AS n_serious_injury,
        SUM(title = 'Fire / near miss')                                AS n_fire,
        SUM(title = 'Hydrocarbon spill')                               AS n_hc_spill,
        SUM(title = 'Minor spill')                                     AS n_minor_spill,
        SUM(title = 'Produced water release')                          AS n_pw_release,
        SUM(title IN ('Environmental exceedance', 'Permit violation')) AS n_flare_breach,
        SUM(CASE WHEN title IN ('Uncontrolled release', 'Serious injury')
                  AND d >= date('2026-01-01') THEN 1 ELSE 0 END)       AS n_catastrophic_2026
    FROM inc GROUP BY well_id
),

-- 2. Join signals + HSE, derive intervention flags --------------------------
f AS (
    SELECT
        s.well, s.site, s.status,
        s.boe_recent, s.decl_ann, s.wc_first, s.wc_recent,
        s.iot, s.iot_temp_f, s.iot_press_psi, s.iot_vib_p95,
        s.year_profit, s.margin_pct, s.cost_per_boe,
        COALESCE(h.n_incidents, 0)          AS n_incidents,
        COALESCE(h.sev_total, 0)            AS sev_total,
        COALESCE(h.n_flare_breach, 0)       AS n_flare_breach,
        COALESCE(h.n_fire, 0)               AS n_fire,
        COALESCE(h.n_hc_spill, 0)           AS n_hc_spill,
        COALESCE(h.n_minor_spill, 0)        AS n_minor_spill,
        COALESCE(h.n_pw_release, 0)         AS n_pw_release,

        -- ---- HSE veto: chronic record + unresolved catastrophic hazard -----
        (   (COALESCE(h.sev_total,0) >= 34 OR COALESCE(h.n_incidents,0) >= 9)
        AND (COALESCE(h.n_catastrophic_2026,0) >= 1
             OR COALESCE(h.n_fire,0) >= 2
             OR COALESCE(h.n_pw_release,0) >= 3)
        )
        OR (COALESCE(h.sev_total,0) >= 34 AND COALESCE(s.year_profit,-1) <= 0)
                                                        AS hse_veto,

        -- ---- economic gate: is the barrel worth new capital? --------------
        (s.year_profit > 0 OR s.cost_per_boe < 35)      AS econ_ok,

        -- ---- PRODUCTION interventions -----------------------------------
        -- Choke / compression / ESP optimisation workover:
        --   downhole running hot + overpressured + rough, IoT in-spec share low
        (s.iot_temp_f   >= 260 AND s.iot_press_psi >= 7000
         AND s.iot_vib_p95 >= 4.2 AND s.iot < 85)       AS flag_workover,

        -- Artificial lift + water shutoff:
        --   water cut in the lift-economic window (45-65%) and climbing,
        --   decline accelerating, and the well still earns enough to justify
        --   the capex (>= $5M/yr).  Above ~70% water cut the lift ROI is poor.
        (s.wc_recent >= 45 AND s.wc_recent <= 65 AND (s.wc_recent - s.wc_first) >= 3
         AND s.decl_ann >= 17 AND s.year_profit >= 5000000)  AS flag_lift,

        -- Offset / infill drilling:
        --   thick current rate, cheap barrels, shallow decline, low water cut
        (s.boe_recent >= 650 AND s.cost_per_boe <= 25
         AND s.decl_ann <= 18 AND s.wc_recent <= 40)    AS flag_offset,

        -- ---- COMPLIANCE-capex interventions -----------------------------
        -- Flare gas recovery + compressor reliability: repeat permit breaches
        (COALESCE(h.n_flare_breach,0) >= 2
         OR (COALESCE(h.n_fire,0) >= 1 AND COALESCE(h.n_flare_breach,0) >= 1))
                                                        AS flag_flare,

        -- Water-handling workover + secondary containment: repeat losses of
        -- produced water / crude to ground or bund
        (COALESCE(h.n_pw_release,0) >= 2
         OR (COALESCE(h.n_pw_release,0) + COALESCE(h.n_hc_spill,0)) >= 3)
                                                        AS flag_water,

        -- Tank automation / level control + ESD: recurring tank overfills
        (COALESCE(h.n_hc_spill,0) >= 2
         OR (COALESCE(h.n_hc_spill,0) >= 1 AND COALESCE(h.n_minor_spill,0) >= 1))
                                                        AS flag_tank
    FROM well_signals s
    LEFT JOIN hse h ON h.well_id = s.well
    WHERE s.status = 'ACTIVE'
),

-- 3. Assemble recommendation + priority ------------------------------------
rec AS (
    SELECT f.*,
        TRIM(
            CASE WHEN flag_workover THEN 'choke/compression/ESP workover; ' ELSE '' END ||
            CASE WHEN flag_offset   THEN 'offset/infill drilling; '        ELSE '' END ||
            CASE WHEN flag_lift     THEN 'artificial lift + water shutoff; ' ELSE '' END ||
            CASE WHEN flag_flare    THEN 'flare-gas recovery + compressor reliability; ' ELSE '' END ||
            CASE WHEN flag_water    THEN 'water-handling workover + secondary containment; ' ELSE '' END ||
            CASE WHEN flag_tank     THEN 'tank automation / level control + ESD; ' ELSE '' END
        )                                               AS intervention,
        (flag_workover OR flag_offset OR flag_lift)      AS has_production_leg,
        (flag_flare OR flag_water OR flag_tank)          AS has_compliance_leg
    FROM f
)

SELECT
    CASE
        -- 1: production upside, HSE record clean -> fund on economics alone
        WHEN has_production_leg AND econ_ok AND NOT hse_veto AND sev_total < 15
            THEN '1 - INVEST NOW (production ROI)'
        -- 2: real production/compliance upside AND a moderate HSE record that
        --    the same capital also mitigates -> fund with an HSE work plan
        WHEN (has_production_leg OR has_compliance_leg) AND econ_ok AND NOT hse_veto
            THEN '2 - INVEST + HSE PLAN'
        -- 3: a fix is identifiable but the barrel does not support new capital
        --    -> price the spend against plugging cost
        WHEN (has_production_leg OR has_compliance_leg) AND NOT hse_veto
            THEN '3 - MARGINAL / COMPLIANCE-ONLY'
        -- 4: best-in-class production target, but the well is a plug candidate
        --    -> resolve plug-vs-workover (engineering root-cause + AFE) first
        WHEN (has_production_leg OR has_compliance_leg) AND hse_veto
            THEN '4 - BLOCKED BY HSE (plug-vs-fix first)'
        ELSE '5 - NO ACTION'
    END AS tier,
    RTRIM(intervention, '; ')                        AS intervention,
    well, site,
    ROUND(boe_recent)                               AS boe_d,
    decl_ann                                        AS decl_pct_yr,
    wc_recent                                       AS wc_pct,
    ROUND(iot)                                      AS iot_inspec_pct,
    ROUND(iot_temp_f)                               AS temp_f,
    ROUND(iot_press_psi)                            AS press_psi,
    iot_vib_p95                                     AS vib_p95,
    ROUND(year_profit / 1e6, 1)                     AS profit_musd_yr,
    margin_pct,
    cost_per_boe,
    n_incidents, sev_total, n_flare_breach, n_pw_release, n_hc_spill
FROM rec
WHERE (has_production_leg OR has_compliance_leg)
ORDER BY
    tier,
    (flag_workover OR flag_offset) DESC,   -- production upside first within a tier
    year_profit DESC;
