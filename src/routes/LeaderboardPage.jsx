import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useGameState } from "../lib/useGameState.js";
import { PLAYERS } from "../data/players.js";
import { C } from "../data/colors.js";
import EntryRow from "../components/EntryRow.jsx";
import { useSession } from "../lib/useSession.js";
import { useHolidayNameMap, displayName } from "../lib/displayName.js";
import FoulModal from "../components/FoulModal.jsx";
import BottomNav from "../components/BottomNav.jsx";
import RevealFlow from "../components/RevealFlow.jsx";

function playerBySlug(slug) {
  return PLAYERS.find((p) => p.slug === slug);
}

function BoardRow({ row, rank, onFoul, holidayMap }) {
  const p = playerBySlug(row.slug);
  const name = displayName(row.slug, holidayMap, row.slug);
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
      <div style={{ flex: 1, fontWeight: 600 }}>{name}</div>
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
      {onFoul && (
        <button
          type="button"
          onClick={() => onFoul({ slug: row.slug, name })}
          title="Log a foul"
          style={{
            padding: "4px 8px", marginLeft: 4, fontSize: 12,
            borderRadius: 6, border: 0, background: C.coralDeep, color: C.white,
            cursor: "pointer",
          }}
        >
          Foul
        </button>
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState("daily");
  const [foulTarget, setFoulTarget] = useState(null);
  const { currentDailyKey, currentDayNumber, gamesLive } = useGameState();
  const session = useSession();
  const lastClosedDay = currentDayNumber > 1 ? currentDayNumber - 1 : null;
  const lastClosed = useQuery(
    api.rollovers.get,
    lastClosedDay ? { dayNumber: lastClosedDay } : "skip"
  );
  const allRollovers = useQuery(api.rollovers.listAll, {}) ?? [];
  const pendingReveal = lastClosed && lastClosed.loserSlug && !lastClosed.forfeitId;
  const history = allRollovers
    .filter((r) => r.loserSlug && r.forfeitId)
    .sort((a, b) => b.dayNumber - a.dayNumber);
  const loggedIn = !!session;
  const handleFoul = session?.slug ? setFoulTarget : null;
  const activity = useQuery(
    api.leaderboard.getRecentActivity,
    session?.token ? { limit: 12, token: session.token } : { limit: 12 }
  ) ?? [];
  const daily = useQuery(api.leaderboard.getDaily, { dailyKey: currentDailyKey }) ?? [];
  const holiday = useQuery(api.leaderboard.getHoliday, {}) ?? [];
  const rows = tab === "daily" ? daily : holiday;
  const holidayMap = useHolidayNameMap();

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
      <h1 style={{ margin: 0 }}>Leaderboard</h1>
      <div style={{ color: C.textBody, margin: "4px 0 16px" }}>
        {gamesLive ? `Day ${currentDayNumber}` : "Games not live yet"}
      </div>

      {!loggedIn && (
        <div style={{
          padding: 12, background: C.sand, borderRadius: 8,
          fontSize: 13, color: C.textBody, marginBottom: 12, textAlign: "center",
        }}>
          Log in to see activity, vouches, and forfeit history.
        </div>
      )}

      {loggedIn && pendingReveal && lastClosed && (
        <RevealFlow rollover={lastClosed} />
      )}

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
          rows.map((row, i) => (
            <BoardRow
              key={row.slug}
              row={row}
              rank={i + 1}
              onFoul={handleFoul && row.slug !== session?.slug ? handleFoul : null}
              holidayMap={holidayMap}
            />
          ))
        )}
      </div>

      {loggedIn && (
        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 18 }}>Recent activity</h2>
          <div style={{ background: C.white, borderRadius: 12, overflow: "hidden" }}>
            {activity.length === 0
              ? <div style={{ padding: 20, textAlign: "center", color: C.textBody }}>Nothing yet</div>
              : activity.map((e) => <EntryRow key={e._id} entry={e} />)}
          </div>
        </section>
      )}

      {foulTarget && (
        <FoulModal
          targetSlug={foulTarget.slug}
          targetName={foulTarget.name}
          onClose={() => setFoulTarget(null)}
        />
      )}

      {loggedIn && history.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 18 }}>Punishment history</h2>
          <div style={{ background: C.white, borderRadius: 12, overflow: "hidden" }}>
            {history.map((r) => {
              const player = PLAYERS.find((p) => p.slug === r.loserSlug);
              return (
                <div key={r._id} style={{ padding: 10, borderBottom: `1px solid ${C.sandDark}`, display: "flex", justifyContent: "space-between" }}>
                  <span>Day {r.dayNumber} — {player?.name ?? r.loserSlug}</span>
                  <strong>{r.forfeitLabel}</strong>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <BottomNav />
    </main>
  );
}
