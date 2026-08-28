import styles from './Report.module.css';

/** First + last initial from a name, e.g. "Ada Lovelace" -> "AL". */
function initialsOf(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '·';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/**
 * "The team" block — sits in the masthead between the dek and the byline. One
 * card per author: a square portrait (with an initials fallback), the name, and
 * an affiliation line (school · major).
 *
 * Give a person an `image` (imported asset or URL) to show a photo; without one
 * the card shows an initials monogram.
 */
function AuthorsSection({ authors, id = 'team' }) {
  if (!authors || !authors.people || !authors.people.length) return null;

  return (
    <section id={id} className={styles.team} aria-labelledby={`${id}-heading`}>
      <p id={`${id}-heading`} className={styles.teamHeading}>
        {authors.heading}
      </p>
      {authors.blurb ? <p className={styles.teamBlurb}>{authors.blurb}</p> : null}

      <ul className={styles.teamGrid}>
        {authors.people.map((p) => (
          <li key={p.name} className={styles.teamCard}>
            <div className={styles.teamPhoto}>
              {p.image ? (
                <img src={p.image} alt={p.name} loading="lazy" />
              ) : (
                <span className={styles.teamMono} aria-hidden="true">
                  {p.initials || initialsOf(p.name)}
                </span>
              )}
            </div>
            <div className={styles.teamText}>
              <span className={styles.teamName}>{p.name}</span>
              {p.affiliation ? (
                <span className={styles.teamAffil}>{p.affiliation}</span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default AuthorsSection;
