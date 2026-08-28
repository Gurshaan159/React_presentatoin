import { useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import wellAveragesCsv from './well_averages.csv?raw';

// Per-well average attributes, grouped by site code:
//   { S01: [{ well, days, oil, gas, water, boe }, ...], ... }
const WELL_AVERAGES_BY_SITE = wellAveragesCsv
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .reduce((acc, line) => {
    const [site, well, days, oil, gas, water, boe] = line.split(',');
    (acc[site] ??= []).push({
      well, days: +days, oil: +oil, gas: +gas, water: +water, boe: +boe,
    });
    return acc;
  }, {});

// Enriched HSE detail, keyed by site_code. Manager + serious_events come from
// hse_index_by_site_enriched.csv; the root-cause / top-well breakdowns are
// tallied from the real incident titles in hse_incidents.cleaned.json.
const HSE_ENRICHED = {
  S05: { manager: 'Sam Ford', serious_events: 21, serious_root_cause: 'Lost-time injury 13x | Recordable injury 6x | Fire / near miss 4x', site_root_cause: 'Lost-time injury 13x | Vehicle incident 7x | Hydrocarbon spill 7x', top_well: 'W0037', top_well_incidents: 19, top_well_root_cause: 'Permit violation 4x | Lost-time injury 3x' },
  S04: { manager: 'Alex Chen', serious_events: 5, serious_root_cause: 'Fire / near miss 2x | Lost-time injury 1x | Recordable injury 1x', site_root_cause: 'Produced water release 4x | Slip / trip / fall 3x | Fire / near miss 2x', top_well: 'W0001', top_well_incidents: 14, top_well_root_cause: 'Produced water release 4x | Fire / near miss 2x' },
  S06: { manager: 'Priya Rao', serious_events: 3, serious_root_cause: 'Recordable injury 2x | Lost-time injury 1x | Fire / near miss 1x', site_root_cause: 'Minor spill 4x | Vehicle incident 3x | Recordable injury 2x', top_well: 'W0015', top_well_incidents: 8, top_well_root_cause: 'Minor spill 3x | Produced water release 2x' },
  S02: { manager: 'Kim Vega', serious_events: 3, serious_root_cause: 'Uncontrolled release 1x | Serious injury 1x | Fire / near miss 1x', site_root_cause: 'Slip / trip / fall 3x | Regulatory citation 2x | Uncontrolled release 1x', top_well: 'W0025', top_well_incidents: 6, top_well_root_cause: 'Slip / trip / fall 2x | Uncontrolled release 1x' },
  S08: { manager: 'Nina Kwan', serious_events: 2, serious_root_cause: 'Uncontrolled release 1x | Serious injury 1x', site_root_cause: 'Minor spill 2x | Environmental exceedance 2x | Regulatory citation 2x', top_well: 'W0027', top_well_incidents: 3, top_well_root_cause: 'Minor spill 1x | Hydrocarbon spill 1x' },
  S07: { manager: 'Luis Diaz', serious_events: 0, serious_root_cause: '', site_root_cause: 'Minor spill 4x | Recordable injury 2x | Environmental exceedance 2x', top_well: 'W0033', top_well_incidents: 5, top_well_root_cause: 'Environmental exceedance 2x | Lost-time injury 1x' },
  S01: { manager: 'Jane Ortiz', serious_events: 1, serious_root_cause: 'Recordable injury 1x', site_root_cause: 'Environmental exceedance 2x | Slip / trip / fall 1x | Recordable injury 1x', top_well: 'W0026', top_well_incidents: 4, top_well_root_cause: 'Slip / trip / fall 1x | Environmental exceedance 1x' },
  S03: { manager: 'Ravi Patel', serious_events: 0, serious_root_cause: '', site_root_cause: 'Vehicle incident 2x', top_well: 'W0006', top_well_incidents: 1, top_well_root_cause: 'Vehicle incident 1x' },
};

// Leading indicator: equipment-stress band + worst well per site, from the
// equipment stress model (equipment_stress_by_site.csv). Forward-looking — it
// flags where the next incident is likely, independent of the incident count.
const EQUIP_STRESS = {
  S05: { band: 'Critical', worst_well: 'W0017' },
  S04: { band: 'Normal', worst_well: 'W0001' },
  S06: { band: 'Elevated', worst_well: 'W0024' },
  S07: { band: 'High', worst_well: 'W0003' },
  S02: { band: 'Elevated', worst_well: 'W0009' },
  S08: { band: 'Critical', worst_well: 'W0023' },
  S01: { band: 'Normal', worst_well: 'W0030' },
  S03: { band: 'High', worst_well: 'W0014' },
};

// Equipment-stress band -> colour. Only High / Critical get emphasis.
const STRESS_COLORS = {
  Critical: '#b00020',
  High: '#e8710a',
  Elevated: '#5f6368',
  Normal: '#5f6368',
};

// Risk band -> colour. Matched on the leading phrase of `risk_band`.
const RISK_COLORS = [
  { key: 'Critical risk', color: '#b00020', label: 'Critical risk' },
  { key: 'Moderate risk', color: '#f4b400', label: 'Moderate risk' },
  { key: 'Low risk', color: '#0f9d58', label: 'Low risk' },
  { key: 'Minimal risk', color: '#1a73e8', label: 'Minimal risk' }
];

// Root-cause strings only list the top few categories, so their "Nx" counts
// don't sum to the site/well total. Append "+N other" so it doesn't read as a bug.
function withRemainder(causeStr, total) {
  const counted = (causeStr.match(/(\d+)x/g) || []).reduce((s, m) => s + parseInt(m, 10), 0);
  const rest = total - counted;
  return rest > 0 ? `${causeStr} | +${rest} other` : causeStr;
}

function riskColor(band) {
  const hit = RISK_COLORS.find((r) => band.startsWith(r.key));
  return hit ? hit.color : '#5f6368';
}

function diamondIcon(color, active) {
  return L.divIcon({
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html: `<div style="width:20px;height:20px;transform:rotate(45deg);
      background:${color};border:${active ? 3 : 2}px solid #fff;
      box-shadow:0 0 3px rgba(0,0,0,0.5);"></div>`,
  });
}

const SITES = [
  { site_code: 'S05', site_name: 'Wolfcamp North', business_unit: 'Permian North', latitude: 31.161784, longitude: -101.500626, n_incidents: 66, HSE_index: 0.0, risk_band: 'Critical risk - frequent and severe incidents; immediate intervention required', OilBarrelsPerDay: 566, last_incident_date: '2026-08-26' },
  { site_code: 'S04', site_name: 'Odessa Yard', business_unit: 'Permian Central', latitude: 30.292934, longitude: -101.121177, n_incidents: 17, HSE_index: 59.6, risk_band: 'Moderate risk - frequent and severe incidents; immediate intervention required', OilBarrelsPerDay: 34, last_incident_date: '2026-08-13' },
  { site_code: 'S06', site_name: 'Delaware Flats', business_unit: 'Permian North', latitude: 30.232935, longitude:-100.872216, n_incidents:16, HSE_index:61.5, risk_band:'Moderate risk - elevated incident rate with serious outcomes; priority action needed', OilBarrelsPerDay:59, last_incident_date: '2026-08-02' },
  { site_code: 'S02', site_name: 'Big Spring Complex', business_unit: 'Permian West', latitude: 31.37119, longitude: -101.76322, n_incidents: 12, HSE_index: 69.4, risk_band: 'Moderate risk - elevated incident rate with serious outcomes; priority action needed', OilBarrelsPerDay: 127, last_incident_date: '2026-08-06'},
  { site_code: 'S08', site_name:'Alamo Sunset', business_unit:'Permian East', latitude:30.49092, longitude:-102.759829, n_incidents:10, HSE_index:73.9, risk_band:'Moderate risk - some serious incidents; targeted improvement warranted', OilBarrelsPerDay:274, last_incident_date: '2026-07-05' },
  { site_code: 'S07', site_name:'Andrews Legacy', business_unit:'Permian East', latitude:31.531908, longitude:-102.690386, n_incidents:14, HSE_index:65.3, risk_band:'Moderate risk - infrequent, mostly minor incidents; maintain controls', OilBarrelsPerDay:177, last_incident_date: '2026-08-23' },
  { site_code: 'S01', site_name: 'Estacado Ridge', business_unit: 'Permian West', latitude: 30.799264, longitude: -100.918286, n_incidents: 8, HSE_index: 81.2, risk_band: 'Low risk - infrequent, mostly minor incidents; maintain controls', OilBarrelsPerDay: 263, last_incident_date: '2026-04-21' },
  { site_code:'S03', site_name:'Midland Central', business_unit:'Permian Central', latitude:30.44963, longitude:-102.825613, n_incidents: 2, HSE_index: 100.0, risk_band:'Minimal risk - very few incidents, no serious outcomes; strong performer', OilBarrelsPerDay:474, last_incident_date: '2026-04-06'}
];

export default function Map() {
  const [selected, setSelected] = useState(null);
  const [production, setProduction] = useState(null); // { site, wells } | null
  const mapRef = useRef(null);

  const openProduction = (site) => {
    const wells = WELL_AVERAGES_BY_SITE[site.site_code];
    if (!wells) return;
    setProduction({ site: site.site_code, wells });
  };

  return (
    <div style={styles.wrap}>
      <MapContainer ref={mapRef} center={[30.9, -101.7]} zoom={8} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {SITES.map((site) => (
          <Marker
            key={site.site_code}
            position={[site.latitude, site.longitude]}
            icon={diamondIcon(riskColor(site.risk_band), selected?.site_code === site.site_code)}
            eventHandlers={{ click: () => setSelected(site) }}
          >
            <Tooltip direction="top" offset={[0, -10]}>
              {site.site_code} &middot; {site.site_name}
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>

      <div style={styles.legend}>
        <div style={styles.legendTitle}>Risk band</div>
        {RISK_COLORS.map((r) => (
          <div key={r.key} style={styles.legendRow}>
            <span style={{ ...styles.legendSwatch, background: r.color }} />
            {r.label}
          </div>
        ))}
      </div>

      {selected && (
        <div style={styles.card}>
          <div style={{ ...styles.cardBar, background: riskColor(selected.risk_band) }} />
          <button style={styles.close} onClick={() => setSelected(null)} aria-label="Close">
            &times;
          </button>
          <div style={styles.cardBody}>
            <div style={styles.eyebrow}>
              {selected.site_code} &middot; {selected.business_unit}
            </div>
            <h2 style={styles.title}>{selected.site_name}</h2>

            <div style={styles.stats}>
              <div>
                <div style={styles.statValue}>{selected.n_incidents}</div>
                <div style={styles.statLabel}>Incidents</div>
              </div>
              <div>
                <div style={styles.statValue}>{selected.HSE_index.toFixed(1)}</div>
                <div style={styles.statLabel}>HSE index</div>
              </div>
              <div>
                <div style={styles.statValue}>{selected.last_incident_date}</div>
                <div style={styles.statLabel}>Last Incident</div>
              </div>
              <div>
                {WELL_AVERAGES_BY_SITE[selected.site_code] ? (
                  <button style={styles.siteLink} onClick={() => openProduction(selected)}>
                    {selected.site_code} &rsaquo;
                  </button>
                ) : (
                  <div style={styles.statValue}>{selected.site_code}</div>
                )}
                <div style={styles.statLabel}>Production data</div>
              </div>
            </div>

            <div style={{ ...styles.riskPill, background: riskColor(selected.risk_band) }}>
              {selected.risk_band}
            </div>

            {HSE_ENRICHED[selected.site_code] && (() => {
              const e = HSE_ENRICHED[selected.site_code];
              return (
                <div style={styles.detail}>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Manager</span>
                    <span style={styles.detailValue}>{e.manager}</span>
                  </div>
                  {EQUIP_STRESS[selected.site_code] && (() => {
                    const s = EQUIP_STRESS[selected.site_code];
                    const hot = s.band === 'Critical' || s.band === 'High';
                    return (
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Equip. stress</span>
                        <span style={styles.detailValue}>
                          <span style={{ ...styles.stressBadge, background: STRESS_COLORS[s.band], opacity: hot ? 1 : 0.55 }}>
                            {s.band}
                          </span>
                          {' '}leading indicator &mdash; highest-stress well{' '}
                          {WELL_AVERAGES_BY_SITE[selected.site_code] ? (
                            <button style={styles.wellLink} onClick={() => openProduction(selected)}>
                              {s.worst_well} &rsaquo;
                            </button>
                          ) : (
                            s.worst_well
                          )}
                        </span>
                      </div>
                    );
                  })()}
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Severity</span>
                    <span style={styles.detailValue}>
                      {e.serious_events} serious event{e.serious_events === 1 ? '' : 's'} of {selected.n_incidents} incidents
                      {e.serious_root_cause && (
                        <span style={styles.detailExample}>{e.serious_root_cause}</span>
                      )}
                    </span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Root cause</span>
                    <span style={styles.detailValue}>{withRemainder(e.site_root_cause, selected.n_incidents)}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Most incidents</span>
                    <span style={styles.detailValue}>
                      &#9733; {e.top_well} &mdash; {e.top_well_incidents} incidents ({withRemainder(e.top_well_root_cause, e.top_well_incidents)})
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {production && (
        <div style={{ ...styles.card, ...styles.prodCard }}>
          <div style={{ ...styles.cardBar, background: '#1a73e8' }} />
          <button style={styles.close} onClick={() => setProduction(null)} aria-label="Close">
            &times;
          </button>
          <div style={styles.prodBody}>
            <div style={styles.eyebrow}>{`Well averages · ${production.site}`}</div>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {['Well ID', 'Avg Oil (bbl)', 'Avg Gas (mcf)', 'Avg Water (bbl)', 'Avg BOE (bbl)'].map((h) => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {production.wells.map((w) => {
                    const isTop = HSE_ENRICHED[production.site]?.top_well === w.well;
                    const isWorst = EQUIP_STRESS[production.site]?.worst_well === w.well;
                    return (
                    <tr key={w.well} style={isWorst ? styles.worstRow : undefined}>
                      <td style={{ ...styles.td, fontWeight: isTop || isWorst ? 700 : 400 }}>
                        {isTop && <span title="Highest-incident well" style={styles.star}>&#9733; </span>}
                        {isWorst && <span title="Highest equipment stress" style={styles.wrench}>&#9888; </span>}
                        {w.well}
                      </td>
                      <td style={styles.td}>{w.oil}</td>
                      <td style={styles.td}>{w.gas}</td>
                      <td style={styles.td}>{w.water}</td>
                      <td style={styles.td}>{w.boe}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: { position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' },
  legend: {
    position: 'absolute', right: 24, top: 24, zIndex: 1000, background: '#fff',
    padding: '12px 16px', boxShadow: '0 1px 6px rgba(0,0,0,0.2)',
    fontFamily: 'system-ui, sans-serif', fontSize: 13, color: '#333',
  },
  siteLink: {
    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
    font: 'inherit', fontSize: 18, fontWeight: 600, color: '#1a73e8',
    textDecoration: 'underline',
  },
  wellLink: {
    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
    font: 'inherit', fontWeight: 700, color: '#1a73e8', textDecoration: 'underline',
  },
  stressBadge: {
    display: 'inline-block', padding: '1px 6px', borderRadius: 3, color: '#fff',
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4,
  },
  worstRow: { background: '#fff4ec' },
  wrench: { color: '#e8710a' },
  legendTitle: { fontWeight: 600, marginBottom: 8 },
  legendRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' },
  legendSwatch: { width: 12, height: 12, transform: 'rotate(45deg)', display: 'inline-block' },
  card: {
    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    width: 620, maxWidth: 'calc(100vw - 40px)', background: '#fff', zIndex: 1100,
    boxShadow: '0 10px 40px rgba(0,0,0,0.25)', fontFamily: 'system-ui, sans-serif',
    maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  cardBar: { height: 6 },
  close: {
    position: 'absolute', top: 10, right: 10, width: 36, height: 36, borderRadius: '50%',
    border: 'none', background: '#000', color: '#fff', fontSize: 20, lineHeight: '36px',
    textAlign: 'center', padding: 0, cursor: 'pointer', zIndex: 1,
  },
  cardBody: { padding: 32, overflow: 'auto', flex: 1, minHeight: 0, minWidth: 0 },
  eyebrow: {
    textTransform: 'uppercase', letterSpacing: 1, fontSize: 12, color: '#5f6368', fontWeight: 600,
  },
  title: { color: '#1a1a1a', fontWeight: 500, fontSize: 28, margin: '6px 0 20px' },
  stats: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, textAlign: 'center',
    borderTop: '1px solid #eee', borderBottom: '1px solid #eee', padding: '16px 0',
  },
  statValue: { fontSize: 18, fontWeight: 600, color: '#1a1a1a' },
  statLabel: {
    fontSize: 12, color: '#5f6368', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2,
  },
  riskPill: {
    marginTop: 20, padding: '10px 14px', borderRadius: 4, color: '#fff', fontSize: 14, lineHeight: 1.4,
  },
  detail: { marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, lineHeight: 1.4, textAlign: 'left' },
  detailRow: { display: 'flex', gap: 12, justifyContent: 'flex-start' },
  detailLabel: {
    flex: '0 0 96px', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 11,
    color: '#5f6368', fontWeight: 600, paddingTop: 1,
  },
  detailValue: { color: '#1a1a1a', flex: 1, textAlign: 'left' },
  detailExample: { display: 'block', marginTop: 3, color: '#5f6368', fontSize: 12, textAlign: 'left' },
  star: { color: '#f4b400' },
  prodCard: { width: 'min(860px, 92vw)', maxWidth: '92vw' },
  prodBody: { padding: 16, overflow: 'hidden', flex: 1, minHeight: 0, minWidth: 0, width: '100%', display: 'flex', flexDirection: 'column' },
  tableWrap: { marginTop: 12, flex: 1, minHeight: 0, minWidth: 0, width: '100%', overflow: 'auto', border: '1px solid #eee' },
  table: { borderCollapse: 'collapse', fontSize: 11, width: '100%' },
  th: {
    position: 'sticky', top: 0, background: '#f5f5f5', textAlign: 'left',
    padding: '3px 5px', borderBottom: '1px solid #ddd', whiteSpace: 'nowrap',
  },
  td: { padding: '1px 5px', borderBottom: '1px solid #f0f0f0', whiteSpace: 'nowrap' },
};
