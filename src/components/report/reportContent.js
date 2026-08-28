import Q1DeclineChart from './Q1DeclineChart.jsx';
import Q2EfficiencyChart from './Q2EfficiencyChart.jsx';
import Q4EconomicsChart from './Q4EconomicsChart.jsx';
import Map from '../../Map.jsx';
import heroImage from '../../assets/exploration-and-drilling.jpg';
import hseImage from '../../assets/hse-rig-incident.jpg';

/** Article header + byline. */
export const article = {
  kicker: { publisher: 'ConocoPhillips', desk: 'Estacado Analytics' },
  headline: 'Should ConocoPhillips Absorb Estacado Energy’s Wells?',
  dek: 'We rebuilt the portfolio from a year of production, sensor, safety, and cost data to see which of the 40 wells are worth keeping and what the deal would take.',
  byline: {
    authors: 'Team Estacado',
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
      'Five wells carry most of the portfolio: W0019, W0037, W0020 and W0010 at Wolfcamp North, plus W0028 at Midland Central, each producing 930–1,060 BOE/d. Decline is orderly — near 13 percent first-year for the S05 wells, 15 percent for W0028 — leaving the group at half to two-thirds of current rate in five years.',
      'The exposure is geographic, not the curve: four of the five best wells share one fence line, so a single outage or safety stand-down at S05 takes most of the cash flow with it.',
    ],
  },
  {
    id: 'q2',
    number: '02',
    railLabel: 'The measurement',
    // FINDING: S05 highest raw efficiency but worst IoT reliability (~77%); weighting closes gap; S04/S06 mostly idle.
    subhead: 'Estacado’s best-producing site is also its least-measured',
    leadIn: 'Output per well only counts if the meters behind it can be trusted.',
    Visual: Q2EfficiencyChart,
    caption:
      'BOE per active well by site, raw and weighted by IoT sensor reliability. Wolfcamp North’s lead narrows once measurement quality is priced in.',
    analysis: [
      'Raw, Wolfcamp North leads at ~384 MBOE per active well against Midland Central’s ~316 — but S05’s sensor reliability is the portfolio’s worst (~77 percent vs. 89–91 percent), so much of its reported volume is interpolated, not observed. Weighted for that, the gap closes to about four percent and Midland Central is the more dependable performer.',
      'Odessa Yard and Delaware Flats run 20–40 percent active, paying fixed cost against almost no production.',
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
    // The 3 compliance-capex picks (W0020/W0033/W0027) are all also on the sell list.
    subhead: 'The upside is a drilling program at Midland Central',
    bullets: true,
    analysis: [
      {
        point: 'W0020 · Wolfcamp North',
        reasons: [
          'One of the portfolio’s highest five-year BOE forecasts indicates strong remaining reservoir potential.',
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
        point: 'W0027 · Alamo Sunset',
        reasons: [
          '~416 BOE/d, 53% margin, ~$6.6M/yr.',
          'Water cut near 49% — inside the window where artificial lift still pays.',
          'A tank overfill and a pad spill on record; tank automation + level control fixes the recurring cause.',
          'Divests cleaner with no open spill history.',
        ],
      },
      {
        point: 'W0015 · Delaware Flats',
        reasons: [
          'Spend-to-exit, not growth — it loses money (−29% margin, 97% water cut, 44%/yr decline).',
          'Both screens say sell or plug.',
          'Two off-pad produced-water releases are the liability.',
          'A water-handling workover with secondary containment clears it, so the well divests without a plugging obligation.',
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
      text: 'Yes — ConocoPhillips should absorb Estacado, but the deal is only worth what the buyer will do about one site. Production is durable, Midland Central’s cost of supply is among the basin’s best, and the safety exposure, while serious, is concentrated and mechanical rather than diffuse.',
    },
    {
      text: 'The program is specific. ',
      callout: 'Sell or plug the five flagged wells — W0040, W0035, W0018, W0009 and W0030',
      after:
        ' — real operating cost without the output or upside to justify it. Fund the Midland Central drilling program and the lift upgrades at Estacado Ridge and Alamo Sunset. Treat the Wolfcamp North integrity and instrumentation upgrade as a condition of closing, not a later phase.',
    },
    {
      text: 'In that order, the acquisition raises production per dollar of operating cost, pulls compliance risk down by fixing it where it sits, and extends the life of the wells that matter — provided ConocoPhillips buys the problem at S05 with its eyes open.',
    },
  ],
};

/**
 * The team behind the analysis — shown in the masthead between the dek and the
 * byline. Per person: `image` (optional imported asset / URL for a photo;
 * without it the card shows an initials monogram), `initials` (optional, else
 * derived from `name`), `role`, `focus`. Replace the placeholder names.
 */
export const authors = {
  heading: 'The team',
  blurb: 'One lead per question, plus the data cleaning and joins that tie them together.',
  people: [
    {
      name: 'Your Name',
      role: 'Production & decline',
      focus:
        'Fitted the hyperbolic Arps decline curves and built the trailing-six-month producer ranking behind section 01.',
    },
    {
      name: 'Your Name',
      role: 'Efficiency & instrumentation',
      focus:
        'Weighted site output by IoT sensor reliability and traced the measurement gap at Wolfcamp North for section 02.',
    },
    {
      name: 'Your Name',
      role: 'HSE & incident analysis',
      focus:
        'Rolled up the incident record by well and site and found where severity actually concentrates for section 03.',
    },
    {
      name: 'Your Name',
      role: 'Economics & screens',
      focus:
        'Ran the decommission, divestment and investment screens and the cost-of-supply model behind sections 04 and 05.',
    },
  ],
};
