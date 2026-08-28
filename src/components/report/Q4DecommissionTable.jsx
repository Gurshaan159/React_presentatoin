import data from '../../Data/q4_well_economics.json';
import styles from './Q4DecommissionTable.module.css';

/**
 * Section 04 visual — the decommission / sell screen.
 *
 * Data is generated at build time by scripts/finance.py from the raw
 * production.csv + financial_estacado.json (not the cleaned/ copies). Each well
 * gets a 5-year hyperbolic-forecast BOE and a mean monthly operating cost; both
 * are min-max normalized (more production = better, lower cost = better) and
 * blended 50/50 into a well score. The five lowest scores are flagged.
 *
 * 30 of the 40 wells are scored here; the other 10 are shut-in with no
 * operating history and fall outside the screen.
 */
const WELLS = data.wells; // already ranked worst -> best by finance.py
const FLAGGED = data.decommissionOrSell;

const fmtBoe = (n) => (n == null ? '—' : Math.round(n).toLocaleString('en-US'));
const fmtCost = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
const fmtScore = (n) => (n == null ? '—' : n.toFixed(2));

function recoClass(reco) {
  if (reco === 'Decommission / sell') return styles.tagShed;
  if (reco === 'Invest / keep') return styles.tagInvest;
  return styles.tagKeep;
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

function Q4DecommissionTable() {
  return (
    <div className={styles.chart}>
      <p className={styles.title}>
        Decommission / sell screen — lowest production-vs-cost scores
        <span className={styles.unit}>
          5-year forecast BOE and mean monthly operating cost, each normalized 0–1 and blended
          50/50 · 30 of 40 wells scored
        </span>
      </p>

      <Table rows={FLAGGED} caption="The five wells flagged for decommission or sale." />

      <details className={styles.details}>
        <summary>Show all 30 scored wells</summary>
        <Table rows={WELLS} full caption="All 30 scored wells, ranked worst to best." />
      </details>
    </div>
  );
}

export default Q4DecommissionTable;
