import { C } from "../data/colors.js";
import { RADIUS, SHADOW, MICRO_LABEL } from "../data/design.js";
import { PLAYERS } from "../data/players.js";
import Avatar from "./primitives/Avatar.jsx";

const DIFFICULTY_COLOR = { easy: C.green, medium: C.gold, wild: C.coralDeep };
const MEDAL = { 1: "🥇", 2: "🥈" };

function FindersStrip({ finders, mySlug }) {
  const others = (finders ?? []).filter((f) => f.subjectSlug !== mySlug).slice(0, 3);
  if (others.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 4, marginTop: 6, justifyContent: "center" }}>
      {others.map((f) => {
        const p = PLAYERS.find((pp) => pp.slug === f.subjectSlug);
        return p ? <Avatar key={f._id} player={p} size="sm" /> : null;
      })}
    </div>
  );
}

export default function ScavengerCard({ item, mine, finders, mySlug, onTap }) {
  const status = !mine ? "unfound"
    : mine.status === "disputed" ? "rejected"
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

      <FindersStrip finders={finders} mySlug={mySlug} />
    </button>
  );
}
