/**
 * Shared palette + design tokens for the Estacado Analytics article.
 *
 * Two-colour branding runs through the whole report:
 *   blue  (#004C97) = ConocoPhillips — structural/default: wordmark, section
 *                     numerals, dividers, headings, quick-nav default state.
 *   accent          = Estacado — used deliberately, not decoratively: the
 *                     "Estacado Analytics" kicker text, the active quick-nav
 *                     indicator, and the conclusion's plug/divest callouts.
 * Inside data visualisations use the semantic viz* colours instead.
 *
 * Every component imports from here rather than re-declaring hex values.
 */

export const palette = {
  // ConocoPhillips blue — structural/default throughout the report.
  blue: '#004C97',
  blueMid: '#023A73',
  blueDeep: '#03284D',
  ink: '#0A1626',

  // Estacado accent — masthead tag, active quick-nav item, synthesis callouts.
  accent: '#D64000',
  accentHover: '#B83600',

  // Neutrals
  white: '#FFFFFF',
  charcoal: '#1C1F26', // body text — deliberately not pure black
  slate: '#4A5160', // secondary / supporting text
  mute: '#8B93A1', // report-header metadata, footnotes
  grayBg: '#F5F6F8', // section dividers and card backgrounds
  grayBorder: '#E2E5EA', // hairline rules
  blueWash: '#EEF3FA', // very light blue band — synthesis section only

  // Semantic colours for use INSIDE data visualisations only (charts, tables,
  // maps) — deliberately NOT the ConocoPhillips/Estacado brand pairing, so the
  // visuals stay legible independent of the branding story.
  vizKeep: '#004C97', // invest / keep
  vizSell: '#B45309', // amber — sell / divest
  vizDecommission: '#9A3412', // muted rust-red — decommission / plug
  vizSeries2: '#0F8A5F', // second categorical series (teal) — validated vs. vizKeep
};

export const typography = {
  // Body / UI — humanist sans, set large for an unhurried article read.
  sans: "'Inter', 'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif",
  // Headline / dek / subheads — editorial serif.
  serif: "Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Times New Roman', serif",
  // Numerals / margin markers.
  mono: "ui-monospace, 'SF Mono', 'SFMono-Regular', Menlo, Consolas, monospace",

  // Editorial type scale.
  scale: {
    kicker: '0.78rem',
    headline: 'clamp(2rem, 5.5vw, 3.4rem)',
    dek: 'clamp(1.1rem, 2.3vw, 1.4rem)',
    byline: '0.85rem',
    lede: 'clamp(1.15rem, 2vw, 1.3rem)',
    subhead: 'clamp(1.35rem, 3vw, 1.95rem)',
    body: '1.1875rem', // ~19px
    caption: '0.82rem',
    marker: '0.8rem',
  },
  leading: {
    body: 1.7,
    heading: 1.18,
  },
  measure: '74ch', // article prose measure
};

export const radius = {
  sm: '4px',
  md: '8px',
  lg: '16px',
};

export const shadow = {
  card: '0 1px 2px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 24, 40, 0.10)',
  cardHover:
    '0 14px 30px rgba(0, 76, 151, 0.16), 0 6px 12px rgba(16, 24, 40, 0.10)',
};

export const theme = { palette, typography, radius, shadow };

/**
 * CSS custom properties for the tokens above. Spread onto a component's root
 * `style` prop so its CSS module can reference `var(--est-blue)` etc. without
 * duplicating any hex value.
 */
export const themeCssVars = {
  '--est-blue': palette.blue,
  '--est-blue-mid': palette.blueMid,
  '--est-blue-deep': palette.blueDeep,
  '--est-ink': palette.ink,
  '--est-accent': palette.accent,
  '--est-accent-hover': palette.accentHover,
  '--est-white': palette.white,
  '--est-charcoal': palette.charcoal,
  '--est-slate': palette.slate,
  '--est-mute': palette.mute,
  '--est-gray-bg': palette.grayBg,
  '--est-gray-border': palette.grayBorder,
  '--est-blue-wash': palette.blueWash,
  '--est-viz-keep': palette.vizKeep,
  '--est-viz-sell': palette.vizSell,
  '--est-viz-decommission': palette.vizDecommission,
  '--est-viz-series-2': palette.vizSeries2,
  '--est-font-sans': typography.sans,
  '--est-font-serif': typography.serif,
  '--est-font-mono': typography.mono,
  '--est-type-kicker': typography.scale.kicker,
  '--est-type-headline': typography.scale.headline,
  '--est-type-dek': typography.scale.dek,
  '--est-type-byline': typography.scale.byline,
  '--est-type-lede': typography.scale.lede,
  '--est-type-subhead': typography.scale.subhead,
  '--est-type-body': typography.scale.body,
  '--est-type-caption': typography.scale.caption,
  '--est-type-marker': typography.scale.marker,
  '--est-leading-body': String(typography.leading.body),
  '--est-leading-heading': String(typography.leading.heading),
  '--est-measure': typography.measure,
  '--est-radius-sm': radius.sm,
  '--est-radius-md': radius.md,
  '--est-radius-lg': radius.lg,
  '--est-shadow-card': shadow.card,
  '--est-shadow-card-hover': shadow.cardHover,
};

export default theme;
