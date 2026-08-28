import styles from './Report.module.css';

/**
 * One article section: a small margin marker (01–05), a narrative subhead,
 * lead-in prose, the visual with a caption, then the authors' analysis.
 * Presentational — copy comes from reportContent.js so each `Visual` can be
 * built independently.
 */
function ArticleSection({ id, number, subhead, image, leadIn, caption, analysis, bullets, Visual }) {
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

      {image ? (
        <figure className={styles.sectionImage}>
          <img
            className={styles.sectionImageImg}
            src={image.src}
            width={image.width}
            height={image.height}
            alt={image.alt}
            loading="lazy"
          />
          {image.caption ? (
            <figcaption className={styles.caption}>{image.caption}</figcaption>
          ) : null}
        </figure>
      ) : null}

      {leadIn ? <p className={styles.leadIn}>{leadIn}</p> : null}

      {Visual ? (
        <figure className={styles.figure}>
          <Visual />
          {caption ? <figcaption className={styles.caption}>{caption}</figcaption> : null}
        </figure>
      ) : null}

      <div className={styles.analysis}>
        {bullets ? (
          <ul className={styles.bulletList}>
            {analysis.map((item, i) => {
              if (typeof item === 'string') return <li key={i}>{item}</li>;
              return (
                <li key={i}>
                  <strong>{item.point}</strong>
                  {item.detail ? ` ${item.detail}` : null}
                  {item.reasons ? (
                    <ul className={styles.bulletSubList}>
                      {item.reasons.map((reason, j) => (
                        <li key={j}>{reason}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          analysis.map((para, i) => <p key={i}>{para}</p>)
        )}
      </div>
    </section>
  );
}

export default ArticleSection;
