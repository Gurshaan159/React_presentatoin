/**
 * Portfolio-level summary figures shown in the landing page stat strip.
 *
 * These are mock/placeholder values for the demo. They are intentionally kept
 * round and low-precision so nobody mistakes them for audited production
 * accounting. The real landing page receives this object as a prop; swap it for
 * values computed from the well, financial, and HSE datasets.
 */
export const portfolioSummary = {
  asOf: '2026-08-11',
  stats: [
    {
      id: 'wells',
      value: '48',
      label: 'Wells analyzed',
      detail: 'Active + shut-in across the Estacado acreage',
    },
    {
      id: 'boe',
      value: '~1.2M',
      label: 'Cumulative BOE modeled',
      detail: 'Trailing 12 months of allocated production',
    },
    {
      id: 'flagged',
      value: '6',
      label: 'Sites flagged for review',
      detail: 'Negative margin or elevated HSE exposure',
    },
    {
      id: 'reliability',
      value: '94%',
      label: 'Avg IoT sensor uptime',
      detail: 'Wellhead telemetry availability, fleet-wide',
    },
  ],
};

export default portfolioSummary;
