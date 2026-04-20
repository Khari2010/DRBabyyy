import { C } from "../../data/colors.js";

/**
 * Circular avatar primitive. Renders the player's image when present,
 * otherwise falls back to their emoji.
 *
 * Props:
 *  - player: { name, avatar, emoji, color }
 *  - size: "sm" | "md" | "lg" | "hero" (default "md")
 *  - style: style overrides spread last.
 */
const SIZES = {
  sm: { px: 24, border: "none", shadow: (color) => `0 0 0 2px ${color}` },
  md: { px: 32, border: "none", shadow: (color) => `0 0 0 2px ${color}` },
  lg: { px: 56, border: "none", shadow: (color) => `0 0 0 2px ${color}` },
  hero: {
    px: 150,
    border: (color) => `4px solid ${color}`,
    shadow: (color) => `0 8px 24px ${color}40, 0 0 0 6px ${C.white}`,
  },
};

export default function Avatar({ player, size = "md", style }) {
  const spec = SIZES[size] ?? SIZES.md;
  const borderStyle =
    typeof spec.border === "function" ? spec.border(player.color) : spec.border;

  return (
    <div
      style={{
        width: spec.px,
        height: spec.px,
        borderRadius: "50%",
        overflow: "hidden",
        background: C.white,
        flexShrink: 0,
        border: borderStyle === "none" ? "none" : borderStyle,
        boxShadow: spec.shadow(player.color),
        ...style,
      }}
    >
      {player.avatar ? (
        <img
          src={player.avatar}
          alt={player.name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 15%",
          }}
        />
      ) : (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            fontSize: spec.px * 0.5,
          }}
        >
          {player.emoji}
        </span>
      )}
    </div>
  );
}
