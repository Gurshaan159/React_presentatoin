"""
Run scripts/investment_screen.sql against the well investment-signals table +
the raw HSE export, print the ranked investment table, and write
cleaned/investment_screen.csv.

Stdlib only. Usage:  python scripts/investment_screen.py

----------------------------------------------------------------------------
WELL INVESTMENT CRITERIA
----------------------------------------------------------------------------
The screen is PRODUCTION-led: the barrel has to justify the spend. The HSE
record is used two ways -- as a veto (don't put new capital into a plug
candidate) and as a second leg (fund the fix that also closes a permit or
containment problem). Intervention type is inferred from the trigger.

Only ACTIVE wells are considered (shut-ins need a well-file review first).

--- Step 1: HSE roll-up (severity weights identical to decommission_screen) ---
    Per well: n_incidents, sev_total, counts of flare breaches / fires /
    hydrocarbon spills / produced-water releases, and catastrophic-2026 count.

--- Step 2: gates ----------------------------------------------------------
    hse_veto  = chronic record AND unresolved catastrophic hazard
                  (sev_total >= 34 OR n_incidents >= 9)
                  AND (catastrophic event in 2026 OR >=2 fires OR >=3 PW releases)
                OR (sev_total >= 34 AND year_profit <= 0)
              -> the same wells decommission_screen.sql sends to PLUG.
    econ_ok   = year_profit > 0  OR  cost_per_boe < 35
              -> is the barrel cheap enough to be worth new capital.

--- Step 3: intervention flags (data-driven) -----------------------------
  PRODUCTION legs
    flag_workover  choke / compression / ESP optimisation
        iot_temp_f >= 260 AND iot_press_psi >= 7000
        AND iot_vib_p95 >= 4.2 AND iot < 85
        (downhole running hot, overpressured, rough; low in-spec IoT share)
        -> the S05 mechanical signature.
    flag_lift      artificial lift + water shutoff
        wc_recent BETWEEN 45 AND 65 AND (wc_recent - wc_first) >= 3
        AND decl_ann >= 17 AND year_profit >= 5_000_000
        (water cut in the lift-economic window and climbing, decline
        accelerating, well earns enough to carry the capex; above ~70%
        water cut the lift ROI is poor) -> S01 / S08.
    flag_offset    offset / infill drilling
        boe_recent >= 650 AND cost_per_boe <= 25
        AND decl_ann <= 18 AND wc_recent <= 40
        (thick rate, cheap barrels, shallow decline, low water cut)
        -> S03 (clean) and S05 (HSE-gated).
  COMPLIANCE-capex legs
    flag_flare     flare-gas recovery + compressor reliability
        n_flare_breach >= 2  OR  (n_fire >= 1 AND n_flare_breach >= 1)
    flag_water     water-handling workover + secondary containment
        n_pw_release >= 2  OR  (n_pw_release + n_hc_spill) >= 3
    flag_tank      tank automation / level control + ESD
        n_hc_spill >= 2  OR  (n_hc_spill >= 1 AND n_minor_spill >= 1)
        (recurring tank overfills / pad spills)

--- Step 4: tiers --------------------------------------------------------
    1  INVEST NOW (production ROI)  production leg, econ_ok, no veto,
                                sev_total < 15  -> fund on economics alone
    2  INVEST + HSE PLAN        any leg, econ_ok, no veto, sev_total >= 15
                                (moderate HSE record the same capex mitigates)
    3  MARGINAL / COMPLIANCE-ONLY   leg identified but econ_ok fails
                                -> price the spend against plugging cost
    4  BLOCKED BY HSE           best-in-class production target but the well
                                is a plug candidate -> engineering root-cause
                                + AFE to settle plug-vs-workover first
    5  NO ACTION                no leg

Caveats: no AFE / intervention-cost / price-deck data, so this ranks
opportunity, not NPV. Offset-drilling flags are site-level (no per-well
location, spacing, or lateral length). The S05 workover flag and the S05
plug recommendation point at the same 5 wells -- that plug-vs-workover
decision (~$98M/yr of production) is the real call and needs an engineering
root-cause + AFE, not this screen.
----------------------------------------------------------------------------
"""
import csv
import datetime
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HSE = ROOT / "hse_incidents.json"
SIGNALS = ROOT / "cleaned" / "well_investment_signals.csv"
SQL = Path(__file__).with_suffix(".sql")
OUT = ROOT / "cleaned" / "investment_screen.csv"

NUMERIC = {
    "boe_recent", "boe_first", "chg_pct", "decl_ann", "wc_first", "wc_recent",
    "gor_first", "gor_recent", "uptime", "downtime_min", "load_psi", "iot",
    "iot_temp_f", "iot_press_psi", "iot_vib", "iot_vib_p95", "year_profit",
    "margin_pct", "cost_per_boe", "hse",
}


def canon(well_id: str) -> str:
    digits = str(well_id).lower().replace("w", "").lstrip("0") or "0"
    return f"W{int(digits):04d}"


def iso_date(raw) -> str:
    if isinstance(raw, (int, float)):
        return datetime.datetime.fromtimestamp(raw / 1000, datetime.UTC).date().isoformat()
    return str(raw)[:10]


def main() -> None:
    db = sqlite3.connect(":memory:")
    db.row_factory = sqlite3.Row

    db.execute(
        "CREATE TABLE hse_incidents (well_id TEXT, occurred_on TEXT, "
        "category TEXT, title TEXT, description TEXT, business_unit TEXT)"
    )
    incidents = json.loads(HSE.read_text())["incidents"]
    db.executemany(
        "INSERT INTO hse_incidents VALUES (?,?,?,?,?,?)",
        [
            (canon(x["wellId"]), iso_date(x["occurredOn"]), x.get("category"),
             x.get("incidentTitle"), x.get("incidentDescription"), x.get("businessUnit"))
            for x in incidents
        ],
    )

    with SIGNALS.open(newline="") as fh:
        rows = list(csv.DictReader(fh))
    cols = list(rows[0].keys())
    db.execute("CREATE TABLE well_signals (" + ",".join(f'"{c}"' for c in cols) + ")")

    def cast(col, val):
        if col in NUMERIC:
            return float(val) if val not in ("", None) else None
        return val

    db.executemany(
        "INSERT INTO well_signals VALUES (" + ",".join("?" * len(cols)) + ")",
        [tuple(cast(c, r[c]) for c in cols) for r in rows],
    )

    result = db.execute(SQL.read_text()).fetchall()
    headers = list(result[0].keys())
    widths = {h: max(len(h), *(len(str(r[h])) for r in result)) for h in headers}

    def fmt(r):
        return "  ".join(str(r[h]).ljust(widths[h]) for h in headers)

    print("  ".join(h.ljust(widths[h]) for h in headers))
    print("-" * (sum(widths.values()) + 2 * (len(headers) - 1)))
    tier = None
    for r in result:
        if r["tier"] != tier:
            if tier is not None:
                print()
            tier = r["tier"]
        print(fmt(r))

    with OUT.open("w", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(headers)
        writer.writerows(tuple(r) for r in result)
    print(f"\nwrote {OUT.relative_to(ROOT)}  ({len(result)} wells)")


if __name__ == "__main__":
    main()
