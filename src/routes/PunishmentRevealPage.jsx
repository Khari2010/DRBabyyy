import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { FORFEITS } from "../data/forfeits.js";
import { PLAYERS } from "../data/players.js";
import WheelOfFortune from "../components/games/WheelOfFortune.jsx";
import { C } from "../data/colors.js";

function nameOf(slug) {
  return PLAYERS.find((p) => p.slug === slug)?.name ?? slug;
}

function DeductPicker({ loserSlug }) {
  const session = useSession();
  const token = session?.token;
  const apply = useMutation(api.entries.applyForfeitDeduct);
  const [picked, setPicked] = useState(null);
  const [done, setDone] = useState(false);
  const targets = PLAYERS.filter((p) => p.slug !== loserSlug);

  const submit = async (slug) => {
    if (!token) { alert("Not logged in"); return; }
    setPicked(slug);
    try {
      await apply({ token, targetSlug: slug, amount: 50 });
      setDone(true);
    } catch (err) {
      alert(err.message);
      setPicked(null);
    }
  };

  if (done) {
    return (
      <div style={{ padding: 16 }}>
        {nameOf(loserSlug)} deducted 50 from {nameOf(picked)}.
      </div>
    );
  }
  return (
    <div>
      <h3>📉 Pick someone to lose 50 points</h3>
      <div style={{ display: "grid", gap: 8 }}>
        {targets.map((p) => (
          <button
            key={p.slug}
            type="button"
            disabled={picked !== null}
            onClick={() => submit(p.slug)}
            style={{
              padding: 10, borderRadius: 8, background: C.sand,
              border: `1px solid ${C.sandDark}`, cursor: picked !== null ? "default" : "pointer",
            }}
          >
            {p.emoji} {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PunishmentRevealPage() {
  const [params] = useSearchParams();
  const day = Number(params.get("day") ?? 0);
  const session = useSession();
  const token = session?.token;
  const rollover = useQuery(api.rollovers.get, { dayNumber: day });
  const board = useQuery(
    api.leaderboard.getDaily,
    rollover ? { dailyKey: rollover.dailyKey } : "skip",
  ) ?? [];
  const recordForfeit = useMutation(api.rollovers.recordForfeit);

  const [stage, setStage] = useState(1);

  if (rollover === undefined) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!rollover) return <div style={{ padding: 24 }}>No rollover for day {day}.</div>;

  // Day 1 kickoff variant — no loser, no wheel
  if (!rollover.loserSlug) {
    return (
      <main style={{ maxWidth: 480, margin: "0 auto", padding: 24, textAlign: "center" }}>
        <h1>🏝️ Games are LIVE</h1>
        <p style={{ color: C.textBody }}>Day 1 begins now. Start hunting points.</p>
      </main>
    );
  }

  const onSpinResult = async (f) => {
    if (!token) return;
    try {
      await recordForfeit({
        token,
        rolloverId: rollover._id,
        forfeitId: f.id,
        forfeitLabel: f.label,
      });
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
      {stage === 1 && (
        <section style={{ textAlign: "center", padding: 24 }}>
          <h1>✨ Day {day} — Closed ✨</h1>
          <div style={{ margin: "16px 0", color: C.textBody }}>
            Players scored: {board.length}
            <br />
            Most verified: {
              board.slice().sort((a, b) => b.verifiedCount - a.verifiedCount)[0]?.slug
                ? nameOf(board.slice().sort((a, b) => b.verifiedCount - a.verifiedCount)[0].slug)
                : "—"
            }
          </div>
          <button
            type="button"
            onClick={() => setStage(2)}
            style={{
              padding: 12, borderRadius: 8,
              background: C.dark, color: C.white, border: 0, fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reveal scores ▼
          </button>
        </section>
      )}

      {stage === 2 && (
        <section>
          <h2 style={{ textAlign: "center" }}>Daily Scoreboard</h2>
          <div style={{ background: C.white, borderRadius: 12, overflow: "hidden" }}>
            {board.map((row, i) => (
              <div
                key={row.slug}
                style={{
                  padding: 12, borderBottom: `1px solid ${C.sandDark}`,
                  display: "flex", justifyContent: "space-between",
                  animation: `fadeInRow 0.4s ${i * 0.4}s both`,
                  background: row.slug === rollover.loserSlug ? C.coral : C.white,
                  color: row.slug === rollover.loserSlug ? C.white : C.dark,
                }}
              >
                <span>{i + 1}. {nameOf(row.slug)}</span>
                <span>{row.total >= 0 ? "+" : ""}{row.total}</span>
              </div>
            ))}
          </div>
          <style>{`@keyframes fadeInRow { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>
          <p style={{ textAlign: "center", marginTop: 16 }}>
            <strong>{nameOf(rollover.loserSlug)}</strong> — spin the wheel.
          </p>
          <div style={{ textAlign: "center" }}>
            <button
              type="button"
              onClick={() => setStage(3)}
              style={{
                padding: 12, borderRadius: 8,
                background: C.coralDeep, color: C.white, border: 0, fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Open the wheel ▶
            </button>
          </div>
        </section>
      )}

      {stage === 3 && (
        <section style={{ textAlign: "center" }}>
          <h2>{nameOf(rollover.loserSlug)}, your fate:</h2>
          {rollover.forfeitId === "deduct" ? (
            <DeductPicker loserSlug={rollover.loserSlug} />
          ) : rollover.forfeitId ? (
            <div>
              <div style={{ fontSize: 32, margin: 16 }}>
                {FORFEITS.find((f) => f.id === rollover.forfeitId)?.icon}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{rollover.forfeitLabel}</div>
              <p style={{ marginTop: 16, color: C.textBody }}>
                {nameOf(rollover.loserSlug)} owes you all.
              </p>
            </div>
          ) : (
            <WheelOfFortune onResult={onSpinResult} />
          )}
        </section>
      )}
    </main>
  );
}
