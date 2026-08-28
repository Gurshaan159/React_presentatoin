import AuthorsSection from './AuthorsSection.jsx';
import styles from './Report.module.css';

/**
 * Article masthead: magazine-style kicker, headline (the central question),
 * dek, then the team block, then an understated byline row. Scrolls with the
 * page.
 */
function ArticleHeader({ article, team }) {
  const { kicker, headline, dek, byline, hero } = article;

  return (
    <header className={styles.header}>
      <p className={styles.kicker}>
        <span className={styles.kickerPublisher}>{kicker.publisher}</span>
        <span className={styles.kickerDesk}>{kicker.desk}</span>
      </p>

      <h1 className={styles.headline}>{headline}</h1>
      <p className={styles.dek}>{dek}</p>

      {team ? <AuthorsSection authors={team} /> : null}

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

      {hero ? (
        <figure className={styles.hero}>
          <img
            className={styles.heroImg}
            src={hero.src}
            width={hero.width}
            height={hero.height}
            alt={hero.alt}
          />
          {hero.caption ? (
            <figcaption className={styles.caption}>{hero.caption}</figcaption>
          ) : null}
        </figure>
      ) : null}
    </header>
  );
}

export default ArticleHeader;
