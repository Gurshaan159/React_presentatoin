"""
rank_site_efficiency.py
-----------------------
Ranks the 8 sites by production efficiency for the acquisition question:

    "Which sites have the highest production efficiency, defined as
     1000 BOE per active well, weighted by IoT production reliability?"

Locked parameters (decided during analysis):
  1. active well        : had >= 1 ACTIVE day in the window AND total BOE > 0   (definition A)
  2. BOE numerator      : ALL wells mapped to the site (not just active ones)
  3. site reliability   : BOE-weighted mean of each well's in-spec fraction
  4. reliability denom. : total hours in the record (8760)

Metric:
    r_w   = hours_in_spec_w / hours_w                         (per-well IoT reliability)
    E_s   = ( sum_w BOE_w ) / ( 1000 * n_active_s )           (kBOE per active well)
    R_s   = sum_w (BOE_w * r_w) / sum_w BOE_w                 (BOE-weighted, all wells)
    PE_s  = E_s * R_s                                         <-- ranking key

Inputs  (cleaned tables, produced by the clean_*.py scripts):
    cleaned/production_clean.csv         well_id, date, status, oil_bbl, gas_mcf, water_bbl, boe, uptime_pct
    cleaned/well_site_map_clean.csv      well_id, site_code
    cleaned/iot_reliability_by_well.csv  well_id, hours, hours_in_spec
    cleaned/sites_clean.csv              site_code, location_name, business_unit

Output:
    cleaned/site_efficiency.csv   + a ranked table printed to stdout

Pure standard library.  Run:  python scripts/rank_site_efficiency.py
"""
import csv, os, sys
from collections import defaultdict

BASE    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLEAN   = os.path.join(BASE, 'cleaned')
OUT     = os.path.join(CLEAN, 'site_efficiency.csv')

# analysis window (inclusive). None = use everything present.
WINDOW_START = '2025-08-27'
WINDOW_END   = '2026-08-26'


def read_csv(name):
    path = os.path.join(CLEAN, name)
    if not os.path.exists(path):
        sys.exit(f'missing input: {path}  (run the clean_*.py scripts first)')
    with open(path, encoding='utf-8') as f:
        return list(csv.DictReader(f))


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return 0.0


def main():
    prod   = read_csv('production_clean.csv')
    wsmap  = read_csv('well_site_map_clean.csv')
    relraw = read_csv('iot_reliability_by_well.csv')
    sites  = read_csv('sites_clean.csv')

    site_of   = {r['well_id']: r['site_code'] for r in wsmap}
    site_name = {r['site_code']: r.get('location_name', r['site_code']) for r in sites}
    site_bu   = {r['site_code']: r.get('business_unit', '') for r in sites}

    # ---- 1. per-well roll-up over the window ----
    boe_w   = defaultdict(float)   # total BOE
    oil_w   = defaultdict(float)   # oil bbl  (oil-equivalent = itself)
    gasb_w  = defaultdict(float)   # gas BOE  (= gas_mcf / 6)
    wat_w   = defaultdict(float)   # water bbl
    active_day  = defaultdict(bool)
    prod_days   = defaultdict(int)     # days with BOE > 0
    uptime_sum  = defaultdict(float)   # sum of uptime_pct over active-status rows
    uptime_n    = defaultdict(int)
    for r in prod:
        d = r['date']
        if WINDOW_START and d < WINDOW_START:  continue
        if WINDOW_END   and d > WINDOW_END:    continue
        w = r['well_id']
        b = num(r['boe'])
        boe_w[w]  += b
        oil_w[w]  += num(r.get('oil_bbl'))
        gasb_w[w] += num(r.get('gas_mcf')) / 6.0
        wat_w[w]  += num(r.get('water_bbl'))
        if b > 0:
            prod_days[w] += 1
        if r['status'].strip().upper() == 'ACTIVE':
            active_day[w] = True
            if r.get('uptime_pct') not in (None, ''):
                uptime_sum[w] += num(r['uptime_pct'])
                uptime_n[w]   += 1

    # ---- 2. per-well IoT reliability  r_w = hours_in_spec / hours ----
    r_w = {}
    for r in relraw:
        h = num(r['hours'])
        r_w[r['well_id']] = (num(r['hours_in_spec']) / h) if h else 0.0

    # ---- 3. well level ----
    wells = sorted(set(boe_w) | set(site_of))
    well_rows = []
    for w in wells:
        s = site_of.get(w)
        if s is None:
            print(f'  warn: well {w} produces but is not in well_site_map — skipped')
            continue
        b = boe_w.get(w, 0.0)
        well_rows.append(dict(
            well_id=w, site_code=s,
            boe_w=b, oil_w=oil_w.get(w, 0.0), gasb_w=gasb_w.get(w, 0.0), wat_w=wat_w.get(w, 0.0),
            r_w=r_w.get(w, 0.0),
            is_active=(b > 0.0) and active_day.get(w, False),
            prod_days=prod_days.get(w, 0),
            uptime=(uptime_sum[w] / uptime_n[w]) if uptime_n.get(w) else None,
        ))

    # ---- 4. site level ----
    by_site = defaultdict(list)
    for wr in well_rows:
        by_site[wr['site_code']].append(wr)

    out = []
    for s, rows in by_site.items():
        wells_total = len(rows)
        active      = [w for w in rows if w['is_active']]
        n_active    = len(active)
        boe_site    = sum(w['boe_w'] for w in rows)
        oil_site    = sum(w['oil_w'] for w in rows)
        gasb_site   = sum(w['gasb_w'] for w in rows)
        wat_site    = sum(w['wat_w'] for w in rows)
        boe_x_r     = sum(w['boe_w'] * w['r_w'] for w in rows)
        top_boe     = max((w['boe_w'] for w in rows), default=0.0)
        uptimes     = [w['uptime'] for w in active if w['uptime'] is not None]

        reliability_bw = boe_x_r / boe_site if boe_site else 0.0
        reliability_uw = (sum(w['r_w'] for w in active) / n_active) if n_active else 0.0
        efficiency     = boe_site / (1000.0 * n_active) if n_active else None    # kBOE per active well  (E_s)
        pe             = efficiency * reliability_bw if efficiency is not None else None

        out.append(dict(
            site_code=s,
            location_name=site_name.get(s, s),
            business_unit=site_bu.get(s, ''),
            wells_total=wells_total,
            n_active=n_active,
            shut_in_wells=wells_total - n_active,
            pct_active=100.0 * n_active / wells_total if wells_total else 0.0,
            total_boe=boe_site,
            avg_boe_per_well=boe_site / wells_total if wells_total else 0.0,          # <-- total BOE / #wells
            boe_per_active_well=boe_site / n_active if n_active else None,            # raw, un-scaled
            oil_share_pct=100.0 * oil_site / boe_site if boe_site else 0.0,
            gas_share_pct=100.0 * gasb_site / boe_site if boe_site else 0.0,
            water_cut_pct=100.0 * wat_site / (wat_site + oil_site) if (wat_site + oil_site) else 0.0,
            top_well_boe_share_pct=100.0 * top_boe / boe_site if boe_site else 0.0,
            avg_uptime_pct=sum(uptimes) / len(uptimes) if uptimes else None,
            efficiency_kboe_per_active_well=efficiency,                              # E_s
            iot_reliability=reliability_bw,                                          # R_s (BOE-weighted)
            iot_reliability_unweighted=reliability_uw,                               # simple mean, for contrast
            pe_s=pe,
        ))

    # rank by the metric
    out.sort(key=lambda r: (r['pe_s'] is not None, r['pe_s']), reverse=True)
    for i, r in enumerate(out, 1):
        r['rank'] = i

    # ---- write full detail to CSV ----
    cols = ['rank', 'site_code', 'location_name', 'business_unit',
            'wells_total', 'n_active', 'shut_in_wells', 'pct_active',
            'total_boe', 'avg_boe_per_well', 'boe_per_active_well',
            'efficiency_kboe_per_active_well', 'iot_reliability', 'iot_reliability_unweighted', 'pe_s',
            'oil_share_pct', 'gas_share_pct', 'water_cut_pct', 'top_well_boe_share_pct', 'avg_uptime_pct']

    def fmt(v, nd):
        return '' if v is None else round(v, nd)

    with open(OUT, 'w', newline='', encoding='utf-8') as f:
        wr = csv.DictWriter(f, fieldnames=cols)
        wr.writeheader()
        for r in out:
            wr.writerow({
                'rank': r['rank'],
                'site_code': r['site_code'], 'location_name': r['location_name'],
                'business_unit': r['business_unit'],
                'wells_total': r['wells_total'], 'n_active': r['n_active'],
                'shut_in_wells': r['shut_in_wells'], 'pct_active': fmt(r['pct_active'], 1),
                'total_boe': fmt(r['total_boe'], 1),
                'avg_boe_per_well': fmt(r['avg_boe_per_well'], 1),
                'boe_per_active_well': fmt(r['boe_per_active_well'], 1),
                'efficiency_kboe_per_active_well': fmt(r['efficiency_kboe_per_active_well'], 3),
                'iot_reliability': fmt(r['iot_reliability'], 4),
                'iot_reliability_unweighted': fmt(r['iot_reliability_unweighted'], 4),
                'pe_s': fmt(r['pe_s'], 3),
                'oil_share_pct': fmt(r['oil_share_pct'], 1),
                'gas_share_pct': fmt(r['gas_share_pct'], 1),
                'water_cut_pct': fmt(r['water_cut_pct'], 1),
                'top_well_boe_share_pct': fmt(r['top_well_boe_share_pct'], 1),
                'avg_uptime_pct': fmt(r['avg_uptime_pct'], 2),
            })

    # ---- print a readable ranked table ----
    print(f'\nAnalysis window: {WINDOW_START} .. {WINDOW_END}\n')
    hdr = (f'{"#":>2}  {"Site":<5} {"Name":<19} '
           f'{"Total BOE":>13} {"Avg BOE / well":>14} '
           f'{"Efficiency E_s":>15} {"IoT reliab. R_s":>16} {"Score PE_s":>11}')
    print(hdr)
    print('-' * len(hdr))
    for r in out:
        es = f'{r["efficiency_kboe_per_active_well"]:.1f}' if r['efficiency_kboe_per_active_well'] is not None else '-'
        pe = f'{r["pe_s"]:.2f}' if r['pe_s'] is not None else '-'
        print(f'{r["rank"]:>2}  {r["site_code"]:<5} {r["location_name"][:19]:<19} '
              f'{r["total_boe"]:>13,.0f} {r["avg_boe_per_well"]:>14,.0f} '
              f'{es:>15} {r["iot_reliability"]:>16.3f} {pe:>11}')
    print()
    print('  Efficiency E_s    total site BOE / 1000 / active-well count')
    print('                    = thousands of BOE per active well ("1000 BOE per active well")')
    print('  IoT reliab. R_s   BOE-weighted share of the year the site\'s wells ran inside spec:')
    print('                    60-302 F  AND  200-10,000 psi   (0 = never, 1 = always)')
    print('  Score PE_s        E_s x R_s   <-- sites are ranked by this')
    print(f'\n  full detail ({len(cols)} columns) -> {OUT}')


if __name__ == '__main__':
    main()
