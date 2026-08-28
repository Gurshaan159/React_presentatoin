import { useId, useState } from 'react';
import rawCsv from '../../Data/cleaned/site_efficiency.csv?raw';
import styles from './Q2EfficiencyChart.module.css';

/**
 * Section 02 visual — reliability-adjusted production efficiency by site.
 *
 * Data is read at build time from src/Data/cleaned/site_efficiency.csv (produced
 * by scripts/rank_site_efficiency.py in the acquisition dataset). Nothing is
 * hardcoded here; regenerate that CSV and the chart follows.
 *
 * Metric (from the script):
 *   E_s  = total site BOE / (1000 * active wells)     — kBOE per active well
 *   R_s  = BOE-weighted mean of per-well IoT in-spec fraction
 *   PE_s = E_s * R_s                                   — the ranking key
 *
 * Encoding: one measure on one axis. Bar length = PE_s (adjusted). A tick marks
 * the raw E_s at the same scale, so the gap between bar-end and tick is the
 * reliability haircut.
 */
function Q2EfficiencyChart() {
  const titleId = useId();
  const [hovered, setHovered] = useState(null);

  return (
    <div className={styles.chart} role="group" aria-labelledby={titleId}>
      <p id={titleId} className={styles.title}>
        Reliability-adjusted production efficiency by site
        <span className={styles.unit}>thousand BOE per active well</span>
      </p>

      <div className={styles.legend} aria-hidden="true">
        <span className={styles.legendItem}>
          <span className={styles.swatchBar} /> Reliability-adjusted&nbsp;(PE)
        </span>
        <span className={styles.legendItem}>
          <span className={styles.swatchTick} /> Raw efficiency&nbsp;(E)
        </span>
      </div>

      <div className={styles.plot}>
        <div className={styles.gridArea} aria-hidden="true">
          {TICKS.map((t) => (
            <span
              key={t}
              className={styles.gridLine}
              style={{ left: `${(t / AXIS_MAX) * 100}%` }}
            />
          ))}
        </div>

        {SITES.map((s, i) => {
          const on = hovered === s.site;
          const flipUp = i >= SITES.length - 2;
          return (
            <div
              key={s.site}
              className={`${styles.row} ${on ? styles.rowOn : ''}`}
              tabIndex={0}
              onMouseEnter={() => setHovered(s.site)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(s.site)}
              onBlur={() => setHovered(null)}
              aria-label={
                `${s.name}: adjusted efficiency ${round(s.pe)}, raw efficiency ${round(s.eRaw)}, ` +
                `sensor reliability ${percent(s.reliability)}, ${s.active} of ${s.wellsTotal} wells active`
              }
            >
              <div className={styles.label}>
                <span className={styles.site}>{s.name}</span>
                <span className={styles.sub}>
                  {s.active}/{s.wellsTotal} active
                </span>
              </div>

              <div className={styles.track}>
                <div className={styles.bar} style={{ width: `${(s.pe / AXIS_MAX) * 100}%` }} />
                <div className={styles.tick} style={{ left: `${(s.eRaw / AXIS_MAX) * 100}%` }} />
              </div>

              <div className={styles.value}>
                <span className={styles.valuePe}>{round(s.pe)}</span>
                <span className={styles.valueRaw}>
                  raw {round(s.eRaw)} · R {percent(s.reliability)}
                </span>
              </div>

              {on ? (
                <div
                  className={`${styles.tip} ${flipUp ? styles.tipUp : ''}`}
                  role="status"
                >
                  <strong>
                    {s.name} · {s.unit}
                  </strong>
                  <span>Adjusted efficiency (PE): {round(s.pe)}</span>
                  <span>Raw efficiency (E): {round(s.eRaw)}</span>
                  <span>Sensor reliability (R): {percent(s.reliability)}</span>
                  <span>
                    Active wells: {s.active} of {s.wellsTotal}
                  </span>
                  <span>Total production: {millions(s.totalBoe)} BOE</span>
                </div>
              ) : null}
            </div>
          );
        })}

        <div className={styles.axis} aria-hidden="true">
          {TICKS.map((t, i) => (
            <span
              key={t}
              className={styles.axisTick}
              style={{
                left: `${(t / AXIS_MAX) * 100}%`,
                transform:
                  i === 0
                    ? 'translateX(0)'
                    : i === TICKS.length - 1
                      ? 'translateX(-100%)'
                      : 'translateX(-50%)',
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <details className={styles.tableWrap}>
        <summary>Show data table</summary>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Site</th>
                <th scope="col">Business unit</th>
                <th scope="col">Active / total</th>
                <th scope="col">Raw E</th>
                <th scope="col">Reliability R</th>
                <th scope="col">Adjusted PE</th>
              </tr>
            </thead>
            <tbody>
              {SITES.map((s) => (
                <tr key={s.site}>
                  <th scope="row">{s.name}</th>
                  <td>{s.unit}</td>
                  <td>
                    {s.active} / {s.wellsTotal}
                  </td>
                  <td>{s.eRaw.toFixed(1)}</td>
                  <td>{percent(s.reliability)}</td>
                  <td>{s.pe.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

/* ---------- data ---------- */

function parseSites(text) {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const cols = header.split(',');
  return lines
    .filter(Boolean)
    .map((line) => {
      const cells = line.split(',');
      const get = (name) => cells[cols.indexOf(name)];
      return {
        site: get('site_code'),
        name: get('location_name'),
        unit: get('business_unit'),
        wellsTotal: Number(get('wells_total')),
        active: Number(get('n_active')),
        totalBoe: Number(get('total_boe')),
        eRaw: Number(get('efficiency_kboe_per_active_well')),
        reliability: Number(get('iot_reliability')),
        pe: Number(get('pe_s')),
      };
    })
    .sort((a, b) => b.pe - a.pe);
}

const SITES = parseSites(rawCsv);
const AXIS_MAX = 400;
const TICKS = [0, 100, 200, 300, 400];

const round = (n) => Math.round(n).toLocaleString('en-US');
const percent = (n) => `${Math.round(n * 100)}%`;
const millions = (n) => `${(n / 1e6).toFixed(2)}M`;

export default Q2EfficiencyChart;
