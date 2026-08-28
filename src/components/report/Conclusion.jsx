import styles from './Report.module.css';

/**
 * The verdict — the authors' direct answer to the headline question. Carries
 * extra visual weight (blue top border + light blue band). The accent colour
 * appears here only on the plug/divest callout.
 */
function Conclusion({ id = 'verdict', verdict }) {
  return (
    <section id={id} className={styles.conclusion} aria-labelledby={`${id}-heading`}>
      <div className={styles.sectionHead}>
        <span className={styles.marker} aria-hidden="true">
          {verdict.number}
        </span>
        <h2 id={`${id}-heading`} className={`${styles.subhead} ${styles.verdictHead}`}>
          {verdict.subhead}
        </h2>
      </div>

      <div className={styles.analysis}>
        {verdict.paragraphs.map((para, i) => (
          <p key={i}>
            {para.text}
            {para.callout ? <span className={styles.callout}>{para.callout}</span> : null}
            {para.after}
          </p>
        ))}
      </div>
    </section>
  );
}

export default Conclusion;
