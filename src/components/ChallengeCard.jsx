// src/components/ChallengeCard.jsx
import Card from "./primitives/Card.jsx";
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
      style={{ all: "unset", display: "block", cursor: "pointer", width: "100%" }}
    >
      <Card padding={14}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ fontSize: 28, lineHeight: 1 }}>{challenge.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "'Dela Gothic One', sans-serif",
              fontSize: 16,
              color: C.dark,
              lineHeight: 1.2,
            }}>
              {challenge.title}
            </div>
            {challenge.bonus && (
              <div style={{
                fontFamily: "Nunito, sans-serif",
                fontSize: 12,
                color: C.textBody,
                marginTop: 4,
              }}>
                Bonus: {challenge.bonus}
              </div>
            )}
          </div>
          <div style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: 22,
            color: DIFFICULTY_COLOR[challenge.difficulty] ?? C.dark,
            flexShrink: 0,
          }}>
            +{challenge.points}
          </div>
        </div>
      </Card>
    </button>
  );
}
