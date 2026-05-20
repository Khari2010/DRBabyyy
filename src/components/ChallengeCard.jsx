import Card from "./primitives/Card.jsx";
import { C } from "../data/colors.js";

const DIFFICULTY_COLOR = {
  easy: C.green,
  medium: C.gold,
  wild: C.coralDeep,
};

const DIFFICULTY_LABEL = {
  easy: "Easy",
  medium: "Medium",
  wild: "Wild",
};

export default function ChallengeCard({ challenge, onClaim, done = false }) {
  const dColor = DIFFICULTY_COLOR[challenge.difficulty] ?? C.dark;
  return (
    <button
      type="button"
      data-claim="true"
      onClick={() => onClaim(challenge)}
      style={{
        all: "unset",
        display: "block",
        cursor: "pointer",
        width: "100%",
        opacity: done ? 0.5 : 1,
        transition: "opacity 0.2s ease",
      }}
    >
      <Card padding={14}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ fontSize: 28, lineHeight: 1, position: "relative" }}>
            {challenge.icon}
            {done && (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  right: -6,
                  bottom: -2,
                  fontSize: 11,
                  background: C.green,
                  color: C.white,
                  borderRadius: 999,
                  width: 18,
                  height: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 1,
                  fontWeight: 900,
                }}
              >
                ✓
              </span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "'Dela Gothic One', sans-serif",
              fontSize: 16,
              color: C.dark,
              lineHeight: 1.2,
              textDecoration: done ? "line-through" : "none",
              textDecorationThickness: "2px",
              textDecorationColor: C.sandDark,
            }}>
              {challenge.title}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              <span
                style={{
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 800,
                  fontSize: 10,
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                  color: dColor,
                  background: `${dColor}18`,
                  borderRadius: 999,
                  padding: "2px 8px",
                }}
              >
                {DIFFICULTY_LABEL[challenge.difficulty] ?? "—"}
              </span>
              {challenge.category && (
                <span
                  style={{
                    fontFamily: "Nunito, sans-serif",
                    fontWeight: 700,
                    fontSize: 10,
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    color: C.textBody,
                    background: "rgba(0,0,0,0.04)",
                    borderRadius: 999,
                    padding: "2px 8px",
                  }}
                >
                  {challenge.category}
                </span>
              )}
              {challenge.bonus && (
                <span style={{
                  fontFamily: "Nunito, sans-serif",
                  fontSize: 11,
                  color: C.textBody,
                }}>
                  Bonus: {challenge.bonus}
                </span>
              )}
            </div>
          </div>
          <div style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: 22,
            color: dColor,
            flexShrink: 0,
          }}>
            +{challenge.points}
          </div>
        </div>
      </Card>
    </button>
  );
}
