import { C } from "../../data/colors.js";
import { RADIUS, SHADOW } from "../../data/design.js";

/**
 * Neutral / tinted / dark card primitive.
 *
 * Props:
 *  - tint: optional hex (typically a player color). When provided, renders
 *    the accent treatment (gradient wash + thin ring + tinted shadow).
 *  - dark: when true, renders the dark-section card variant
 *    (C.darkSoft background with white text).
 *  - padding: number | string, default 20.
 *  - style: style overrides spread last.
 *  - children.
 */
export default function Card({
  tint,
  dark,
  padding = 20,
  style,
  children,
  ...rest
}) {
  const base = {
    borderRadius: RADIUS.lg,
    padding,
    boxShadow: SHADOW.card,
    boxSizing: "border-box",
  };

  let variant;
  if (dark) {
    variant = { background: C.darkSoft, color: C.white };
  } else if (tint) {
    variant = {
      background: `linear-gradient(170deg, ${C.white} 0%, ${tint}08 100%)`,
      border: `1px solid ${tint}25`,
      boxShadow: `0 4px 20px ${tint}15`,
    };
  } else {
    variant = { background: C.white };
  }

  return (
    <div style={{ ...base, ...variant, ...style }} {...rest}>
      {children}
    </div>
  );
}
