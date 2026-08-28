import { Q3HseRiskChart, Q5InvestmentTable } from './vizSlots.jsx';
import Q1DeclineChart from './Q1DeclineChart.jsx';
import Q2EfficiencyChart from './Q2EfficiencyChart.jsx';
import Q4EconomicsChart from './Q4EconomicsChart.jsx';
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
 * The five article sections. `Visual` is the component slot for that section's
 * chart or table — a marked placeholder in vizSlots.jsx until it is built.
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
    // FINDING: HSE severity concentrated in the same S05 wells + W0001; correlates with high pressure, vibration, low sensor reliability.
    subhead: 'The safety problem and the production are the same wells',
    image: {
      src: hseImage,
      width: 1536,
      height: 1024,
      alt: 'An offshore drilling rig ablaze and listing into the sea, with a large plume of black smoke.',
      caption: 'A rig fire and partial collapse. Catastrophic HSE events are rare, but they are the tail risk the site screen exists to catch before it gets there.',
    },
    leadIn: 'Which sites carry the safety risk, and which operational signals move with it.',
    Visual: Q3HseRiskChart,
    caption:
      'Cumulative HSE incident severity by well against wellhead pressure and sensor reliability. The high-severity cluster is the high-pressure Wolfcamp completions at S05.',
    analysis: [
      'The wells generating the production are the wells generating the incidents. W0037, W0010, W0017 and W0019 at Wolfcamp North each log 11–19 recorded incidents — uncontrolled releases, an H2S hospitalization, repeated flare-permit breaches — with W0001 at Odessa Yard a second outlier: 14 incidents against almost no output.',
      'Severity tracks with high wellhead pressure (~7,300 psi vs. ~6,500 elsewhere), equipment vibration, and weak monitoring — an integrity-and-instrumentation problem, not a crew problem, which means capital can fix it.',
    ],
  },
  {
    id: 'q4',
    number: '04',
    railLabel: 'What to shed',
    // FINDING (scripts/finance.py): 50/50 blend of 5yr-forecast BOE + mean operating cost,
    // min-max normalized. Bottom 5 = W0040, W0035, W0018, W0009, W0030.
    subhead: 'Five wells that are neither cheap enough nor productive enough to keep',
    leadIn:
      'Safety and margin set aside: five-year forecast volume against cost to run.',
    Visual: Q4EconomicsChart,
    caption:
      'Each well’s five-year forecast BOE against mean monthly operating cost, normalized 0–1 and blended 50/50 into the well score below. The five lowest are flagged; 30 of 40 wells are scored, the rest shut-in with no operating history.',
    analysis: [
      'W0040, W0009 and W0018 are flagged for thin forecast volume — under 360,000 BOE over five years — and W0035 and W0030 for cost: they still produce 650,000–720,000 BOE but run $18,500–$20,000 a month, near the top of the field.',
      'The big producers (W0037, W0020, W0019) score only mid-pack because they are also the most expensive to operate; the cheapest wells (W0001, W0024) are nearly dead on volume. The shortlist is the wells caught between — real cost, unremarkable output, no case for fresh capital.',
    ],
  },
  {
    id: 'q5',
    number: '05',
    railLabel: 'Where to invest',
    // FINDING: S03 infill drilling best ROI ($16/boe, clean HSE); S01/S08 lift upgrades marginal; S05 gated on HSE.
    subhead: 'The upside is a drilling program at Midland Central',
    leadIn: 'Where new capital earns the most, and where it is currently blocked.',
    Visual: Q5InvestmentTable,
    caption:
      'Investment tiers by well: intervention type, incremental BOE, cost of supply, and whether an HSE gate applies.',
    analysis: [
      'Offset and infill drilling at Midland Central is the clearest return: W0028, W0039, W0007, W0006 and W0014 pair high rates and clean safety records with ~74 percent margins and a $16-per-barrel cost of supply, the lowest in the portfolio.',
      'A second tier of artificial-lift and water-shutoff work at Estacado Ridge and Alamo Sunset pays out on thinner ~8 percent margins. Wolfcamp North stays off the list — the upside is real but cannot be underwritten until the section 03 safety remediation is funded.',
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
