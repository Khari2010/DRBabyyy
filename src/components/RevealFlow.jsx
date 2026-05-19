import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { FORFEITS } from "../data/forfeits.js";
import { PLAYERS } from "../data/players.js";
import WheelOfFortune from "./games/WheelOfFortune.jsx";
import { C } from "../data/colors.js";
import { useHolidayNameMap, displayName } from "../lib/displayName.js";

function DeductPicker({ loserSlug, rolloverId }) {
  const session = useSession();
  const token = session?.token;
  const apply = useMutation(api.entries.applyForfeitDeduct);
  const [picked, setPicked] = useState(null);
  const [done, setDone] = useState(false);
  const targets = PLAYERS.filter((p) => p.slug !== loserSlug);
  const holidayMap = useHolidayNameMap();
  const nameOf = (slug) => displayName(slug, holidayMap);

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
    return <div style={{ padding: 16 }}>{nameOf(loserSlug)} deducted 50 from {nameOf(picked)}.</div>;
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
              border: `1px solid ${C.sandDark}`,
              cursor: picked !== null ? "default" : "pointer",
            }}
          >
            {p.emoji} {nameOf(p.slug)}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function RevealFlow({ rollover }) {
  const session = useSession();
  const token = session?.token;
  const board = useQuery(api.leaderboard.getDaily, { dailyKey: rollover.dailyKey }) ?? [];
  const recordForfeit = useMutation(api.rollovers.recordForfeit);
  const holidayMap = useHolidayNameMap();
  const nameOf = (slug) => displayName(slug, holidayMap);
  const [stage, setStage] = useState(1);

  const onSpinResult = async (f) => {
    if (!token) return;
    try {
      await recordForfeit({
        token, rolloverId: rollover._id, forfeitId: f.id, forfeitLabel: f.label,
      });
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <section style={{
      background: C.white, borderRadius: 16, padding: 16,
      margin: "16px 0", border: `2px solid ${C.coralDeep}`,
    }}>
      {stage === 1 && (
        <div style={{ textAlign: "center" }}>
          <h2 style={{ marginTop: 0 }}>✨ Day {rollover.dayNumber} — Closed</h2>
          <div style={{ margin: "12px 0", color: C.textBody }}>
            Players scored: {board.length}
            {board.length > 0 && (
              <>
                <br />
                Most verified: {nameOf(
                  board.slice().sort((a, b) => b.verifiedCount - a.verifiedCount)[0].slug
                )}
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setStage(2)}
            style={{
              padding: 12, borderRadius: 8, background: C.dark, color: C.white,
              border: 0, fontWeight: 700, cursor: "pointer",
            }}
          >
            Reveal scores ▼
          </button>
        </div>
      )}

      {stage === 2 && (
        <div>
          <h3 style={{ textAlign: "center", marginTop: 0 }}>Daily Scoreboard</h3>
          <div style={{ background: C.sand, borderRadius: 8, overflow: "hidden" }}>
            {board.map((row, i) => (
              <div
                key={row.slug}
                style={{
                  padding: 10, borderBottom: `1px solid ${C.sandDark}`,
                  display: "flex", justifyContent: "space-between",
                  animation: `revealRow 0.4s ${i * 0.4}s both`,
                  background: row.slug === rollover.loserSlug ? C.coral : "transparent",
                  color: row.slug === rollover.loserSlug ? C.white : C.dark,
                }}
              >
                <span>{i + 1}. {nameOf(row.slug)}</span>
                <span>{row.total >= 0 ? "+" : ""}{row.total}</span>
              </div>
            ))}
          </div>
          <style>{`@keyframes revealRow { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>
          <p style={{ textAlign: "center", marginTop: 12 }}>
            <strong>{nameOf(rollover.loserSlug)}</strong> — spin the wheel.
          </p>
          <div style={{ textAlign: "center" }}>
            <button
              type="button"
              onClick={() => setStage(3)}
              style={{
                padding: 12, borderRadius: 8, background: C.coralDeep, color: C.white,
                border: 0, fontWeight: 700, cursor: "pointer",
              }}
            >
              Open the wheel ▶
            </button>
          </div>
        </div>
      )}

      {stage === 3 && (
        <div style={{ textAlign: "center" }}>
          <h3>{nameOf(rollover.loserSlug)}, your fate:</h3>
          {rollover.forfeitId === "deduct" ? (
            <DeductPicker loserSlug={rollover.loserSlug} rolloverId={rollover._id} />
          ) : rollover.forfeitId ? (
            <div>
              <div style={{ fontSize: 32, margin: 16 }}>
                {FORFEITS.find((f) => f.id === rollover.forfeitId)?.icon}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{rollover.forfeitLabel}</div>
            </div>
          ) : (
            <WheelOfFortune onResult={onSpinResult} />
          )}
        </div>
      )}
    </section>
  );
}
