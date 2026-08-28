import { useId, useState } from 'react';
import data from '../../Data/q4_well_economics.json';
import styles from './Q4EconomicsChart.module.css';

/**
 * Section 04 visual — the decommission / sell screen.
 *
 * Data is generated at build time by scripts/finance.py from the raw
 * production.csv + financial_estacado.json (not the cleaned/ copies). Each well
 * gets a 5-year hyperbolic-forecast BOE and a mean monthly operating cost; both
 * are min-max normalized (more production = better, lower cost = better) and
 * blended 50/50 into a well score. The five lowest scores are flagged, the five
 * highest are the invest shortlist.
 *
 * 30 of the 40 wells are scored here; the other 10 are shut-in with no
 * operating history and fall outside the screen.
 *
 * Encoding: scatter, one point per well — x = 5-yr forecast BOE, y = avg.
 * monthly operating cost. Colour = screen result (decommission / invest /
 * keep), matching the table's tag colours below. Only the ten flagged wells
 * get a direct label; the rest are reachable by hover/focus or in the table.
 */
const WELLS = data.wells; // ranked worst -> best by finance.py
const FLAGGED = data.decommissionOrSell;

const fmtBoe = (n) => (n == null ? '—' : Math.round(n).toLocaleString('en-US'));
const fmtCost = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
const fmtScore = (n) => (n == null ? '—' : n.toFixed(2));

function groupOf(reco) {
  if (reco === 'Decommission / sell') return 'sell';
  if (reco === 'Invest / keep') return 'invest';
  return 'keep';
}
function groupColor(group) {
  if (group === 'sell') return 'var(--est-viz-decommission)';
  if (group === 'invest') return 'var(--est-blue)';
  return 'var(--est-mute)';
}
function recoClass(reco) {
  if (reco === 'Decommission / sell') return styles.tagShed;
  if (reco === 'Invest / keep') return styles.tagInvest;
  return styles.tagKeep;
}

// ---------- chart geometry ----------

const VB = { w: 760, h: 440 };
const M = { top: 16, right: 20, bottom: 40, left: 60 };
const PLOT = {
  x0: M.left,
  x1: VB.w - M.right,
  y0: M.top,
  y1: VB.h - M.bottom,
};

const X = niceScale(Math.max(...WELLS.map((w) => w.forecast5yrBoe ?? 0)));
const Y = niceScale(Math.max(...WELLS.map((w) => w.avgOperatingCost ?? 0)));

const xScale = (v) => PLOT.x0 + (v / X.max) * (PLOT.x1 - PLOT.x0);
const yScale = (v) => PLOT.y1 - (v / Y.max) * (PLOT.y1 - PLOT.y0);

const POINTS = WELLS.filter((w) => w.forecast5yrBoe != null).map((w) => {
  const group = groupOf(w.recommendation);
  return {
    ...w,
    group,
    color: groupColor(group),
    px: xScale(w.forecast5yrBoe),
    py: yScale(w.avgOperatingCost),
  };
});

const LABELS = dodgeLabels(
  POINTS.filter((p) => p.group !== 'keep').map((p) => ({ id: p.wellId, lx: p.px, ly: p.py - 10 })),
);

function Q4EconomicsChart() {
  const titleId = useId();
  const [hoveredId, setHoveredId] = useState(null);
  const hovered = hoveredId ? POINTS.find((p) => p.wellId === hoveredId) : null;

  return (
    <div className={styles.chart} role="group" aria-labelledby={titleId}>
      <p id={titleId} className={styles.title}>
        Five-year forecast volume vs. operating cost, all 30 scored wells
        <span className={styles.unit}>x: 5-yr forecast BOE · y: avg. operating cost per month</span>
      </p>

      <div className={styles.legend} aria-hidden="true">
        <span className={styles.legendItem}>
          <span className={styles.swatch} style={{ background: groupColor('sell') }} /> Decommission / sell
        </span>
        <span className={styles.legendItem}>
          <span className={styles.swatch} style={{ background: groupColor('invest') }} /> Invest / keep
        </span>
        <span className={styles.legendItem}>
          <span className={styles.swatch} style={{ background: groupColor('keep') }} /> Keep
        </span>
      </div>

      <div className={styles.plotWrap}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${VB.w} ${VB.h}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* y grid + labels */}
          {Y.ticks.map((t) => (
            <g key={`y${t}`}>
              <line className={styles.grid} x1={PLOT.x0} x2={PLOT.x1} y1={yScale(t)} y2={yScale(t)} />
              <text className={styles.axisText} x={PLOT.x0 - 8} y={yScale(t)} dy="0.32em" textAnchor="end">
                {fmtAxisCost(t)}
              </text>
            </g>
          ))}

          {/* x grid + labels */}
          {X.ticks.map((t) => (
            <g key={`x${t}`}>
              <line className={styles.grid} x1={xScale(t)} x2={xScale(t)} y1={PLOT.y0} y2={PLOT.y1} />
              <text className={styles.axisText} x={xScale(t)} y={PLOT.y1 + 18} textAnchor="middle">
                {fmtAxisBoe(t)}
              </text>
            </g>
          ))}

          <line className={styles.baseline} x1={PLOT.x0} x2={PLOT.x1} y1={PLOT.y1} y2={PLOT.y1} />
          <line className={styles.baseline} x1={PLOT.x0} x2={PLOT.x0} y1={PLOT.y0} y2={PLOT.y1} />

          {/* leader lines for dodged labels */}
          {LABELS.map((l) => {
            const p = POINTS.find((pt) => pt.wellId === l.id);
            const dy = Math.abs(l.ly - (p.py - 10));
            if (dy < 1) return null;
            return (
              <line
                key={`leader-${l.id}`}
                className={styles.leader}
                x1={p.px}
                y1={p.py}
                x2={l.lx}
                y2={l.ly}
              />
            );
          })}

          {/* points */}
          {POINTS.map((p) => {
            const r = p.group === 'keep' ? 5 : 7;
            const on = hoveredId === p.wellId;
            return (
              <circle
                key={p.wellId}
                className={styles.dot}
                cx={p.px}
                cy={p.py}
                r={on ? r + 1.5 : r}
                fill={p.color}
                tabIndex={0}
                onMouseEnter={() => setHoveredId(p.wellId)}
                onMouseLeave={() => setHoveredId(null)}
                onFocus={() => setHoveredId(p.wellId)}
                onBlur={() => setHoveredId(null)}
                aria-label={
                  `${p.wellId}: ${fmtBoe(p.forecast5yrBoe)} BOE 5-yr forecast, ` +
                  `${fmtCost(p.avgOperatingCost)} avg. monthly operating cost, ${p.recommendation}`
                }
              />
            );
          })}

          {/* direct labels — flagged wells only */}
          {LABELS.map((l) => {
            const p = POINTS.find((pt) => pt.wellId === l.id);
            return (
              <text
                key={`label-${l.id}`}
                className={styles.pointLabel}
                x={l.lx + 6}
                y={l.ly}
                dy="0.32em"
                fill={p.color}
              >
                {l.id}
              </text>
            );
          })}
        </svg>

        {hovered ? (
          <div
            className={styles.tip}
            style={{
              left: `${(hovered.px / VB.w) * 100}%`,
              top: `${(hovered.py / VB.h) * 100}%`,
            }}
            role="status"
          >
            <strong>{hovered.wellId}</strong>
            <span>
              5-yr BOE <b>{fmtBoe(hovered.forecast5yrBoe)}</b>
            </span>
            <span>
              Avg. op. cost <b>{fmtCost(hovered.avgOperatingCost)}</b>
            </span>
            <span>
              Well score <b>{fmtScore(hovered.wellScore)}</b>
            </span>
            <span className={styles.tipTag}>{hovered.recommendation}</span>
          </div>
        ) : null}
      </div>

      <Table rows={FLAGGED} caption="The five wells flagged for decommission or sale." />

      <details className={styles.details}>
        <summary>Show all 30 scored wells</summary>
        <Table rows={WELLS} full caption="All 30 scored wells, ranked worst to best." />
      </details>
    </div>
  );
}

function Table({ rows, full, caption }) {
  return (
    <div className={styles.tableScroll}>
      <table className={`${styles.table} ${full ? styles.tableFull : ''}`}>
        <caption className={styles.srOnly}>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Well</th>
            <th scope="col">5-yr BOE</th>
            <th scope="col">Avg op. cost / mo</th>
            {full ? <th scope="col">Prod.</th> : null}
            {full ? <th scope="col">Cost</th> : null}
            <th scope="col">Well score</th>
            <th scope="col">Screen result</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((w) => {
            const flagged = w.recommendation === 'Decommission / sell';
            return (
              <tr key={w.wellId} className={flagged ? styles.flaggedRow : undefined}>
                <th scope="row">{w.wellId}</th>
                <td>{fmtBoe(w.forecast5yrBoe)}</td>
                <td>{fmtCost(w.avgOperatingCost)}</td>
                {full ? <td>{fmtScore(w.productionScore)}</td> : null}
                {full ? <td>{fmtScore(w.costScore)}</td> : null}
                <td>
                  <ScoreCell value={w.wellScore} />
                </td>
                <td>
                  <span className={`${styles.tag} ${recoClass(w.recommendation)}`}>
                    {w.recommendation}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ScoreCell({ value }) {
  return (
    <span className={styles.scoreCell}>
      <span className={styles.scoreTrack}>
        <span className={styles.scoreBar} style={{ width: `${(value ?? 0) * 100}%` }} />
      </span>
      <span className={styles.scoreNum}>{fmtScore(value)}</span>
    </span>
  );
}

/* ---------- helpers ---------- */

function niceNumber(x) {
  if (!(x > 0)) return 1;
  const exp = Math.floor(Math.log10(x));
  const f = x / 10 ** exp;
  const nf = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
  return nf * 10 ** exp;
}
function niceScale(maxVal, count = 5) {
  const step = niceNumber(maxVal / (count - 1));
  const niceMax = Math.ceil(maxVal / step) * step;
  const ticks = [];
  for (let v = 0; v <= niceMax + 1e-6; v += step) ticks.push(Math.round(v));
  return { ticks, max: niceMax };
}
function fmtAxisBoe(v) {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${Math.round(v / 1e3)}K`;
  return String(v);
}
function fmtAxisCost(v) {
  if (v >= 1e3) return `$${Math.round(v / 1e3)}K`;
  return `$${v}`;
}
// Nudge overlapping direct labels apart, keeping a leader line back to the dot.
function dodgeLabels(labels, minDist = 34, iterations = 60) {
  const out = labels.map((l) => ({ ...l }));
  for (let iter = 0; iter < iterations; iter += 1) {
    let moved = false;
    for (let i = 0; i < out.length; i += 1) {
      for (let j = i + 1; j < out.length; j += 1) {
        const a = out[i];
        const b = out[j];
        const dx = b.lx - a.lx;
        const dy = b.ly - a.ly;
        const dist = Math.hypot(dx, dy) || 0.001;
        if (dist < minDist) {
          moved = true;
          const push = (minDist - dist) / 2;
          const ux = dx / dist;
          const uy = dy / dist;
          a.lx -= ux * push;
          a.ly -= uy * push;
          b.lx += ux * push;
          b.ly += uy * push;
        }
      }
    }
    if (!moved) break;
  }
  return out;
}

export default Q4EconomicsChart;
