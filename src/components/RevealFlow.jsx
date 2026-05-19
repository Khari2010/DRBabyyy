import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { FORFEITS } from "../data/forfeits.js";
import { PLAYERS } from "../data/players.js";
import WheelOfFortune from "./games/WheelOfFortune.jsx";
import { C } from "../data/colors.js";
import { RADIUS, HEADING, BODY, MICRO_LABEL } from "../data/design.js";
import { useHolidayNameMap, displayName } from "../lib/displayName.js";
import Card from "./primitives/Card.jsx";
import Avatar from "./primitives/Avatar.jsx";

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
    return (
      <div style={{ ...BODY, padding: 16 }}>
        {nameOf(loserSlug)} deducted 50 from {nameOf(picked)}.
      </div>
    );
  }
  return (
    <div>
      <h3 style={{ ...HEADING.h3, marginBottom: 12, color: C.dark }}>
        📉 Pick someone to lose 50 points
      </h3>
      <div style={{ display: "grid", gap: 8 }}>
        {targets.map((p) => (
          <button
            key={p.slug}
            type="button"
            disabled={picked !== null}
            onClick={() => submit(p.slug)}
            style={{
              padding: "10px 14px",
              borderRadius: RADIUS.md,
              background: C.sand,
              border: `1.5px solid ${C.sandDark}`,
              cursor: picked !== null ? "default" : "pointer",
              fontFamily: "Nunito, sans-serif",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: C.dark,
            }}
          >
            <Avatar player={p} size="sm" />
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

  const loserPlayer = PLAYERS.find((p) => p.slug === rollover.loserSlug);

  return (
    <Card
      style={{
        margin: "16px 0",
        border: `2px solid ${C.coralDeep}`,
      }}
      padding={20}
    >
      {stage === 1 && (
        <div style={{ textAlign: "center" }}>
          <h2
            style={{
              ...HEADING.h2,
              marginTop: 0,
              color: C.dark,
            }}
          >
            ✨ Day {rollover.dayNumber} — Closed
          </h2>
          <div style={{ ...BODY, margin: "12px 0" }}>
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
              padding: "12px 20px",
              borderRadius: RADIUS.md,
              background: C.dark,
              color: C.white,
              border: 0,
              fontFamily: "Nunito, sans-serif",
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Reveal scores ▼
          </button>
        </div>
      )}

      {stage === 2 && (
        <div>
          <h3
            style={{
              ...HEADING.h3,
              textAlign: "center",
              marginTop: 0,
              color: C.dark,
            }}
          >
            Daily Scoreboard
          </h3>
          <div style={{ background: C.sand, borderRadius: RADIUS.sm, overflow: "hidden" }}>
            {board.map((row, i) => {
              const rowPlayer = PLAYERS.find((p) => p.slug === row.slug);
              const isLoser = row.slug === rollover.loserSlug;
              return (
                <div
                  key={row.slug}
                  style={{
                    padding: "10px 14px",
                    borderBottom: `1px solid ${C.sandDark}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    animation: `revealRow 0.4s ${i * 0.4}s both`,
                    background: isLoser ? C.coral : "transparent",
                    color: isLoser ? C.white : C.dark,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ ...MICRO_LABEL, color: isLoser ? C.white : C.textBody }}>
                      {i + 1}
                    </span>
                    {rowPlayer && (
                      <Avatar player={rowPlayer} size="sm" />
                    )}
                    <span style={{ fontFamily: "Nunito, sans-serif", fontSize: 14 }}>
                      {nameOf(row.slug)}
                    </span>
                  </span>
                  <span style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 14 }}>
                    {row.total >= 0 ? "+" : ""}{row.total}
                  </span>
                </div>
              );
            })}
          </div>
          <style>{`@keyframes revealRow { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>
          <p style={{ ...BODY, textAlign: "center", marginTop: 12 }}>
            <strong>{nameOf(rollover.loserSlug)}</strong> — spin the wheel.
          </p>
          <div style={{ textAlign: "center" }}>
            <button
              type="button"
              onClick={() => setStage(3)}
              style={{
                padding: "12px 20px",
                borderRadius: RADIUS.md,
                background: C.coralDeep,
                color: C.white,
                border: 0,
                fontFamily: "Nunito, sans-serif",
                fontWeight: 800,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Open the wheel ▶
            </button>
          </div>
        </div>
      )}

      {stage === 3 && (
        <div style={{ textAlign: "center" }}>
          <h3
            style={{
              ...HEADING.h3,
              color: C.dark,
              marginBottom: 16,
            }}
          >
            {nameOf(rollover.loserSlug)}, your fate:
          </h3>
          {rollover.forfeitId === "deduct" ? (
            <DeductPicker loserSlug={rollover.loserSlug} rolloverId={rollover._id} />
          ) : rollover.forfeitId ? (
            <div>
              <div style={{ fontSize: 40, margin: 16 }}>
                {FORFEITS.find((f) => f.id === rollover.forfeitId)?.icon}
              </div>
              <div
                style={{
                  fontFamily: "'Dela Gothic One', sans-serif",
                  fontSize: "clamp(18px, 4vw, 24px)",
                  color: C.dark,
                }}
              >
                {rollover.forfeitLabel}
              </div>
            </div>
          ) : (
            <WheelOfFortune onResult={onSpinResult} />
          )}
        </div>
      )}
    </Card>
  );
}
