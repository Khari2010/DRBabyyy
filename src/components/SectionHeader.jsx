import { C } from "../data/colors.js";

export default function SectionHeader({ label, title, tagline, accent = C.coral }) {
  return (
    <div style={{ textAlign: "center", padding: "56px 20px 12px", maxWidth: 760, margin: "0 auto" }}>
      {label && (
        <div
          style={{
            fontFamily: "Nunito, sans-serif",
            fontWeight: 900,
            fontSize: 13,
            color: accent,
            letterSpacing: 3,
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          {label}
        </div>
      )}
      <h2
        style={{
          fontFamily: "'Dela Gothic One', sans-serif",
          fontSize: "clamp(36px, 8vw, 72px)",
          margin: 0,
          color: C.dark,
          lineHeight: 1.05,
        }}
      >
        {title}
      </h2>
      {tagline && (
        <div
          style={{
            marginTop: 14,
            fontFamily: "Nunito, sans-serif",
            fontSize: "clamp(15px, 1.6vw, 18px)",
            color: C.textBody,
            fontWeight: 600,
            lineHeight: 1.55,
            maxWidth: 620,
            margin: "14px auto 0",
          }}
        >
          {tagline}
        </div>
      )}
    </div>
  );
}
