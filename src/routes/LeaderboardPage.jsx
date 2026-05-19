import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useGameState } from "../lib/useGameState.js";
import { PLAYERS } from "../data/players.js";
import { C } from "../data/colors.js";

function playerBySlug(slug) {
  return PLAYERS.find((p) => p.slug === slug);
}

function BoardRow({ row, rank }) {
  const p = playerBySlug(row.slug);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
      borderBottom: `1px solid ${C.sandDark}`,
    }}>
      <div style={{ width: 28, textAlign: "right", color: C.textBody }}>{rank}.</div>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        background: p?.color ?? C.sand,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 700, color: C.white,
      }}>
        {p?.emoji ?? "?"}
      </div>
      <div style={{ flex: 1, fontWeight: 600 }}>{p?.name ?? row.slug}</div>
      <div style={{ fontSize: 12, color: C.textBody }}>
        {row.claimCount} claims · {row.verifiedCount} 🛡
      </div>
      <div style={{
        fontWeight: 700,
        color: row.total >= 0 ? C.green : C.coralDeep,
        minWidth: 60, textAlign: "right",
      }}>
        {row.total >= 0 ? "+" : ""}{row.total}
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState("daily");
  const { currentDailyKey, currentDayNumber, gamesLive } = useGameState();
  const daily = useQuery(api.leaderboard.getDaily, { dailyKey: currentDailyKey }) ?? [];
  const holiday = useQuery(api.leaderboard.getHoliday, {}) ?? [];
  const rows = tab === "daily" ? daily : holiday;

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
      <h1 style={{ margin: 0 }}>Leaderboard</h1>
      <div style={{ color: C.textBody, margin: "4px 0 16px" }}>
        {gamesLive ? `Day ${currentDayNumber}` : "Games not live yet"}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {[["daily", "Today"], ["holiday", "Holiday"]].map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            style={{
              flex: 1, padding: 10, borderRadius: 8,
              background: tab === k ? C.dark : "transparent",
              color: tab === k ? C.white : C.dark,
              border: `1px solid ${C.dark}`,
              cursor: "pointer", fontWeight: 600,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ background: C.white, borderRadius: 12, overflow: "hidden" }}>
        {rows.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: C.textBody }}>
            No claims yet
          </div>
        ) : (
          rows.map((row, i) => <BoardRow key={row.slug} row={row} rank={i + 1} />)
        )}
      </div>
    </main>
  );
}
