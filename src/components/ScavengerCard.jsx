import { C } from "../data/colors.js";
import { RADIUS, SHADOW, MICRO_LABEL } from "../data/design.js";

const DIFFICULTY_COLOR = { easy: C.green, medium: C.gold, wild: C.coralDeep };
const MEDAL = { 1: "🥇", 2: "🥈" };

export default function ScavengerCard({ item, mine, onTap }) {
  const status = !mine ? "unfound"
    : mine.status === "disputed" ? "rejected"
    : mine.status === "pendingReview" ? "rejected"
    : "found";
  const stripe = DIFFICULTY_COLOR[item.difficulty];
  const points = mine?.points ?? item.points;
  const medal = mine?.scavengerRank && MEDAL[mine.scavengerRank];

  return (
    <button
      type="button"
      onClick={() => onTap(item)}
      style={{
        position: "relative",
        background: C.white,
        border: 0,
        borderRadius: RADIUS.lg,
        padding: "14px 12px",
        boxShadow: SHADOW.card,
        textAlign: "center",
        cursor: "pointer",
        opacity: status === "rejected" ? 0.55 : 1,
        filter: status === "rejected" ? "grayscale(80%)" : "none",
        borderTop: `2px solid ${stripe}`,
      }}
    >
      {status === "found" && mine.photoUrl ? (
        <div style={{
          width: 56, height: 56, margin: "0 auto 8px",
          borderRadius: RADIUS.md, overflow: "hidden",
          background: C.sand,
        }}>
          <img src={mine.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      ) : (
        <div style={{ fontSize: 36, marginBottom: 8 }}>{item.icon}</div>
      )}

      <div style={{
        fontFamily: "Nunito, sans-serif", fontWeight: 800,
        fontSize: 12, color: C.dark, lineHeight: 1.2,
      }}>
        {item.name}
      </div>

      <div style={{ marginTop: 6 }}>
        <span style={{
          ...MICRO_LABEL,
          background: status === "found" ? C.green : `${stripe}15`,
          color: status === "found" ? C.white : stripe,
          padding: "2px 8px", borderRadius: RADIUS.pill,
        }}>
          {status === "found" ? `+${points}` : `${item.points}pt`}
        </span>
      </div>

      {medal && (
        <span style={{
          position: "absolute", top: -8, right: -8, fontSize: 24,
        }}>{medal}</span>
      )}

    </button>
  );
}
