import data from '../../Data/q5_investment.json';
import styles from './Q5InvestmentTable.module.css';

/**
 * Section 05 visual — the investment-screen wells as tables (no chart).
 *
 * Data is generated at build time by scripts/q5_investment.py, which joins the
 * committed investment_screen.csv (tier + intervention leg), the SELL / PLUG
 * disposition flag from decommission_screen.csv, and real annual profit from
 * well_investment_signals.csv. Nothing is hardcoded here.
 */
const WELLS = data.wells;
const NAMED = ['W0020', 'W0033', 'W0027', 'W0015']; // the compliance-capex picks + the weak case

const money = (n) => (n == null ? '—' : `$${(n / 1e6).toFixed(1)}M`);

function incidentRecord(w) {
  const parts = [`${w.nIncidents} incidents · sev ${w.sevTotal}`];
  if (w.nFlareBreach) parts.push(`${w.nFlareBreach} flare breach${w.nFlareBreach > 1 ? 'es' : ''}`);
  if (w.nHcSpill) parts.push(`${w.nHcSpill} HC spill${w.nHcSpill > 1 ? 's' : ''}`);
  if (w.nPwRelease) parts.push(`${w.nPwRelease} PW release${w.nPwRelease > 1 ? 's' : ''}`);
  return parts.join(' · ');
}

function Q5InvestmentTable() {
  return (
    <div className={styles.chart}>
      <div className={styles.tableScroll}>
        <table className={styles.evidence}>
          <caption>
            Compliance-capex picks — the intervention and the incident record behind it
          </caption>
          <thead>
            <tr>
              <th scope="col">Well</th>
              <th scope="col">Intervention</th>
              <th scope="col">Incident record</th>
              <th scope="col">Disposition</th>
            </tr>
          </thead>
          <tbody>
            {NAMED.map((id) => {
              const w = WELLS.find((x) => x.well === id);
              if (!w) return null;
              return (
                <tr key={id}>
                  <th scope="row">
                    {w.well}
                    <span className={styles.evidenceSite}>{w.siteName}</span>
                  </th>
                  <td>{w.intervention}</td>
                  <td>{incidentRecord(w)}</td>
                  <td className={w.disposition ? styles.dispShed : undefined}>
                    {w.disposition ?? '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <details className={styles.tableWrap}>
        <summary>Show all 23 screened wells</summary>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Well</th>
                <th scope="col">Site</th>
                <th scope="col">Tier</th>
                <th scope="col">BOE/d</th>
                <th scope="col">$/BOE</th>
                <th scope="col">Profit/yr</th>
                <th scope="col">Disposition</th>
              </tr>
            </thead>
            <tbody>
              {WELLS.map((w) => (
                <tr key={w.well}>
                  <th scope="row">{w.well}</th>
                  <td>{w.site}</td>
                  <td>{w.tier}</td>
                  <td>{Math.round(w.rateBoePerDay).toLocaleString('en-US')}</td>
                  <td>{w.costPerBoe.toFixed(1)}</td>
                  <td>{money(w.yearProfitUsd)}</td>
                  <td className={w.disposition ? styles.dispShed : undefined}>
                    {w.disposition ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

export default Q5InvestmentTable;
