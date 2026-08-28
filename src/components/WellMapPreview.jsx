import styles from './WellMapPreview.module.css';

/**
 * Placeholder slot for the interactive well-site map.
 *
 * The real map (clustering, basemap tiles, per-site drill-downs) lives in the
 * Map question view — not on the landing page. This component only renders the
 * framed container and an abstract well-scatter motif so the section reads as a
 * real product surface during the demo.
 */
function WellMapPreview({ regions }) {
  return (
    <div className={styles.frame} role="img" aria-label="Preview of the Estacado well-site map">
      <svg
        className={styles.scatter}
        viewBox="0 0 400 260"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <pattern id="wmp-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="#004C97" strokeOpacity="0.12" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="400" height="260" fill="url(#wmp-grid)" />
        <path
          d="M20 200 C 90 150, 140 210, 210 160 S 330 120, 388 150"
          fill="none"
          stroke="#004C97"
          strokeOpacity="0.25"
          strokeWidth="2"
        />
        <path
          d="M12 120 C 80 90, 150 130, 220 96 S 340 70, 392 92"
          fill="none"
          stroke="#004C97"
          strokeOpacity="0.18"
          strokeWidth="2"
        />
        {WELL_DOTS.map((d) => (
          <circle
            key={`${d.x}-${d.y}`}
            cx={d.x}
            cy={d.y}
            r={d.flagged ? 5 : 3.5}
            fill={d.flagged ? '#D64000' : '#004C97'}
            fillOpacity={d.flagged ? 0.9 : 0.65}
          />
        ))}
      </svg>

      <div className={styles.overlay}>
        <span className={styles.badge}>Map preview</span>
        <p className={styles.caption}>
          Interactive site map renders here in the Map view — pan the field, filter by
          business unit, and open any well for its decline curve and incident log.
        </p>
        {regions?.length ? (
          <ul className={styles.regions}>
            {regions.map((r) => (
              <li key={r.name}>
                <strong>{r.name}</strong>
                <span>{r.sites}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

// Fixed decorative positions so the motif is stable between renders.
const WELL_DOTS = [
  { x: 48, y: 70 }, { x: 96, y: 54 }, { x: 132, y: 92, flagged: true },
  { x: 168, y: 60 }, { x: 210, y: 108 }, { x: 250, y: 74 },
  { x: 288, y: 118, flagged: true }, { x: 320, y: 82 }, { x: 356, y: 132 },
  { x: 64, y: 150 }, { x: 116, y: 176 }, { x: 176, y: 148 },
  { x: 224, y: 190, flagged: true }, { x: 276, y: 168 }, { x: 330, y: 196 },
  { x: 92, y: 214 }, { x: 200, y: 226 }, { x: 300, y: 224 },
];

export default WellMapPreview;
