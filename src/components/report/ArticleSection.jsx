import styles from './Report.module.css';

/**
 * One article section: a small margin marker (01–05), a narrative subhead,
 * lead-in prose, the visual with a caption, then the authors' analysis.
 * Presentational — copy comes from reportContent.js so each `Visual` can be
 * built independently.
 */
function ArticleSection({ id, number, subhead, leadIn, caption, analysis, Visual }) {
  return (
    <section id={id} className={styles.section} aria-labelledby={`${id}-heading`}>
      <div className={styles.sectionHead}>
        <span className={styles.marker} aria-hidden="true">
          {number}
        </span>
        <h2 id={`${id}-heading`} className={styles.subhead}>
          {subhead}
        </h2>
      </div>

      <p className={styles.leadIn}>{leadIn}</p>

      <figure className={styles.figure}>
        <Visual />
        <figcaption className={styles.caption}>{caption}</figcaption>
      </figure>

      <div className={styles.analysis}>
        {analysis.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </section>
  );
}

export default ArticleSection;
