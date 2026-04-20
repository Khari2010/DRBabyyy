import { C } from "../data/colors.js";

export default function SectionHeader({ label, title, tagline, accent = C.dark }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px 16px" }}>
      {label && (
        <div
          style={{
            display: "inline-block",
            fontFamily: "Nunito, sans-serif",
            fontWeight: 900,
            fontSize: 10,
            color: C.white,
            background: accent,
            padding: "4px 14px",
            borderRadius: 10,
            letterSpacing: 2,
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          {label}
        </div>
      )}
      <h2
        style={{
          fontFamily: "'Dela Gothic One', sans-serif",
          fontSize: "clamp(24px, 6vw, 34px)",
          margin: 0,
          color: C.dark,
          lineHeight: 1.15,
        }}
      >
        {title}
      </h2>
      {tagline && (
        <div
          style={{
            marginTop: 6,
            fontFamily: "Nunito, sans-serif",
            fontSize: 14,
            color: C.textBody,
          }}
        >
          {tagline}
        </div>
      )}
    </div>
  );
}
