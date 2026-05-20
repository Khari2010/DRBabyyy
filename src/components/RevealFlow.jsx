import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { PLAYERS } from "../data/players.js";
import WheelOfFortune from "./games/WheelOfFortune.jsx";
import DailyScavengerReveal from "./DailyScavengerReveal.jsx";
import { isDailyScavengerActive } from "../data/dailyScavenger.js";
import { C } from "../data/colors.js";
import { RADIUS, HEADING, BODY, MICRO_LABEL } from "../data/design.js";
import { useHolidayNameMap, displayName } from "../lib/displayName.js";
import Card from "./primitives/Card.jsx";
import Avatar from "./primitives/Avatar.jsx";

function DeductPicker({ loserSlug, rolloverId, onComplete }) {
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
      <div>
        <div style={{ ...BODY, padding: 16 }}>
          {nameOf(loserSlug)} deducted 50 from {nameOf(picked)}.
        </div>
        <button
          type="button"
          onClick={onComplete}
          style={{
            marginTop: 12,
            padding: "10px 18px",
            borderRadius: RADIUS.md,
            background: C.gold,
            color: C.dark,
            border: 0,
            fontFamily: "Nunito, sans-serif",
            fontWeight: 800,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Continue 👑 ▶
        </button>
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

export default function RevealFlow({ rollover, onSlotDone }) {
  const session = useSession();
  const token = session?.token;
  const board = useQuery(api.leaderboard.getDaily, { dailyKey: rollover.dailyKey }) ?? [];
  const flowState = useQuery(
    api.flowVotes.getFlowVoteState,
    session?.token
      ? { token: session.token, dayNumber: rollover.dayNumber }
      : { dayNumber: rollover.dayNumber },
  );
  const holidayMap = useHolidayNameMap();
  const nameOf = (slug) => displayName(slug, holidayMap);
  const [stage, setStage] = useState(1);

  const newDailyKey = `day-${rollover.dayNumber + 1}`;
  const slotActive = isDailyScavengerActive(newDailyKey);
  const isFirstReveal = newDailyKey === "day-2";

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
            <DeductPicker
              loserSlug={rollover.loserSlug}
              rolloverId={rollover._id}
              onComplete={() => setStage(4)}
            />
          ) : (
            <WheelOfFortune
              target={rollover.forfeitId}
              onResult={() => setStage(4)}
            />
          )}
        </div>
      )}

      {stage === 4 && (
        <div style={{ textAlign: "center" }}>
          {flowState?.phase === "resolved" ? (
            <>
              <div
                style={{
                  fontFamily: "'Dela Gothic One', sans-serif",
                  fontSize: 56,
                  color: C.gold,
                  animation: "flowCrownIn 600ms ease-out",
                }}
              >
                👑
              </div>
              <div
                style={{
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 800,
                  fontSize: 22,
                  color: C.dark,
                  marginTop: 8,
                }}
              >
                {nameOf(flowState.winnerSlug)}
              </div>
              <div
                style={{
                  fontFamily: "Nunito, sans-serif",
                  fontSize: 13,
                  color: C.textBody,
                  marginTop: 4,
                }}
              >
                Max Flow State · +10
              </div>
              <style>{`@keyframes flowCrownIn { from { opacity: 0; transform: scale(0.4); } to { opacity: 1; transform: scale(1); } }`}</style>
              {slotActive && (
                <button
                  type="button"
                  onClick={() => setStage(5)}
                  style={{
                    marginTop: 20,
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
                  Continue to today's hunt 🔍 ▶
                </button>
              )}
            </>
          ) : flowState?.phase === "tied" ? (
            <div>
              <h3 style={{ ...HEADING.h3, color: C.dark, marginBottom: 8 }}>
                Tied — admin is picking
              </h3>
              <div style={{ ...BODY, color: C.textBody }}>
                {(flowState.candidates ?? []).map((slug) => nameOf(slug)).join(" / ")}
              </div>
            </div>
          ) : (
            <div>
              <h3 style={{ ...HEADING.h3, color: C.dark, marginBottom: 8 }}>
                Waiting on Flow State vote
              </h3>
              <div style={{ ...BODY, color: C.textBody }}>
                {flowState?.votedCount ?? 0} of {flowState?.totalCrew ?? 0} voted
              </div>
            </div>
          )}
        </div>
      )}

      {slotActive && stage === 5 && (
        <DailyScavengerReveal
          dailyKey={newDailyKey}
          isFirstReveal={isFirstReveal}
          onDone={() => {
            if (onSlotDone) onSlotDone();
          }}
        />
      )}
    </Card>
  );
}
