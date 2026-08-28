import { themeCssVars } from '../theme.js';
import { portfolioSummary } from '../Data/portfolioSummary.js';
import WellMapPreview from './WellMapPreview.jsx';
import styles from './LandingPage.module.css';

/**
 * Landing / navigation page for the Estacado Portfolio Intelligence app.
 *
 * This screen frames the problem and routes into the five question views. It
 * contains no data visualizations — those belong in the individual views.
 *
 * Props:
 *  - onNavigate(key)   optional. Called with one of the NAV_ITEMS / QUESTIONS
 *                      keys when the user picks a destination. When omitted, the
 *                      page falls back to smooth-scrolling to in-page anchors.
 *  - summary           portfolio summary object (see Data/portfolioSummary.js).
 *  - hackathonName     string shown in the footer.
 *  - regions           optional list of { name, sites } for the map teaser.
 */
function LandingPage({
  onNavigate,
  summary = portfolioSummary,
  hackathonName = 'the 2026 Energy Data Hackathon',
  regions = DEFAULT_REGIONS,
}) {
  const go = (key, anchorId) => (event) => {
    if (onNavigate) {
      event.preventDefault();
      onNavigate(key);
      return;
    }
    const target = anchorId && document.getElementById(anchorId);
    if (target) {
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className={styles.page} style={themeCssVars}>
      <a className={styles.skipLink} href="#main">
        Skip to content
      </a>

      <header className={styles.nav}>
        <div className={styles.navInner}>
          <a
            className={styles.wordmark}
            href="#top"
            onClick={go('overview', 'top')}
            aria-label="Estacado Portfolio Intelligence — home"
          >
            <span className={styles.wordmarkMark} aria-hidden="true" />
            <span className={styles.wordmarkText}>
              <strong>ESTACADO</strong>
              <span>Portfolio Intelligence</span>
            </span>
          </a>

          <nav className={styles.navLinks} aria-label="Question views">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.key}
                href={`#${item.anchor}`}
                className={styles.navLink}
                onClick={go(item.key, item.anchor)}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main id="main">
        <section className={styles.hero} id="top">
          <HeroBackdrop />
          <div className={styles.heroInner}>
            <p className={styles.heroKicker}>Estacado well portfolio · Permian Basin</p>
            <h1 className={styles.heroHeadline}>
              Which wells earn their place —
              <br />
              and which ones cost you to keep them?
            </h1>
            <p className={styles.heroSubhead}>
              Estacado Portfolio Intelligence builds a living digital twin of every well on
              the lease, turning production, cost, and safety signals into defensible
              keep, sell, and plug decisions — a workflow that scales from one field to the
              whole enterprise.
            </p>
            <div className={styles.heroActions}>
              <a
                className={styles.btnPrimary}
                href="#map"
                onClick={go('map', 'map')}
              >
                Explore the Portfolio
              </a>
              <a
                className={styles.btnSecondary}
                href="#questions"
                onClick={go('methodology', 'questions')}
              >
                View Methodology
              </a>
            </div>
          </div>
        </section>

        <section className={styles.statStrip} aria-label="Portfolio summary">
          <div className={styles.statStripInner}>
            {summary.stats.map((stat) => (
              <div key={stat.id} className={styles.stat}>
                <span className={styles.statValue}>{stat.value}</span>
                <span className={styles.statLabel}>{stat.label}</span>
                {stat.detail ? (
                  <span className={styles.statDetail}>{stat.detail}</span>
                ) : null}
              </div>
            ))}
          </div>
          {summary.asOf ? (
            <p className={styles.statAsOf}>Mock figures for demo · data as of {summary.asOf}</p>
          ) : null}
        </section>

        <section className={styles.questions} id="questions">
          <div className={styles.sectionHead}>
            <h2>Five questions, one portfolio view</h2>
            <p>
              Each view answers one decision the asset team faces every planning cycle.
              Start anywhere — the underlying well models are shared.
            </p>
          </div>

          <ul className={styles.cardGrid}>
            {QUESTIONS.map((q, index) => (
              <li key={q.key}>
                <a
                  className={styles.card}
                  href={`#${q.anchor}`}
                  onClick={go(q.key, q.anchor)}
                >
                  <span className={styles.cardBadge}>{String(index + 1).padStart(2, '0')}</span>
                  <h3 className={styles.cardTitle}>{q.title}</h3>
                  <p className={styles.cardDesc}>{q.description}</p>
                  <span className={styles.cardCta} aria-hidden="true">
                    Open view →
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.mapTeaser} id="map">
          <div className={styles.mapTeaserInner}>
            <div className={styles.sectionHead}>
              <h2>Every site on one map</h2>
              <p>
                Estacado's wells span the Permian North, Central, and East business units
                across the Midland and Delaware sub-basins. The map view ties each site's
                location to its production, margin, and incident history.
              </p>
            </div>
            <WellMapPreview regions={regions} />
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <strong>ESTACADO</strong>
            <span>Portfolio Intelligence</span>
          </div>
          <p className={styles.footerNote}>
            Built for {hackathonName}. Independent project — not affiliated with,
            sponsored by, or endorsed by ConocoPhillips. No corporate logos, imagery, or
            taglines are used.
          </p>
        </div>
      </footer>
    </div>
  );
}

/** Decorative topographic / well-line motif behind the hero. Purely visual. */
function HeroBackdrop() {
  return (
    <svg
      className={styles.heroBackdrop}
      viewBox="0 0 1440 720"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="none" stroke="#FFFFFF" strokeOpacity="0.10" strokeWidth="1.5">
        <path d="M-40 140 C 260 60, 520 220, 820 150 S 1300 60, 1520 170" />
        <path d="M-40 240 C 260 170, 520 320, 820 250 S 1300 170, 1520 270" />
        <path d="M-40 360 C 300 280, 560 440, 860 360 S 1320 280, 1520 380" />
        <path d="M-40 480 C 300 400, 560 560, 860 480 S 1320 400, 1520 500" />
        <path d="M-40 600 C 320 520, 600 680, 900 600 S 1340 520, 1520 620" />
      </g>
      <g stroke="#FFFFFF" strokeOpacity="0.16" strokeWidth="1.5">
        <line x1="360" y1="150" x2="360" y2="640" />
        <line x1="760" y1="250" x2="760" y2="640" />
        <line x1="1120" y1="200" x2="1120" y2="640" />
      </g>
      <g fill="#D64000" fillOpacity="0.55">
        <circle cx="360" cy="150" r="5" />
        <circle cx="1120" cy="200" r="5" />
      </g>
      <g fill="#FFFFFF" fillOpacity="0.35">
        <circle cx="760" cy="250" r="4" />
      </g>
    </svg>
  );
}

const NAV_ITEMS = [
  { key: 'production', label: 'Production', anchor: 'questions' },
  { key: 'efficiency', label: 'Efficiency', anchor: 'questions' },
  { key: 'hse', label: 'HSE Risk', anchor: 'questions' },
  { key: 'decisions', label: 'Decisions', anchor: 'questions' },
  { key: 'map', label: 'Map', anchor: 'map' },
];

const QUESTIONS = [
  {
    key: 'production',
    anchor: 'questions',
    title: 'Top Producers & Decline Forecast',
    description:
      'Rank wells by current rate and fit decline curves to project 12–24 month volumes and remaining reserves.',
  },
  {
    key: 'efficiency',
    anchor: 'questions',
    title: 'Production Efficiency',
    description:
      'Compare BOE per pump-hour and operating cost per barrel to isolate underperforming artificial lift.',
  },
  {
    key: 'hse',
    anchor: 'questions',
    title: 'HSE Risk & Drivers',
    description:
      'Score each site on incident frequency and severity, then surface the operational drivers behind the risk.',
  },
  {
    key: 'decisions',
    anchor: 'questions',
    title: 'Decommission / Sell Decisions',
    description:
      'Weigh margin, remaining reserves, and plugging liability into a keep, sell, or plug call per well.',
  },
  {
    key: 'investment',
    anchor: 'questions',
    title: 'Investment Recommendations',
    description:
      'Find where the next dollar of capital — workovers, lift upgrades, offsets — earns the best return.',
  },
];

const DEFAULT_REGIONS = [
  { name: 'Permian North', sites: 'Delaware sub-basin' },
  { name: 'Permian Central', sites: 'Midland sub-basin' },
  { name: 'Permian East', sites: 'Eastern shelf' },
];

export default LandingPage;
