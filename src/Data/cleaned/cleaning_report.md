# Estacado Acquisition - cleaning report

_generated 2026-08-27 10:00_

## production.csv
- source rows: 14819
- well-id forms: {'W0000-upper': 14082, 'w0000-lower': 287, 'bare-int': 450, 'other': 0}  -> canonicalised to W00NN
- date formats:  {'YYYY-MM-DD': 11337, 'DD-MM-YYYY': 1480, 'MM/DD/YYYY': 2002, 'unparseable': 0}  -> ISO YYYY-MM-DD
- status raw values collapsed via {'ACTIVE': 'ACTIVE', 'PRODUCING': 'ACTIVE', 'SHUT_IN': 'SHUT_IN', 'SHUTIN': 'SHUT_IN'}
- unit fixes: 1846 oil rows M3->bbl (x6.28981), 1851 gas rows MMBtu->Mcf (/1.037)
- duplicate (well,date) groups: 218  (218 fully identical, 0 differ only in trailing-digit rate noise; allocation volumes agree within each group)
- OUTPUT production_clean.csv : 14600 rows, 40 wells, 2025-08-27 .. 2026-08-26

## well_site_map.csv
- source rows: 40  -> 40 wells, sites ['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08']
- site-code case fixed (s01->S01 etc); well/site conflicts: 0
- coverage vs production: missing [], extra []

## sites_estacado.csv
- decoded as utf-16; source rows 9
- duplicate site rows dropped: 1; trimmed names, title-cased business unit, fixed s07@@ email, normalised phones
- OUTPUT sites_clean.csv : 8 sites

## iot_sensors.db  (sensor_readings)
- source rows: 1401600
- company values {EE, ESTACADO_ENERGY, "Estacado Energy", "Estacado Energy ", estacado} -> dropped (not a key)
- well_id canonicalised (W0001/w0001/1 -> W0001); after canon: 0 (well,hour,sensor) collisions -> spellings partition cleanly
- timestamp: '...Z' / '...+00:00' / naive  -> all treated UTC, truncated to the hour
- temperature unit 'F' and '°F' -> unified to F
- physically-impossible readings: temperature 673, pressure 1090 (kept, flagged *_phys_ok=0; they fall outside the spec band so they count as unreliable time)
- pivoted to hourly wide table: 350400 well-hours, 40 wells
- OUTPUT iot_sensors_clean.csv : 350400 rows
- OUTPUT iot_reliability_by_well.csv : 40 wells   (reliability = hours_in_spec / total hours)
- mean well reliability: 65.77%   range 0.6% .. 91.4%
