import { C } from "../data/colors.js";
import { RADIUS } from "../data/design.js";

export default function DaySummaryCard({ dayNumber, hasLoser, onReveal }) {
  return (
    <div style={{
      background: C.dark,
      color: C.white,
      borderRadius: RADIUS.md,
      padding: "16px 18px",
      marginBottom: 16,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      <div style={{
        fontFamily: "Nunito, sans-serif",
        fontWeight: 900,
        fontSize: 11,
        letterSpacing: 3,
        textTransform: "uppercase",
        opacity: 0.8,
      }}>
        ✨ Day {dayNumber} — closed
      </div>
      <div style={{
        fontFamily: "Nunito, sans-serif",
        fontSize: 14,
        opacity: 0.9,
      }}>
        {hasLoser
          ? "The crew is gathered. Tap to reveal the punishment."
          : "No claims today — no loser, no wheel."}
      </div>
      {hasLoser && (
        <button
          type="button"
          onClick={onReveal}
          style={{
            marginTop: 4,
            padding: "12px 20px",
            borderRadius: RADIUS.md,
            background: C.coralDeep,
            color: C.white,
            border: 0,
            fontFamily: "Nunito, sans-serif",
            fontWeight: 800,
            fontSize: 14,
            cursor: "pointer",
            alignSelf: "flex-start",
          }}
        >
          🎰 Reveal punishment ▶
        </button>
      )}
    </div>
  );
}
