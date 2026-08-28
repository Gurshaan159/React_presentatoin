/**
 * Shared brand palette + design tokens for the Estacado Portfolio Intelligence app.
 *
 * The visual direction is inspired by ConocoPhillips corporate styling (deep
 * blue, red-orange accent, generous whitespace). This project is an independent
 * hackathon build: it uses none of ConocoPhillips's logo, photography, or
 * tagline, and is not affiliated with or endorsed by ConocoPhillips.
 *
 * Every screen in the app (the five question views) should import from here
 * instead of re-declaring hex codes.
 */

export const palette = {
  // Primary corporate blue — nav bar, primary buttons, headline accents, active states.
  blue: '#004C97',
  blueMid: '#023A73',
  blueDeep: '#03284D',
  // Near-black blue used as the far end of the hero gradient and for the footer.
  ink: '#0A1626',

  // Bold red-orange secondary accent — one strong CTA + small highlight details only.
  accent: '#D64000',
  accentHover: '#B83600',

  // Neutrals
  white: '#FFFFFF',
  charcoal: '#1C1F26', // body text — deliberately not pure black
  slate: '#4A5160', // secondary / supporting text
  grayBg: '#F5F6F8', // section dividers and card backgrounds
  grayBorder: '#E2E5EA',
};

export const typography = {
  sans: "'Inter', 'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif",
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
  '--est-gray-bg': palette.grayBg,
  '--est-gray-border': palette.grayBorder,
  '--est-font-sans': typography.sans,
  '--est-radius-sm': radius.sm,
  '--est-radius-md': radius.md,
  '--est-radius-lg': radius.lg,
  '--est-shadow-card': shadow.card,
  '--est-shadow-card-hover': shadow.cardHover,
};

export default theme;
