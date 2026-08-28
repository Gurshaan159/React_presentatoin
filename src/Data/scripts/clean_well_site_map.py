"""
clean_well_site_map.py
----------------------
Cleans well_site_map.csv -> cleaned/well_site_map_clean.csv

What it fixes
  * Well IDs appear as 'W0035', 'w0035' and bare integers like '30'  -> canonical 'W00NN'
  * Site codes have mixed case ('s01' vs 'S01')                      -> upper-cased
  * Detects (and refuses) any well mapped to more than one site
  * Reports coverage vs production.csv (wells missing / extra), if that file is present

Output columns: well_id, site_code   (one row per well, sorted)

Pure standard library. Run:  python scripts/clean_well_site_map.py
"""
import csv, os, re, sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(BASE, 'well_site_map.csv')
OUT_DIR = os.path.join(BASE, 'cleaned')
OUT  = os.path.join(OUT_DIR, 'well_site_map_clean.csv')


def canon_well(w):
    """'W0030' / 'w0030' / '30' / ' 30 '  ->  'W0030'.  Unexpected values pass through untouched."""
    if w is None:
        return None
    w = w.strip().upper()
    if re.fullmatch(r'W\d{4}', w):
        return w
    if re.fullmatch(r'\d+', w):
        return 'W%04d' % int(w)
    return w


def load_production_wells():
    """Canonical set of well IDs seen in production.csv, or None if the file isn't there."""
    p = os.path.join(BASE, 'production.csv')
    if not os.path.exists(p):
        return None
    with open(p, encoding='utf-8') as f:
        return {canon_well(r['Well ID']) for r in csv.DictReader(f)}


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    with open(SRC, encoding='utf-8') as f:
        rows = list(csv.DictReader(f))
    print(f'source rows           : {len(rows)}')

    mapping   = {}          # well_id -> site_code
    conflicts = []          # (well_id, existing_site, new_site)
    raw_forms = {'W0000': 0, 'w0000': 0, 'bare-int': 0, 'other': 0}
    site_case_fixed = 0

    for r in rows:
        raw_w = r['Well ID'].strip()
        if   re.fullmatch(r'W\d{4}', raw_w): raw_forms['W0000'] += 1
        elif re.fullmatch(r'w\d{4}', raw_w): raw_forms['w0000'] += 1
        elif re.fullmatch(r'\d+',   raw_w):  raw_forms['bare-int'] += 1
        else:                                raw_forms['other'] += 1

        well = canon_well(raw_w)
        raw_s = r['Site Code'].strip()
        site  = raw_s.upper()
        if site != raw_s:
            site_case_fixed += 1

        if well in mapping and mapping[well] != site:
            conflicts.append((well, mapping[well], site))
        mapping[well] = site

    print(f'well-id raw forms     : {raw_forms}  -> canonical W00NN')
    print(f'site-code case fixes  : {site_case_fixed}  (e.g. s01 -> S01)')
    print(f'distinct wells        : {len(mapping)}')
    print(f'distinct sites        : {sorted(set(mapping.values()))}')

    if conflicts:
        print('\nERROR: wells mapped to multiple sites:')
        for w, a, b in conflicts:
            print(f'  {w}: {a} vs {b}')
        sys.exit(1)
    print('well/site conflicts   : 0')

    prod_wells = load_production_wells()
    if prod_wells is not None:
        missing = sorted(prod_wells - set(mapping))
        extra   = sorted(set(mapping) - prod_wells)
        print(f'coverage vs production: missing {missing or "none"}, extra {extra or "none"}')

    with open(OUT, 'w', newline='', encoding='utf-8') as f:
        wr = csv.writer(f)
        wr.writerow(['well_id', 'site_code'])
        wr.writerows(sorted(mapping.items()))
    print(f'\nwrote {OUT}  ({len(mapping)} rows)')


if __name__ == '__main__':
    main()
