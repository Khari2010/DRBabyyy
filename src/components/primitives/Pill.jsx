import { C } from "../../data/colors.js";
import { RADIUS } from "../../data/design.js";

/**
 * Interactive pill button (or static span when as="span").
 *
 * Props:
 *  - active: boolean
 *  - accent: hex to use as the active background (default C.coral).
 *  - onClick
 *  - children
 *  - style
 *  - as: "button" | "span" — default "button".
 */
export default function Pill({
  active,
  accent = C.coral,
  onClick,
  children,
  style,
  as = "button",
  ...rest
}) {
  const Component = as;
  return (
    <Component
      onClick={onClick}
      style={{
        background: active ? accent : "rgba(0,0,0,0.04)",
        color: active ? C.white : C.textBody,
        border: "none",
        borderRadius: RADIUS.pill,
        padding: "6px 14px",
        fontFamily: "Nunito, sans-serif",
        fontWeight: 800,
        fontSize: 11,
        letterSpacing: 0.5,
        cursor: onClick ? "pointer" : "default",
        whiteSpace: "nowrap",
        transition: "all 0.3s ease",
        ...style,
      }}
      {...rest}
    >
      {children}
    </Component>
  );
}
