import styles from './Report.module.css';

/**
 * Placeholder slots for each section's visualization. Each is a real,
 * independently-editable component — swap the body for the chart/table when
 * it's built, keeping the exported name so reportContent.js stays wired up.
 *
 * Visuals use the semantic viz palette (theme.js: vizKeep / vizSell /
 * vizDecommission), NOT the ConocoPhillips / Estacado brand colours.
 */
function Slot({ name, kind }) {
  return (
    <div className={styles.slot}>
      <span className={styles.slotKind}>{kind}</span>
      <code className={styles.slotName}>{`<${name} />`}</code>
    </div>
  );
}

export function Q1DeclineChart() {
  return <Slot name="Q1DeclineChart" kind="Chart — decline curves" />;
}

export function Q2EfficiencyChart() {
  return <Slot name="Q2EfficiencyChart" kind="Chart — efficiency by site" />;
}

export function Q3HseRiskChart() {
  return <Slot name="Q3HseRiskChart" kind="Chart — HSE risk drivers" />;
}

export function Q4DecommissionTable() {
  return <Slot name="Q4DecommissionTable" kind="Table — decommission / sell screen" />;
}

export function Q5InvestmentTable() {
  return <Slot name="Q5InvestmentTable" kind="Table — investment tiers" />;
}
