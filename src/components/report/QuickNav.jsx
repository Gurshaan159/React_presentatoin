import styles from './Report.module.css';

/**
 * "In this piece" side rail — slim long-form-journalism nav, not app chrome.
 * Small-caps label, thin mono numerals, section titles. Smooth-scrolls to the
 * anchors and marks the active section in the accent colour.
 */
function QuickNav({ items, activeId, onJump }) {
  return (
    <nav className={styles.quicknav} aria-label="In this piece">
      <p className={styles.quicknavLabel}>In this piece</p>
      <ul className={styles.quicknavList}>
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={`${styles.quicknavLink} ${active ? styles.quicknavLinkActive : ''}`}
                aria-current={active ? 'true' : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  onJump(item.id);
                }}
              >
                <span className={styles.quicknavNum}>{item.number}</span>
                <span className={styles.quicknavText}>{item.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default QuickNav;
