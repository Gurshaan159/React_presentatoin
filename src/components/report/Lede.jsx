import styles from './Report.module.css';

/** Editorial lede — opening paragraphs, set larger than the body. */
function Lede({ paragraphs }) {
  return (
    <section className={styles.lede} aria-label="Introduction">
      {paragraphs.map((para, i) => (
        <p key={i}>{para}</p>
      ))}
    </section>
  );
}

export default Lede;
