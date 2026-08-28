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
 * Closing "about the team" section — one card per author. Not one of the
 * numbered questions, so it carries no numeral marker.
 */
function AuthorsSection({ authors, id = 'team' }) {
  return (
    <section id={id} className={styles.authors} aria-labelledby={`${id}-heading`}>
      <p className={styles.authorsKicker}>Colophon</p>
      <h2 id={`${id}-heading`} className={styles.authorsHeading}>
        {authors.heading}
      </h2>
      {authors.blurb ? <p className={styles.authorsBlurb}>{authors.blurb}</p> : null}

      <ul className={styles.authorGrid}>
        {authors.people.map((p) => (
          <li key={`${p.name}-${p.role}`} className={styles.authorCard}>
            <span className={styles.authorAvatar} aria-hidden="true">
              {p.initials || initialsOf(p.name)}
            </span>
            <span className={styles.authorName}>{p.name}</span>
            <span className={styles.authorRole}>{p.role}</span>
            <span className={styles.authorFocus}>{p.focus}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default AuthorsSection;
