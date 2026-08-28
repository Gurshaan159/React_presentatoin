import {
  Q1DeclineChart,
  Q3HseRiskChart,
  Q4DecommissionTable,
  Q5InvestmentTable,
} from './vizSlots.jsx';
import Q2EfficiencyChart from './Q2EfficiencyChart.jsx';

/** Article header + byline. */
export const article = {
  kicker: { publisher: 'ConocoPhillips', desk: 'Estacado Analytics' },
  headline: 'Should ConocoPhillips Absorb Estacado Energy’s Wells?',
  dek: 'We rebuilt the portfolio from a year of production, sensor, safety, and cost data to see which of the 40 wells are worth keeping — and what the deal would take.',
  byline: {
    authors: 'Team Estacado',
    date: 'August 2026',
    readTime: '8 min read',
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
      'Daily rate for the five highest-producing wells, with fitted decline projected five years out. Four of the five sit at Wolfcamp North (S05).',
    analysis: [
      'The output is strikingly top-heavy. W0019, W0037, W0020 and W0010 — all at Wolfcamp North — plus W0028 at Midland Central each produce between roughly 950 and 1,075 BOE per day, and together they carry a disproportionate share of total volume.',
      'The decline math is reassuring on its own terms: about 12 to 13 percent a year for the Wolfcamp North wells, which leaves them holding more than half their current rate in five years. The risk is not the curve, it is the address. Four of the five best wells share one site, so a single outage or safety stand-down at S05 takes most of the portfolio’s cash flow with it.',
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
    // FINDING: W0001 plug outright; 4 S05 wells plug-vs-remediate; W0020/W0015/W0033/W0027 divest.
    subhead: 'One well is finished; four more should change hands',
    leadIn:
      'Some wells cost more to run than they will ever return. We screened for the ones ConocoPhillips should not keep.',
    Visual: Q4DecommissionTable,
    caption:
      'Decommission and divestment screen: recommendation against margin, water cut, lifting cost, and incident severity.',
    analysis: [
      'One well is unambiguously done. W0001 runs a negative 96 percent margin at 97 percent water cut and a $142-per-barrel lifting cost, and no workover changes that — it should be plugged.',
      'The four high-rate Wolfcamp North wells are the harder call: genuinely profitable at around 67 percent margins, but the screen holds them for a plug-versus-remediate decision rather than business as usual. A further four — W0020, W0015, W0033 and W0027 — screen as divestment candidates, worth more to a smaller operator than the remediation and compliance liability they carry inside a major.',
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
      callout: 'Plug W0001, and move W0020, W0015, W0033 and W0027 to divestment',
      after:
        ' — that clears the negative-margin tail and the highest-liability barrels. Fund the drilling program at Midland Central and the lift upgrades at Estacado Ridge and Alamo Sunset to raise portfolio output at the lowest available cost. And treat the Wolfcamp North integrity and instrumentation upgrade as a condition of closing, not a later phase.',
    },
    {
      text: 'Done in that order, the acquisition raises production per dollar of operating cost, pulls the portfolio’s compliance risk down by fixing it where it actually sits, and extends the productive life of the wells that matter. Absorbing Estacado is the right call — provided ConocoPhillips buys the problem at S05 with its eyes open.',
    },
  ],
};
