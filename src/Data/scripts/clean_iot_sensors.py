"""
clean_iot_sensors.py
--------------------
Cleans iot_sensors.db (table `sensor_readings`, ~1.4M long-format rows) into:

  cleaned/iot_sensors_clean.csv        one row per well-hour (wide), with spec-band flags
  cleaned/iot_reliability_by_well.csv  per-well IoT production reliability

What it fixes
  * well_id appears as 'W0001', 'w0001' and bare integers like '1'   -> canonical 'W00NN'
    (registered as a SQL function so the pivot uses the identical rule)
  * `company` column is junk: {EE, ESTACADO_ENERGY, 'Estacado Energy', 'Estacado Energy ',
    estacado}  -> never selected; it is not a key
  * timestamps come as '...Z', '...+00:00' and naive  -> all treated UTC, truncated to the hour
  * temperature unit recorded as both 'F' and 'F'  -> irrelevant after pivot (values already F)
  * physically-impossible readings (temp outside -50..600 F, pressure outside 0..20000 psi)
    are KEPT but flagged *_phys_ok = 0; they also fall outside the spec band so they
    correctly count as unreliable time
  * verifies that after canonicalisation there are 0 (well, hour, sensor_type) collisions

IoT production reliability (per the acquisition question)
    reliability = hours with  60 <= T <= 302 F  AND  200 <= P <= 10000 psi
                  ------------------------------------------------------------
                                 total hours in the record  (8760)

Pure standard library. Run:  python scripts/clean_iot_sensors.py
"""
import csv, os, re, sqlite3, statistics, sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB   = os.path.join(BASE, 'iot_sensors.db')
OUT_DIR = os.path.join(BASE, 'cleaned')

# --- spec band (from the analysis question) -------------------------------------
T_MIN, T_MAX = 60, 302          # deg F
P_MIN, P_MAX = 200, 10000       # psi
# --- physical-plausibility band (sensor sanity) --------------------------------
T_PHYS_MIN, T_PHYS_MAX = -50, 600
P_PHYS_MIN, P_PHYS_MAX = 0, 20000


def canon_well(w):
    """'W0001' / 'w0001' / '1' / ' 1 '  ->  'W0001'.  Unexpected values pass through."""
    if w is None:
        return None
    w = w.strip().upper()
    if re.fullmatch(r'W\d{4}', w):
        return w
    if re.fullmatch(r'\d+', w):
        return 'W%04d' % int(w)
    return w


# normalise a timestamp string to an hour key: 'YYYY-MM-DDTHH:00'
HOUR_SQL = "substr(replace(replace(timestamp,'Z',''),'+00:00',''),1,13) || ':00'"


def main():
    if not os.path.exists(DB):
        sys.exit(f'not found: {DB}')
    os.makedirs(OUT_DIR, exist_ok=True)

    con = sqlite3.connect(DB)
    con.create_function('canon', 1, canon_well)
    cur = con.cursor()

    total = cur.execute('SELECT COUNT(*) FROM sensor_readings').fetchone()[0]
    print(f'source rows                     : {total}')
    print('company values (dropped)        :',
          [r[0] for r in cur.execute(
              'SELECT DISTINCT company FROM sensor_readings ORDER BY company')])
    print('sensor_type / unit inventory    :',
          cur.execute('SELECT sensor_type, unit, COUNT(*) '
                      'FROM sensor_readings GROUP BY 1,2 ORDER BY 1,2').fetchall())
    ts_fmt = cur.execute(f"""
        SELECT CASE WHEN timestamp LIKE '%Z' THEN 'Z'
                    WHEN timestamp LIKE '%+00:00' THEN '+00:00'
                    ELSE 'naive' END, COUNT(*)
        FROM sensor_readings GROUP BY 1""").fetchall()
    print(f'timestamp formats               : {ts_fmt}  -> UTC hour')

    # ---- collision check: canon(well_id) + hour + sensor_type must be unique ----
    collisions = cur.execute(f"""
        SELECT COUNT(*) FROM (
            SELECT canon(well_id) w, {HOUR_SQL} h, sensor_type s, COUNT(*) n
            FROM sensor_readings GROUP BY 1,2,3 HAVING n > 1)""").fetchone()[0]
    print(f'(well,hour,sensor) collisions   : {collisions}')
    if collisions:
        sys.exit('ERROR: canonicalisation merges conflicting readings - stop and inspect.')

    # ---- long -> wide, one row per well-hour ----
    cur.executescript(f"""
        DROP TABLE IF EXISTS iot_wide;
        CREATE TEMP TABLE iot_wide AS
        SELECT canon(well_id) AS well_id,
               {HOUR_SQL}     AS hour_utc,
               MAX(CASE WHEN sensor_type='temperature' THEN value END) AS temperature_f,
               MAX(CASE WHEN sensor_type='pressure'    THEN value END) AS pressure_psi,
               MAX(CASE WHEN sensor_type='flow_rate'   THEN value END) AS flow_rate_bbl_hr,
               MAX(CASE WHEN sensor_type='vibration'   THEN value END) AS vibration_mm_s
        FROM sensor_readings
        GROUP BY 1, 2;
    """)
    n_wh   = cur.execute('SELECT COUNT(*) FROM iot_wide').fetchone()[0]
    n_well = cur.execute('SELECT COUNT(DISTINCT well_id) FROM iot_wide').fetchone()[0]
    print(f'wide table                      : {n_wh} well-hours, {n_well} wells')

    t_glitch = cur.execute(
        f'SELECT COUNT(*) FROM iot_wide WHERE temperature_f NOT BETWEEN {T_PHYS_MIN} AND {T_PHYS_MAX}'
    ).fetchone()[0]
    p_glitch = cur.execute(
        f'SELECT COUNT(*) FROM iot_wide WHERE pressure_psi NOT BETWEEN {P_PHYS_MIN} AND {P_PHYS_MAX}'
    ).fetchone()[0]
    print(f'physically-impossible readings  : temp {t_glitch}, pressure {p_glitch} (kept, flagged)')

    # ---- 1) cleaned hourly sensor table ----
    rows = cur.execute(f"""
        SELECT well_id, hour_utc, temperature_f, pressure_psi, flow_rate_bbl_hr, vibration_mm_s,
               CASE WHEN temperature_f BETWEEN {T_MIN} AND {T_MAX} THEN 1 ELSE 0 END AS temp_in_spec,
               CASE WHEN pressure_psi  BETWEEN {P_MIN} AND {P_MAX} THEN 1 ELSE 0 END AS pressure_in_spec,
               CASE WHEN temperature_f BETWEEN {T_MIN} AND {T_MAX}
                     AND pressure_psi  BETWEEN {P_MIN} AND {P_MAX} THEN 1 ELSE 0 END AS both_in_spec,
               CASE WHEN temperature_f BETWEEN {T_PHYS_MIN} AND {T_PHYS_MAX} THEN 1 ELSE 0 END AS temp_phys_ok,
               CASE WHEN pressure_psi  BETWEEN {P_PHYS_MIN} AND {P_PHYS_MAX} THEN 1 ELSE 0 END AS pressure_phys_ok
        FROM iot_wide ORDER BY well_id, hour_utc
    """).fetchall()

    cols = ['well_id', 'hour_utc', 'temperature_f', 'pressure_psi', 'flow_rate_bbl_hr',
            'vibration_mm_s', 'temp_in_spec', 'pressure_in_spec', 'both_in_spec',
            'temp_phys_ok', 'pressure_phys_ok']
    out1 = os.path.join(OUT_DIR, 'iot_sensors_clean.csv')
    with open(out1, 'w', newline='', encoding='utf-8') as f:
        wr = csv.writer(f)
        wr.writerow(cols)
        for r in rows:
            wr.writerow([r[0], r[1]]
                        + [('' if v is None else round(v, 4)) for v in r[2:6]]
                        + list(r[6:]))
    print(f'wrote {out1}  ({len(rows)} rows)')

    # ---- 2) per-well reliability ----
    rel = cur.execute(f"""
        SELECT well_id,
               COUNT(*)                                                              AS hours,
               SUM(CASE WHEN temperature_f IS NOT NULL
                         AND pressure_psi IS NOT NULL THEN 1 ELSE 0 END)              AS hours_with_both,
               SUM(CASE WHEN temperature_f BETWEEN {T_MIN} AND {T_MAX}
                         AND pressure_psi  BETWEEN {P_MIN} AND {P_MAX} THEN 1 ELSE 0 END) AS hours_in_spec,
               SUM(CASE WHEN temperature_f NOT BETWEEN {T_PHYS_MIN} AND {T_PHYS_MAX} THEN 1 ELSE 0 END) AS temp_glitch,
               SUM(CASE WHEN pressure_psi  NOT BETWEEN {P_PHYS_MIN} AND {P_PHYS_MAX} THEN 1 ELSE 0 END) AS pressure_glitch
        FROM iot_wide GROUP BY well_id ORDER BY well_id
    """).fetchall()

    out2 = os.path.join(OUT_DIR, 'iot_reliability_by_well.csv')
    with open(out2, 'w', newline='', encoding='utf-8') as f:
        wr = csv.writer(f)
        wr.writerow(['well_id', 'hours', 'hours_with_both', 'hours_in_spec',
                     'reliability_pct', 'temp_glitch', 'pressure_glitch'])
        for w, h, hb, hs, tg, pg in rel:
            wr.writerow([w, h, hb, hs, round(100.0 * hs / h, 3) if h else '', tg, pg])
    print(f'wrote {out2}  ({len(rel)} wells)')

    pcts = [100.0 * hs / h for _, h, _, hs, _, _ in rel]
    print(f'reliability  mean {statistics.mean(pcts):.2f}%   '
          f'min {min(pcts):.1f}%   max {max(pcts):.1f}%')

    con.close()


if __name__ == '__main__':
    main()
