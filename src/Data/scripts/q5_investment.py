"""
Build src/Data/q5_investment.json for <Q5InvestmentTable />.

Joins three already-committed screen outputs (stdlib only, no args):
  cleaned/investment_screen.csv        -- tier + intervention leg per well
                                          (produced by investment_screen.py)
  cleaned/decommission_screen.csv      -- SELL / PLUG disposition flag
  cleaned/well_investment_signals.csv  -- year_profit in real USD

Usage:  python scripts/q5_investment.py
"""

import csv
import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1]          # .../src/Data
CLEANED = DATA_DIR / 'cleaned'
OUT_PATH = DATA_DIR / 'q5_investment.json'

SITE_NAMES = {
    'S01': 'Estacado Ridge',
    'S02': 'Big Spring Complex',
    'S03': 'Midland Central',
    'S04': 'Odessa Yard',
    'S05': 'Wolfcamp North',
    'S06': 'Delaware Flats',
    'S07': 'Andrews Legacy',
    'S08': 'Alamo Sunset',
}

# tier -> the group the chart colours by
TIER_GROUP = {
    1: 'fund-on-economics',
    2: 'compliance-capex',
    3: 'compliance-capex',
    4: 'blocked-by-hse',
}
TIER_LABEL = {
    1: 'Invest now — production ROI',
    2: 'Invest + HSE plan',
    3: 'Marginal / compliance-only',
    4: 'Blocked by HSE (plug-vs-fix first)',
}


def read_csv(path):
    with open(path, newline='') as fh:
        return list(csv.DictReader(fh))


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


# --- disposition flag per well -------------------------------------------------
disposition = {}
for row in read_csv(CLEANED / 'decommission_screen.csv'):
    disposition[row['well_id']] = row['recommendation'].strip()

# --- real annual profit per well --------------------------------------------
profit = {}
for row in read_csv(CLEANED / 'well_investment_signals.csv'):
    profit[row['well']] = num(row.get('year_profit'))

# --- investment screen (the wells with an intervention leg) -----------------
wells = []
for row in read_csv(CLEANED / 'investment_screen.csv'):
    well = row['well']
    tier = int(row['tier'].split('-')[0].strip())
    site = row['site']
    wells.append({
        'well': well,
        'site': site,
        'siteName': SITE_NAMES.get(site, site),
        'tier': tier,
        'tierLabel': TIER_LABEL[tier],
        'group': TIER_GROUP[tier],
        'intervention': row['intervention'].strip(),
        'rateBoePerDay': num(row['boe_d']),
        'declinePctYr': num(row['decl_pct_yr']),
        'waterCutPct': num(row['wc_pct']),
        'iotInspecPct': num(row['iot_inspec_pct']),
        'marginPct': num(row['margin_pct']),
        'costPerBoe': num(row['cost_per_boe']),
        'yearProfitUsd': profit.get(well),
        'nIncidents': int(num(row['n_incidents']) or 0),
        'sevTotal': int(num(row['sev_total']) or 0),
        'nFlareBreach': int(num(row['n_flare_breach']) or 0),
        'nPwRelease': int(num(row['n_pw_release']) or 0),
        'nHcSpill': int(num(row['n_hc_spill']) or 0),
        'disposition': disposition.get(well),  # 'SELL / DIVEST' | 'DECOMMISSION / PLUG' | None
    })

wells.sort(key=lambda w: (w['tier'], -(w['rateBoePerDay'] or 0)))

payload = {
    'generatedBy': 'scripts/q5_investment.py',
    'method': (
        'investment_screen.csv (production-led screen, HSE used as veto + second '
        'leg) joined to the SELL/PLUG disposition flag and to real annual profit. '
        'Chart: x = cost of supply $/BOE, y = current rate BOE/d, bubble = annual '
        'profit, colour = tier group, ring = also on the disposition (sell/plug) list.'
    ),
    'wells': wells,
}
OUT_PATH.write_text(json.dumps(payload, indent=2))
print(f'Wrote {OUT_PATH}  ({len(wells)} wells)')
for w in wells:
    tag = f"  [{w['disposition']}]" if w['disposition'] else ''
    print(f"  T{w['tier']} {w['well']} {w['site']:>3}  {w['rateBoePerDay']:>6.0f} BOE/d  "
          f"${w['costPerBoe']:>5.1f}/BOE  ${(w['yearProfitUsd'] or 0) / 1e6:>6.1f}M/yr{tag}")
