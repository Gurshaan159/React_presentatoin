import Q1DeclineChart from './Q1DeclineChart.jsx';
import Q2EfficiencyChart from './Q2EfficiencyChart.jsx';
import Q4EconomicsChart from './Q4EconomicsChart.jsx';
import Map from '../../Map.jsx';
import heroImage from '../../assets/exploration-and-drilling.jpg';
import hseImage from '../../assets/hse-rig-incident.jpg';
import ronielleImg from '../../assets/ronielle-maranan.webp';
import syedImg from '../../assets/syed-aariz.jpg';
import gurshannImg from '../../assets/gurshann-thukral.webp';
import diamondImg from '../../assets/diamond-taylor.jpg';

/** Article header + byline. */
export const article = {
  kicker: { publisher: 'ConocoPhillips', desk: 'Estacado Analytics' },
  headline: 'Should ConocoPhillips Absorb Estacado Energy’s Wells?',
  dek: 'We rebuilt the portfolio from a year of production, sensor, safety, and cost data to see which of the 40 wells are worth keeping and what the deal would take.',
  byline: {
    authors: 'Team Three',
    date: 'August 2026',
    readTime: '8 min read',
  },
  hero: {
    src: heroImage,
    width: 1600,
    height: 1066,
    alt: 'An offshore oil and gas drilling and production platform standing in open water under a clear sky.',
    caption: 'Drilling and production infrastructure. The Estacado wells are onshore Permian, but the keep, sell, or plug calculus is the same.',
  },
};

/** Editorial lede — set in larger type than the body. */
export const lede = [
  'ConocoPhillips can fold in Estacado Energy: 40 producing and shut-in wells across eight Permian sites, plus the pads, gathering lines, and monitoring hardware. What the package is worth comes down to how a handful of wells are handled.',
  'We rebuilt the portfolio from twelve months of allocated production, wellhead sensor logs, the site safety record, and well-by-well economics. Five questions decide whether the deal is worth doing.',
];

/**
 * The five article sections. `Visual` is the section's chart / table / map
 * component (each reads its own committed data file under src/Data).
 * `railLabel` is the short title shown in the "In this piece" side rail.
 */
export const questions = [
  {
    id: 'q1',
    number: '01',
    railLabel: 'The producers',
    // FINDING: output concentrated in 4 wells at S05 + W0028; ~12-13%/yr decline.
    subhead: 'The portfolio leans on four wells — and they all share a fence line',
    leadIn: 'Where the production comes from, and how fast it fades.',
    Visual: Q1DeclineChart,
    caption:
      'Recorded monthly rate (solid) vs. fitted hyperbolic Arps forecast (dashed), five highest producers. Four sit at Wolfcamp North (S05); W0028 is at Midland Central (S03).',
    analysis: [
      'The table ranks the portfolio’s leading wells by their recent BOE contribution, while the graph follows those same wells from recorded production into the five-year decline forecast. Read together, they show which wells support the portfolio today and how long that production is expected to remain material.',
    ],
  },
  {
    id: 'q2',
    number: '02',
    railLabel: 'The measurement',
    // METRIC: BOE per *active* well (normalizes for site size), then weighted by IoT
    // in-spec share so unverifiable volume is discounted. Wind-down sites (S04/S06) excluded.
    subhead: 'Estacado’s best-producing site is also its least-measured',
    leadIn: 'Output per well only counts if the meters behind it can be trusted.',
    Visual: Q2EfficiencyChart,
    caption:
      'BOE per active well by site, raw and weighted by IoT sensor reliability. Wolfcamp North’s lead narrows once measurement quality is priced in.',
    analysis: [
      'We score a site on BOE per active well, not total output. Total output only reflects how many wells a site has, so dividing by the active amount of wells allows us to really see which sites are efficient producers with the active wells that they have.',
      'That figure leans heavily on sensor data. When a site’s wellhead sensors drift out of spec, its volume is estimated rather than measured, so a strong number can just mean bad instruments. By weighting each site on the share of its readings that are in-spec, we filter down to the barrels we can actually verify and get an efficiency score that holds up.',
      'Odessa Yard and Delaware Flats sit at the bottom of the chart, but its mainly because most of their wells are shut in; with their only wells not being great performers.',
    ],
  },
  {
    id: 'q3',
    number: '03',
    railLabel: 'The safety record',
    // FINDING: HSE incidents concentrate at S05 Wolfcamp North (66 of 145) and W0001 at S04;
    // S03 Midland Central, the investment target, is nearly clean (2).
    subhead: 'The safety problem and the production are the same wells',
    image: {
      src: hseImage,
      width: 1536,
      height: 1024,
      alt: 'An offshore drilling rig ablaze and listing into the sea, with a large plume of black smoke.',
      caption: 'A rig fire and partial collapse. Catastrophic HSE events are rare, but they are the tail risk the site screen exists to catch before it gets there.',
    },
    leadIn: 'Which sites carry the safety risk, and which operational signals move with it.',
    Visual: Map,
    caption:
      'The eight Estacado sites across the Permian Basin, coloured by HSE risk band. Click a site for its incident record, root causes, and per-well production.',
    analysis: [
      'The wells generating the production are the wells generating the incidents. W0037, W0010, W0017 and W0019 at Wolfcamp North each log 11–19 recorded incidents — uncontrolled releases, an H2S hospitalization, repeated flare-permit breaches — with W0001 at Odessa Yard a second outlier: 14 incidents against almost no output.',
      'Severity tracks with high wellhead pressure (~7,300 psi vs. ~6,500 elsewhere), equipment vibration, and weak monitoring — an integrity-and-instrumentation problem, not a crew problem, which means capital can fix it.',
    ],
  },
  {
    id: 'q4',
    number: '04',
    railLabel: 'What to shed',
    // FINDING: Monte Carlo bottom 5 = W0001, W0015, W0024, W0016, W0025.
    subhead: 'Five wells cost too much per barrel and are unlikely to turn a profit',
    leadIn:
      'The cost screen and 10,000 simulated price paths point to the same decommission list.',
    Visual: Q4EconomicsChart,
    caption:
      'The first graph compares operating cost with five-year forecast BOE; the simulation below estimates each well’s probability of producing a positive five-year profit.',
    analysis: [
      'Decommission the five bottom-ranked wells. The earlier graph shows that their forecast production is too small to absorb their operating costs, leaving them with the portfolio’s highest operating cost per expected barrel.',
      'The Monte Carlo results confirm that weakness across a wide range of future price conditions. These wells repeatedly fail to generate a positive return, so continued operation is not economically justified.',
    ],
  },
  {
    id: 'q5',
    number: '05',
    railLabel: 'Where to invest',
    // FINDING (scripts/q5_investment.py): tier-1 S03 infill = best ROI ($16/BOE, clean HSE).
    // Focused recommendations: W0020 offset drilling/safety, W0033 workover,
    // and W0037 safety remediation before further drilling.
    subhead: 'The upside is a drilling program at Midland Central',
    bullets: true,
    analysis: [
      {
        point: 'W0020 · Wolfcamp North',
        reasons: [
          'Its five-year forecast of approximately 1.49 million BOE, one of the highest in the portfolio, indicates strong remaining reservoir potential.',
          'That remaining potential makes W0020 a strong candidate for offset drilling.',
          'W0020 also has the second-highest HSE incident count in the portfolio, making safety investment a priority.',
          'Reducing incidents would protect workers and limit downtime at one of the portfolio’s highest-value wells.',
        ],
      },
      {
        point: 'W0033 · Andrews Legacy',
        reasons: [
          'Expected annual production is about 112.6 kBOE, but reliability-adjusted production is only about 98.0 kBOE.',
          'Its IoT reliability score of 0.870 creates a recoverable production gap of roughly 14.6 kBOE per year.',
          'Operating cost remains moderate relative to the portfolio, so unusually high day-to-day costs are not the underlying problem.',
          'Meaningful recoverable production and a manageable cost profile make W0033 a clear workover candidate.',
        ],
      },
      {
        point: 'W0037 · Wolfcamp North',
        reasons: [
          'W0037 has the largest recorded HSE incident count in the portfolio, so investment should begin with improving safety performance.',
          'If safety standards improve and incident risk falls, the well can become a candidate for future offset drilling.',
        ],
      },
    ],
  },
];

/** Closing verdict. `callout` spans render in the accent colour. */
export const verdict = {
  number: '06',
  railLabel: 'The verdict',
  subhead: 'The Verdict',
  paragraphs: [
    {
      text: 'ConocoPhillips should acquire Estacado, but the deal should prioritize the wells that can sustain production and address the concentrated safety and reliability risk at Wolfcamp North.',
    },
    {
      callout: 'Decommission W0001, W0015, W0024, W0016 and W0025.',
      after:
        ' The cost-per-BOE and Monte Carlo screens agree that these wells are unlikely to justify continued operation. Direct new capital toward W0020’s offset-drilling potential and safety needs, and use a targeted workover to recover W0033’s reliability-constrained production.',
    },
  ],
};

/**
 * The team behind the analysis — shown in the masthead between the dek and the
 * byline. Per person: `name`, `affiliation` (school · major), and `image`
 * (optional imported asset / URL for a photo; without it the card shows an
 * initials monogram, or an explicit `initials` override).
 */
export const authors = {
  heading: 'Our colleges and majors',
  people: [
    {
      name: 'Ronielle Maranan',
      image: ronielleImg,
      affiliation: 'University of Houston · Computer Science',
    },
    {
      name: 'Syed Aariz',
      image: syedImg,
      affiliation: 'University of Houston · Computer Science',
    },
    {
      name: 'Gurshann Thukral',
      image: gurshannImg,
      affiliation: 'Purdue University · Computer Science',
    },
    {
      name: 'Diamond Taylor',
      image: diamondImg,
      affiliation: 'Prairie View A&M University · Management Information Systems',
    },
  ],
};
