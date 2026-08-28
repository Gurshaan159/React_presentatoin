import { Q3HseRiskChart, Q5InvestmentTable } from './vizSlots.jsx';
import Q1DeclineChart from './Q1DeclineChart.jsx';
import Q2EfficiencyChart from './Q2EfficiencyChart.jsx';
import Q4DecommissionTable from './Q4DecommissionTable.jsx';
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
  'ConocoPhillips has a chance to fold in Estacado Energy: 40 producing and shut-in wells across eight sites in the Permian Basin, plus the pads, gathering lines, and monitoring hardware that come with them. On paper it is a clean bolt-on. In practice, what the package is worth comes down to how a handful of wells are handled.',
  'We spent this analysis reconstructing the portfolio from the ground up — twelve months of allocated production, wellhead sensor logs, the site safety record, and well-by-well economics. Five questions decide whether the acquisition is worth doing. Here is what the data told us.',
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
    leadIn:
      'Before anything else, we wanted to know where the production actually comes from, and how fast it fades.',
    Visual: Q1DeclineChart,
    caption:
      'Recorded monthly rate (solid) and the fitted hyperbolic Arps forecast (dashed) for the five highest-producing wells. Four of the five sit at Wolfcamp North (S05); W0028 is at Midland Central (S03).',
    analysis: [
      'The output is strikingly top-heavy. W0019, W0037, W0020 and W0010 — all at Wolfcamp North — plus W0028 at Midland Central are currently producing between roughly 930 and 1,060 BOE per day, and together they carry a disproportionate share of total volume.',
      'The decline is orderly: the fit puts first-year effective decline near 13 percent for the four Wolfcamp North wells and about 15 percent for W0028, which leaves the group holding somewhere between half and two-thirds of its current rate in five years. The risk is not the curve, it is the address. Four of the five best wells share one site, so a single outage or safety stand-down at S05 takes most of the portfolio’s cash flow with it.',
    ],
  },
  {
    id: 'q2',
    number: '02',
    railLabel: 'The measurement',
    // FINDING: S05 highest raw efficiency but worst IoT reliability (~77%); weighting closes gap; S04/S06 mostly idle.
    subhead: 'Estacado’s best-producing site is also its least-measured',
    leadIn:
      'High output per well only counts if you can trust the meters behind it. We weighted each site’s efficiency by how much of its data is measured rather than inferred.',
    Visual: Q2EfficiencyChart,
    caption:
      'BOE per active well by site, shown raw and after weighting by IoT sensor reliability. Wolfcamp North’s lead narrows once measurement quality is accounted for.',
    analysis: [
      'On raw numbers, Wolfcamp North looks like the standout at roughly 384 MBOE per active well, ahead of Midland Central at about 316. But S05’s sensor reliability is the worst in the portfolio — around 77 percent, against 89 to 91 percent everywhere else — so a real slice of its reported volume is interpolated, not observed.',
      'Once we weight for that, the gap between the two sites closes to about four percent, and Midland Central becomes the more dependable performer. At the other end of the table, Odessa Yard and Delaware Flats are running 20 to 40 percent active and paying fixed cost against almost no production.',
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
    leadIn:
      'We pulled every recorded incident and asked which sites carry the risk — and which operational signals move with it.',
    Visual: Q3HseRiskChart,
    caption:
      'Cumulative HSE incident severity by well against wellhead pressure and sensor reliability. The high-severity cluster is the high-pressure Wolfcamp completions at S05.',
    analysis: [
      'This is the uncomfortable finding: the wells generating the production are the wells generating the incidents. W0037, W0010, W0017 and W0019 at Wolfcamp North each log between 11 and 19 recorded incidents — uncontrolled releases, an H2S hospitalization, repeated flare-permit breaches — and W0001 at Odessa Yard is a second outlier, 14 incidents against almost no output.',
      'The variables that track with severity are consistent. These are the high-pressure completions, near 7,300 psi versus about 6,500 elsewhere; they show the most equipment vibration; and they have the weakest monitoring. We read that combination as an integrity-and-instrumentation problem rather than a crew problem — which means capital can fix it.',
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
      'This screen sets safety and margin aside and asks two things of each well: how much it will produce over the next five years, and what it costs to run. The wells that score worst on the blend are the divestment shortlist.',
    Visual: Q4DecommissionTable,
    caption:
      'Each well’s five-year forecast BOE and mean monthly operating cost, normalized 0–1 and blended 50/50. The five lowest scores are flagged; 30 of the 40 wells are scored, the rest being shut-in with no operating history.',
    analysis: [
      'The screen flags W0040, W0009 and W0018 for thin forecast volumes — each under 360,000 BOE over five years — and W0035 and W0030 for the opposite reason: they still produce respectably, roughly 650,000 to 720,000 BOE, but their operating costs run $18,500 to $20,000 a month, near the top of the field.',
      'What it does not flag is just as telling. The portfolio’s biggest producers — W0037, W0020, W0019 — score only mid-pack because they are also its most expensive wells to operate, and the cheapest wells to run, W0001 and W0024, are nearly dead on volume. A production-and-cost screen keeps W0001 because it is so cheap; a margin screen would plug it. The wells worth shedding here are the ones caught in between: real cost, unremarkable output, and no case for fresh capital.',
    ],
  },
  {
    id: 'q5',
    number: '05',
    railLabel: 'Where to invest',
    // FINDING: S03 infill drilling best ROI ($16/boe, clean HSE); S01/S08 lift upgrades marginal; S05 gated on HSE.
    subhead: 'The upside is a drilling program at Midland Central',
    leadIn:
      'Finally, we looked for where new capital earns the most — and where it is currently blocked.',
    Visual: Q5InvestmentTable,
    caption:
      'Investment tiers by well: intervention type, incremental BOE, cost of supply, and whether an HSE gate applies.',
    analysis: [
      'The clearest return is offset and infill drilling at Midland Central. W0028, W0039, W0007, W0006 and W0014 combine high current rates, clean safety records, roughly 74 percent margins, and a $16-per-barrel cost of supply — the lowest in the portfolio. This is where incremental capital compounds fastest.',
      'A second tier of artificial-lift and water-shutoff work at Estacado Ridge and Alamo Sunset pays out on thinner eight percent margins. We deliberately kept the Wolfcamp North wells off this list: the upside is real, but it cannot be underwritten until the safety remediation from section 03 is funded.',
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
      text: 'Yes — ConocoPhillips should absorb Estacado, but the deal is only worth what the buyer is willing to do about one site. The production is durable, the cost of supply at Midland Central is among the best in the basin, and the safety exposure, while serious, is concentrated and mechanical rather than diffuse.',
    },
    {
      text: 'The program that makes it work is specific. ',
      callout: 'Sell or plug the five wells the screen flags — W0040, W0035, W0018, W0009 and W0030',
      after:
        ' — wells that cost real money to run without the output or the upside to justify it. Fund the drilling program at Midland Central and the lift upgrades at Estacado Ridge and Alamo Sunset to raise portfolio output at the lowest available cost. And treat the Wolfcamp North integrity and instrumentation upgrade as a condition of closing, not a later phase.',
    },
    {
      text: 'Done in that order, the acquisition raises production per dollar of operating cost, pulls the portfolio’s compliance risk down by fixing it where it actually sits, and extends the productive life of the wells that matter. Absorbing Estacado is the right call — provided ConocoPhillips buys the problem at S05 with its eyes open.',
    },
  ],
};
