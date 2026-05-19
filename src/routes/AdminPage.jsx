import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { useGameState } from "../lib/useGameState.js";
import { C } from "../data/colors.js";
import BottomNav from "../components/BottomNav.jsx";
import ProposedRow from "../components/ProposedRow.jsx";

export default function AdminPage() {
  const session = useSession();
  const token = session?.token;
  const navigate = useNavigate();
  const isAdmin = useQuery(api.admin.isAdmin, token ? { token } : "skip");
  const state = useGameState();
  const trigger = useMutation(api.rollovers.trigger);
  const undoLast = useMutation(api.rollovers.undoLast);
  const resetGame = useMutation(api.admin.resetGame);

  const allSuggestions = useQuery(api.suggestions.list, {}) ?? [];
  const proposed = allSuggestions.filter((s) => s.status === "proposed");
  const voting = allSuggestions.filter((s) => s.status === "voting");

  if (!token) {
    return <div style={{ padding: 24 }}>Please log in first.</div>;
  }
  if (isAdmin === undefined) return <div style={{ padding: 24 }}>Loading…</div>;
  if (isAdmin === false) return <div style={{ padding: 24 }}>Admins only. Nice try.</div>;

  const handleRollover = async () => {
    const label = state.gamesLive
      ? `Lock Day ${state.currentDayNumber}, reveal the loser, and start Day ${state.currentDayNumber + 1}?`
      : "Start the games (Day 1)?";
    if (!window.confirm(label)) return;
    const wasLive = state.gamesLive;
    const closingDay = state.currentDayNumber;
    try {
      await trigger({ token });
      if (wasLive) navigate(`/punishment-reveal?day=${closingDay}`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUndo = async () => {
    if (!window.confirm("Undo the last rollover? This deletes the most recent rollover row.")) return;
    try {
      await undoLast({ token });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("⚠️ WIPE all entries, vouches, rollovers, suggestions, and reset to pre-trip. Use this to clear practice data before the real games start. Continue?")) return;
    try {
      await resetGame({ token });
      alert("Practice data wiped. Game state is now pre-trip.");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
      <h1>Admin Console</h1>

      <section style={{ padding: 16, background: C.white, borderRadius: 12, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Game state</h3>
        <div>Status: {state.gamesLive ? `● LIVE (Day ${state.currentDayNumber})` : "○ Pre-trip"}</div>
        <button
          type="button"
          onClick={handleRollover}
          style={{
            marginTop: 12, padding: 12, width: "100%", borderRadius: 8,
            background: C.green, color: C.white, border: 0, fontWeight: 700, cursor: "pointer",
          }}
        >
          {state.gamesLive
            ? `Trigger rollover → Day ${state.currentDayNumber + 1}`
            : "Start the games"}
        </button>
      </section>

      <section style={{ padding: 16, background: C.white, borderRadius: 12, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Suggestions awaiting draft ({proposed.length})</h3>
        {proposed.length === 0 ? (
          <div style={{ fontSize: 13, color: C.textBody }}>No new suggestions.</div>
        ) : (
          proposed.map((s) => <ProposedRow key={s._id} suggestion={s} isAdmin={true} />)
        )}
        {voting.length > 0 && (
          <>
            <h3 style={{ marginTop: 16 }}>Currently voting ({voting.length})</h3>
            {voting.map((s) => (
              <div key={s._id} style={{ padding: 8, fontSize: 13 }}>
                {s.title} — {s.points} pts · 👍 {s.yesCount} 👎 {s.noCount}
              </div>
            ))}
          </>
        )}
      </section>

      <section style={{ padding: 16, background: C.white, borderRadius: 12 }}>
        <h3 style={{ marginTop: 0 }}>Edge actions</h3>
        <button
          type="button"
          onClick={handleUndo}
          style={{
            padding: 10, width: "100%", borderRadius: 8,
            border: `1px solid ${C.coralDeep}`, color: C.coralDeep, background: "transparent",
            cursor: "pointer",
          }}
        >
          Undo last rollover
        </button>
        <button
          type="button"
          onClick={handleReset}
          style={{
            marginTop: 8, padding: 10, width: "100%", borderRadius: 8,
            border: `2px solid ${C.coralDeep}`, color: C.coralDeep, background: "transparent",
            fontWeight: 700, cursor: "pointer",
          }}
        >
          ⚠️ Reset practice data
        </button>
      </section>
      <BottomNav />
    </main>
  );
}
