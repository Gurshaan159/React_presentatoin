import { useId, useRef, useState } from 'react';
import data from '../../Data/q1_decline_forecast.json';
import styles from './Q1DeclineChart.module.css';

/**
 * Section 01 visual — historical rate and five-year decline forecast for the
 * five top-producing wells.
 *
 * Data is generated at build time by scripts/analyze.py from the raw
 * production.csv + well_site_map.csv (not the cleaned/ copies): top 5 wells by
 * trailing-6-month BOE, hyperbolic Arps fit from each well's smoothed peak,
 * 61-month forecast. Nothing is hardcoded here — re-run analyze.py and the
 * chart follows.
 *
 * Encoding: one axis (BOE/day vs. time). Solid line = recorded monthly rate,
 * dashed line = the fitted Arps curve. Colour = site, so the four Wolfcamp
 * North wells read as one cohort and the lone Midland Central well stands out.
 */
const WELLS = [...data.wells].sort((a, b) => last(b.forecast) - last(a.forecast));

const EPOCH_Y = 2025;
const EPOCH_M = 8; // months are counted from 2025-08
const MONTH_MAX = maxMonth();
const RATE_MAX = 1250;
const RATE_TICKS = [0, 250, 500, 750, 1000, 1250];
const RECORDED_THROUGH = maxHistoryMonth();

// viewBox geometry
const VB = { w: 760, h: 400 };
const M = { top: 16, right: 96, bottom: 36, left: 46 };
const PLOT = {
  x0: M.left,
  x1: VB.w - M.right,
  y0: M.top,
  y1: VB.h - M.bottom,
};

const xScale = (month) =>
  PLOT.x0 + (month / MONTH_MAX) * (PLOT.x1 - PLOT.x0);
const yScale = (rate) =>
  PLOT.y1 - (Math.min(rate, RATE_MAX) / RATE_MAX) * (PLOT.y1 - PLOT.y0);

function Q1DeclineChart() {
  const titleId = useId();
  const plotRef = useRef(null);
  const [cursor, setCursor] = useState(null); // { month }

  const yearTicks = buildYearTicks();

  const handleMove = (event) => {
    const rect = plotRef.current?.getBoundingClientRect();
    if (!rect) return;
    const frac = (event.clientX - rect.left) / rect.width;
    const px = PLOT.x0 + frac * (PLOT.x1 - PLOT.x0);
    const month = clamp(Math.round(((px - PLOT.x0) / (PLOT.x1 - PLOT.x0)) * MONTH_MAX), 0, MONTH_MAX);
    setCursor({ month });
  };

  const readout = cursor
    ? WELLS.map((w) => ({ well: w, rate: rateAt(w, cursor.month) })).filter((r) => r.rate != null)
    : null;

  return (
    <div className={styles.chart} role="group" aria-labelledby={titleId}>
      <p id={titleId} className={styles.title}>
        Top five wells — recorded rate and five-year decline forecast
        <span className={styles.unit}>BOE per day</span>
      </p>

      <div className={styles.legend} aria-hidden="true">
        <span className={styles.legendItem}>
          <span className={styles.swatch} style={{ background: 'var(--est-viz-keep)' }} />
          Wolfcamp North (S05)
        </span>
        <span className={styles.legendItem}>
          <span className={styles.swatch} style={{ background: 'var(--est-viz-series-2)' }} />
          Midland Central (S03)
        </span>
        <span className={styles.legendItem}>
          <span className={styles.lineSolid} /> recorded
        </span>
        <span className={styles.legendItem}>
          <span className={styles.lineDashed} /> Arps forecast
        </span>
      </div>

      <div className={styles.plotWrap}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${VB.w} ${VB.h}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={
            `Line chart of daily BOE for wells ${WELLS.map((w) => w.wellId).join(', ')}, ` +
            `each declining from roughly 1,050–1,200 BOE per day in 2025 to 570–740 by 2030.`
          }
        >
          {/* y grid + labels */}
          {RATE_TICKS.map((t) => (
            <g key={t}>
              <line
                className={styles.grid}
                x1={PLOT.x0}
                x2={PLOT.x1}
                y1={yScale(t)}
                y2={yScale(t)}
              />
              <text className={styles.axisText} x={PLOT.x0 - 8} y={yScale(t)} dy="0.32em" textAnchor="end">
                {t.toLocaleString('en-US')}
              </text>
            </g>
          ))}

          {/* x year ticks */}
          {yearTicks.map((yt) => (
            <text
              key={yt.month}
              className={styles.axisText}
              x={xScale(yt.month)}
              y={PLOT.y1 + 20}
              textAnchor="middle"
            >
              {yt.label}
            </text>
          ))}

          {/* recorded / forecast divider */}
          <line
            className={styles.divider}
            x1={xScale(RECORDED_THROUGH)}
            x2={xScale(RECORDED_THROUGH)}
            y1={PLOT.y0}
            y2={PLOT.y1}
          />
          <text
            className={styles.dividerLabel}
            x={xScale(RECORDED_THROUGH) + 5}
            y={PLOT.y0 + 10}
          >
            forecast →
          </text>

          {/* baseline */}
          <line className={styles.baseline} x1={PLOT.x0} x2={PLOT.x1} y1={PLOT.y1} y2={PLOT.y1} />

          {/* series */}
          {WELLS.map((w) => {
            const color = siteColor(w.site);
            return (
              <g key={w.wellId}>
                <path
                  className={styles.forecastLine}
                  d={linePath(w.forecast.map((p) => ({ month: monthOf(p.date), rate: p.rate })))}
                  stroke={color}
                />
                <path
                  className={styles.historyLine}
                  d={linePath(w.history.map((p) => ({ month: monthOf(p.date), rate: p.rate })))}
                  stroke={color}
                />
              </g>
            );
          })}

          {/* crosshair */}
          {cursor ? (
            <g>
              <line
                className={styles.crosshair}
                x1={xScale(cursor.month)}
                x2={xScale(cursor.month)}
                y1={PLOT.y0}
                y2={PLOT.y1}
              />
              {readout.map((r) => (
                <circle
                  key={r.well.wellId}
                  cx={xScale(cursor.month)}
                  cy={yScale(r.rate)}
                  r={3.5}
                  fill={siteColor(r.well.site)}
                  stroke="var(--est-white)"
                  strokeWidth={1.5}
                />
              ))}
            </g>
          ) : null}

          {/* end labels */}
          {dodge(
            WELLS.map((w) => ({
              id: w.wellId,
              site: w.site,
              y: yScale(last(w.forecast)),
            })),
          ).map((lbl) => (
            <text
              key={lbl.id}
              className={styles.endLabel}
              x={PLOT.x1 + 6}
              y={lbl.y}
              dy="0.32em"
              fill={siteColor(lbl.site)}
            >
              {lbl.id}
            </text>
          ))}

          {/* hover surface */}
          <rect
            ref={plotRef}
            className={styles.hoverSurface}
            x={PLOT.x0}
            y={PLOT.y0}
            width={PLOT.x1 - PLOT.x0}
            height={PLOT.y1 - PLOT.y0}
            onPointerMove={handleMove}
            onPointerLeave={() => setCursor(null)}
          />
        </svg>

        {cursor && readout?.length ? (
          <div
            className={styles.tip}
            style={{ left: `${(xScale(cursor.month) / VB.w) * 100}%` }}
            role="status"
          >
            <strong>{monthLabel(cursor.month)}</strong>
            {[...readout]
              .sort((a, b) => b.rate - a.rate)
              .map((r) => (
                <span key={r.well.wellId}>
                  <span
                    className={styles.tipDot}
                    style={{ background: siteColor(r.well.site) }}
                  />
                  {r.well.wellId}
                  <b>{Math.round(r.rate).toLocaleString('en-US')}</b>
                </span>
              ))}
          </div>
        ) : null}
      </div>

      <details className={styles.tableWrap}>
        <summary>Show data table</summary>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Well</th>
                <th scope="col">Site</th>
                <th scope="col">Current BOE/d</th>
                <th scope="col">In 5 years</th>
                <th scope="col">1st-yr decline</th>
                <th scope="col">5-yr cumulative BOE</th>
              </tr>
            </thead>
            <tbody>
              {WELLS.map((w) => (
                <tr key={w.wellId}>
                  <th scope="row">{w.wellId}</th>
                  <td>{w.site ?? '—'}</td>
                  <td>{Math.round(w.currentRateBoePerDay).toLocaleString('en-US')}</td>
                  <td>{Math.round(w.rateIn5yrBoePerDay).toLocaleString('en-US')}</td>
                  <td>{w.firstYearEffectiveDeclinePct}%</td>
                  <td>{Math.round(w.forecast5yrCumBoe).toLocaleString('en-US')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

/* ---------- helpers ---------- */

function monthOf(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  return (y - EPOCH_Y) * 12 + (m - EPOCH_M);
}
const monthLabel = (month) => monthLabelFor(EPOCH_Y, EPOCH_M, month);
function monthLabelFor(y0, m0, month) {
  const total = (y0 * 12 + (m0 - 1)) + month;
  const y = Math.floor(total / 12);
  const m = total % 12;
  return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m]} ${y}`;
}
function last(series) {
  return series[series.length - 1].rate;
}
function maxMonth() {
  let mx = 0;
  for (const w of data.wells) mx = Math.max(mx, monthOf(w.forecast[w.forecast.length - 1].date));
  return mx;
}
function maxHistoryMonth() {
  let mx = 0;
  for (const w of data.wells) mx = Math.max(mx, monthOf(w.history[w.history.length - 1].date));
  return mx;
}
function buildYearTicks() {
  const ticks = [{ month: 0, label: String(EPOCH_Y) }];
  for (let month = 1; month <= MONTH_MAX; month += 1) {
    const total = EPOCH_Y * 12 + (EPOCH_M - 1) + month;
    if (total % 12 === 0) ticks.push({ month, label: String(Math.floor(total / 12)) });
  }
  return ticks;
}
function linePath(points) {
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(p.month).toFixed(1)} ${yScale(p.rate).toFixed(1)}`)
    .join(' ');
}
function siteColor(site) {
  return site === 'S03' ? 'var(--est-viz-series-2)' : 'var(--est-viz-keep)';
}
function rateAt(well, month) {
  const h = well.history.find((p) => monthOf(p.date) === month);
  if (h) return h.rate;
  const f = well.forecast.find((p) => monthOf(p.date) === month);
  return f ? f.rate : null;
}
function dodge(labels, minGap = 15) {
  const sorted = [...labels].sort((a, b) => a.y - b.y);
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].y - sorted[i - 1].y < minGap) sorted[i].y = sorted[i - 1].y + minGap;
  }
  return sorted;
}
function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

export default Q1DeclineChart;
