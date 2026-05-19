import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { useGameState } from "../lib/useGameState.js";
import { C } from "../data/colors.js";
import { MICRO_LABEL } from "../data/design.js";
import Card from "./primitives/Card.jsx";

function formatTime(ms) {
  const d = new Date(ms);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function TodaysClaims() {
  const session = useSession();
  const token = session?.token;
  const mySlug = session?.slug;
  const { currentDailyKey } = useGameState();
  const recent = useQuery(
    api.leaderboard.getRecentActivity,
    token ? { limit: 100, token } : "skip",
  ) ?? [];

  const mineToday = recent
    .filter((e) => e.subjectSlug === mySlug && e.dailyKey === currentDailyKey)
    .sort((a, b) => b.createdAt - a.createdAt);

  const [open, setOpen] = useState(mineToday.length > 0);

  const total = mineToday.reduce(
    (sum, e) => (e.status === "disputed" ? sum : sum + e.points),
    0,
  );

  return (
    <Card padding={14} style={{ marginBottom: 16 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          background: "transparent", border: 0, padding: 0, cursor: "pointer",
        }}
      >
        <span style={{ ...MICRO_LABEL, color: C.gold }}>Today's claims</span>
        <span style={{
          fontFamily: "'Dela Gothic One', sans-serif", fontSize: 18,
          color: total >= 0 ? C.green : C.coralDeep,
        }}>
          {total >= 0 ? "+" : ""}{total}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{
          fontFamily: "Nunito, sans-serif", fontSize: 12, color: C.textBody,
        }}>
          {mineToday.length} claim{mineToday.length === 1 ? "" : "s"}
        </span>
        <span style={{ color: C.textBody }}>{open ? "▴" : "▾"}</span>
      </button>

      {open && mineToday.length > 0 && (
        <ul style={{
          listStyle: "none", padding: 0, margin: "12px 0 0",
          display: "flex", flexDirection: "column", gap: 6,
        }}>
          {mineToday.map((e) => (
            <li key={e._id} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 0", borderTop: `1px solid ${C.sandDark}`,
              fontFamily: "Nunito, sans-serif", fontSize: 13,
              opacity: e.status === "disputed" ? 0.5 : 1,
              textDecoration: e.status === "disputed" ? "line-through" : "none",
            }}>
              <span style={{ color: C.textBody, fontSize: 11, minWidth: 48 }}>
                {formatTime(e.createdAt)}
              </span>
              <span style={{ flex: 1 }}>
                {e.type === "challenge"
                  ? (e.challengeId ?? "challenge")
                  : `foul: ${e.negativeId ?? ""}`}
              </span>
              <strong style={{
                color: e.points >= 0 ? C.green : C.coralDeep,
              }}>
                {e.points >= 0 ? "+" : ""}{e.points}
              </strong>
              {e.status === "verified" && <span>🛡</span>}
            </li>
          ))}
        </ul>
      )}

      {open && mineToday.length === 0 && (
        <div style={{
          marginTop: 10, fontFamily: "Nunito, sans-serif", fontSize: 13,
          color: C.textBody,
        }}>
          Nothing tagged yet today. Tap a challenge below.
        </div>
      )}
    </Card>
  );
}
