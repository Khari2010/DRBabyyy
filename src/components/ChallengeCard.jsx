// src/components/ChallengeCard.jsx
import { C } from "../data/colors.js";

const DIFFICULTY_COLOR = {
  easy: C.green,
  medium: C.gold,
  wild: C.coralDeep,
};

export default function ChallengeCard({ challenge, onClaim }) {
  return (
    <button
      type="button"
      onClick={() => onClaim(challenge)}
      style={{
        display: "flex",
        gap: 12,
        padding: 12,
        borderRadius: 12,
        border: `1px solid ${C.sandDark}`,
        background: C.white,
        textAlign: "left",
        cursor: "pointer",
        width: "100%",
      }}
    >
      <div style={{ fontSize: 28, lineHeight: 1 }}>{challenge.icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, color: C.dark }}>{challenge.title}</div>
        {challenge.bonus && (
          <div style={{ fontSize: 12, color: C.textBody, marginTop: 2 }}>
            Bonus: {challenge.bonus}
          </div>
        )}
      </div>
      <div
        style={{
          fontWeight: 700,
          color: DIFFICULTY_COLOR[challenge.difficulty] ?? C.dark,
          alignSelf: "center",
        }}
      >
        +{challenge.points}
      </div>
    </button>
  );
}
