import styles from './Report.module.css';

/**
 * Article masthead: magazine-style kicker, headline (the central question),
 * dek, and an understated byline row. Scrolls with the page.
 */
function ArticleHeader({ article }) {
  const { kicker, headline, dek, byline } = article;

  return (
    <header className={styles.header}>
      <p className={styles.kicker}>
        <span className={styles.kickerPublisher}>{kicker.publisher}</span>
        <span className={styles.kickerDesk}>{kicker.desk}</span>
      </p>

      <h1 className={styles.headline}>{headline}</h1>
      <p className={styles.dek}>{dek}</p>

      <p className={styles.byline}>
        <span>By {byline.authors}</span>
        <span aria-hidden="true" className={styles.bylineDot}>
          ·
        </span>
        <span>{byline.date}</span>
        <span aria-hidden="true" className={styles.bylineDot}>
          ·
        </span>
        <span>{byline.readTime}</span>
      </p>
    </header>
  );
}

export default ArticleHeader;
