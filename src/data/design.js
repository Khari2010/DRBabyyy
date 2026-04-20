import { C } from "./colors.js";

// Design tokens. Import these into components instead of inlining raw values
// so the /styleguide route is the single source of truth for radii, shadows,
// spacing, and typography scale.

export const RADIUS = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 24,
  pill: 999,
};

export const SHADOW = {
  card: "0 2px 12px rgba(0,0,0,0.04)",
  cardHover: "0 8px 28px rgba(0,0,0,0.08)",
  floating: "0 4px 12px rgba(0,0,0,0.15)",
  dramatic: "0 16px 48px rgba(0,0,0,0.18)",
};

export const SECTION = {
  pad: "80px 0 60px",
  padCompact: "60px 0 40px",
  innerPad: "0 24px",
  maxWidthNarrow: 720,
  maxWidthDefault: 960,
  maxWidthWide: 1100,
};

export const EYEBROW = {
  fontFamily: "Nunito, sans-serif",
  fontWeight: 900,
  fontSize: 11,
  letterSpacing: 3,
  textTransform: "uppercase",
};

export const HEADING = {
  h1: {
    fontFamily: "'Dela Gothic One', sans-serif",
    fontSize: "clamp(52px, 14vw, 110px)",
    lineHeight: 0.9,
  },
  h2: {
    fontFamily: "'Dela Gothic One', sans-serif",
    fontSize: "clamp(28px, 7vw, 48px)",
    lineHeight: 1.1,
  },
  h3: {
    fontFamily: "'Dela Gothic One', sans-serif",
    fontSize: "clamp(20px, 4vw, 28px)",
    lineHeight: 1.2,
  },
};

export const BODY = {
  fontFamily: "Nunito, sans-serif",
  fontSize: 15,
  lineHeight: 1.6,
  color: C.textBody,
};

export const MICRO_LABEL = {
  fontFamily: "Nunito, sans-serif",
  fontWeight: 800,
  fontSize: 11,
  letterSpacing: 0.5,
  textTransform: "uppercase",
};

export const SECTION_ACCENTS = {
  about: C.turquoise,
  adventures: C.coralDeep,
  itinerary: C.coral,
  game: C.gold,
  crew: C.blue,
};
