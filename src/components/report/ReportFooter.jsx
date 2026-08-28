import styles from './Report.module.css';

function ReportFooter({ meta }) {
  return (
    <footer className={styles.footer}>
      Estacado Analytics · {meta.authors} · {meta.date}
    </footer>
  );
}

export default ReportFooter;
