import { C } from "../data/colors.js";

// Matches the home-page eyebrow + title pattern pixel-for-pixel.
export default function SectionHeader({
  label,
  title,
  tagline,
  accent,
  onDark = false,
  compact = false,
}) {
  const titleColor = onDark ? C.white : C.dark;
  const taglineColor = onDark ? "rgba(255,255,255,0.7)" : C.textBody;

  return (
    <div
      style={{
        textAlign: "center",
        marginBottom: compact ? 24 : 40,
        padding: "0 24px",
      }}
    >
      {label && (
        <div
          style={{
            fontFamily: "Nunito, sans-serif",
            fontWeight: 900,
            fontSize: 11,
            color: accent || C.turquoise,
            letterSpacing: 3,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          {label}
        </div>
      )}
      <h2
        style={{
          fontFamily: "'Dela Gothic One', sans-serif",
          fontSize: compact
            ? "clamp(22px, 5vw, 32px)"
            : "clamp(28px, 7vw, 48px)",
          color: titleColor,
          margin: 0,
          lineHeight: 1.1,
        }}
      >
        {title}
      </h2>
      {tagline && (
        <div
          style={{
            fontFamily: "Nunito, sans-serif",
            fontSize: 15,
            color: taglineColor,
            marginTop: 10,
            maxWidth: 620,
            margin: "10px auto 0",
          }}
        >
          {tagline}
        </div>
      )}
    </div>
  );
}
