"""
Run scripts/decommission_screen.sql against the raw HSE export + the well
investment-signals table, print the disposition table, and write
cleaned/decommission_screen.csv.

Stdlib only. Usage:  python scripts/decommission_screen.py

----------------------------------------------------------------------------
WELL DISPOSITION CRITERIA
----------------------------------------------------------------------------
The screen is HSE-led. Economics only routes a well once its HSE record has
already flagged it -- a well is never *rescued* from the list by cash flow.

Step 1 -- severity score (weight of the consequence, not the count)
    Each HSE incident is weighted by how bad the outcome could be:
        Uncontrolled release .......... 10   (loss of well control / H2S to air)
        Serious injury ................  8   (every one in this data = H2S hospitalisation)
        Fire / near miss ..............  5   (compressor / facility fire)
        Hydrocarbon spill ............   4
        Produced water release .......   3
        Permit violation .............   3   (wilful / repeat flare breach)
        Lost-time injury .............   3
        Regulatory citation ..........   2
        Environmental exceedance .....   2   (flare over permit)
        Recordable injury ............   2
        Vehicle incident .............   2
        Minor spill ..................   1
        Slip / trip / fall ...........   1
    Rolled up per well into:
        sev_total  - lifetime weighted burden
        sev_6mo    - same, but only incidents in the 6 months before the
                     2026-08-11 portal export (is the record still being written?)
        n_incidents, plus counts of each catastrophic event type.

Step 2 -- classify (CASE order matters; first match wins)

    A) DECOMMISSION / PLUG -- chronic record AND an unresolved catastrophic hazard
         (sev_total >= 34  OR  n_incidents >= 9)
         AND (>=1 uncontrolled release or H2S hospitalisation in 2026
              OR  >=2 fires
              OR  >=3 produced-water releases)
       Rationale: the liability is intrinsic to the well and travels with it to
       any buyer -- retire it. Catches W0037, W0010, W0017, W0019 (and W0001).

    B) DECOMMISSION / PLUG -- high HSE burden on a well that already loses money
         sev_total >= 34  AND  year_profit <= 0
       Rationale: no buyer, no upside, active downside. Catches W0001
       (-$1.5M/yr at 97% water cut).

    C) SELL / DIVEST -- real, repeated ENVIRONMENTAL record but contained,
       no major safety event, and the barrel still has value
         sev_total >= 15
         AND >=3 distinct environmental events (spills / releases / exceedances)
         AND no H2S hospitalisation
         AND year_profit > -$1M
       Rationale: the record is disclosable and the obligation is transferable
       at a price. Catches W0020, W0015, W0033, W0027.

    D) KEEP -- everything else.

What the score deliberately does NOT do on its own:
  * Composition over magnitude -- W0020 (score 35) is SOLD while W0019
    (score 34) is PLUGGED, because W0019's score contains an uncontrolled H2S
    release and W0020's is vehicle incidents + flare paperwork + bunded spills.
  * Recency -- W0025 has an uncontrolled release AND an H2S hospitalisation
    (same events as the plug wells) but both were in Jan 2026 with nothing
    since, and only 6 incidents total -> stays KEEP. Watch, don't divest.
  * Economics as a tiebreaker only -- decides PLUG vs SELL after a flag,
    never removes a flag.

Known caveat: the 4 S05 plug wells produce ~$78M/yr combined and the S05 H2S
cluster has a mechanical signature (hot / high-pressure / high-vibration IoT).
Confirm the hazard is not workover-fixable before plugging. No AFE / plugging
-cost / salvage data here, so PLUG-vs-SELL on the margin (W0015) needs costing.
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
OUT = ROOT / "cleaned" / "decommission_screen.csv"


def canon(well_id: str) -> str:
    """W0030 / w0030 / '30' -> 'W0030'."""
    digits = str(well_id).lower().replace("w", "").lstrip("0") or "0"
    return f"W{int(digits):04d}"


def iso_date(raw) -> str:
    """Epoch-ms int, 'YYYY-MM-DD', or ISO timestamp -> 'YYYY-MM-DD'."""
    if isinstance(raw, (int, float)):
        return datetime.datetime.fromtimestamp(raw / 1000, datetime.UTC).date().isoformat()
    return str(raw)[:10]


def main() -> None:
    db = sqlite3.connect(":memory:")
    db.row_factory = sqlite3.Row

    # --- load hse_incidents.json -------------------------------------------
    db.execute(
        "CREATE TABLE hse_incidents ("
        "well_id TEXT, occurred_on TEXT, category TEXT, title TEXT,"
        "description TEXT, business_unit TEXT)"
    )
    incidents = json.loads(HSE.read_text())["incidents"]
    db.executemany(
        "INSERT INTO hse_incidents VALUES (?,?,?,?,?,?)",
        [
            (
                canon(x["wellId"]),
                iso_date(x["occurredOn"]),
                x.get("category"),
                x.get("incidentTitle"),
                x.get("incidentDescription"),
                x.get("businessUnit"),
            )
            for x in incidents
        ],
    )

    # --- load cleaned/well_investment_signals.csv -------------------------
    with SIGNALS.open(newline="") as fh:
        rows = list(csv.DictReader(fh))
    cols = rows[0].keys()
    db.execute(
        "CREATE TABLE well_signals (" + ",".join(f'"{c}"' for c in cols) + ")"
    )
    num = {
        "year_profit", "margin_pct", "cost_per_boe", "wc_recent", "decl_ann",
        "boe_recent", "boe_first", "chg_pct", "wc_first", "uptime",
    }

    def cast(col, val):
        if col in num:
            return float(val) if val not in ("", None) else None
        return val

    db.executemany(
        "INSERT INTO well_signals VALUES (" + ",".join("?" * len(cols)) + ")",
        [tuple(cast(c, r[c]) for c in cols) for r in rows],
    )

    # --- run the screen --------------------------------------------------
    result = db.execute(SQL.read_text()).fetchall()
    headers = result[0].keys()

    widths = {h: max(len(h), *(len(str(r[h])) for r in result)) for h in headers}
    line = "  ".join(h.ljust(widths[h]) for h in headers)
    print(line)
    print("-" * len(line))
    current = None
    for r in result:
        if r["recommendation"] != current:
            current = r["recommendation"]
            if r is not result[0]:
                print()
        print("  ".join(str(r[h]).ljust(widths[h]) for h in headers))

    with OUT.open("w", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(headers)
        writer.writerows(tuple(r) for r in result)
    print(f"\nwrote {OUT.relative_to(ROOT)}  ({len(result)} wells flagged)")


if __name__ == "__main__":
    main()
