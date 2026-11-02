import { useState } from "react";
import { useQuery } from "convex/react";
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

// Stages:
// 1 Day Closed banner
// 2 Scoreboard (highlight bottom three)
// 3 Five-shots stage (3rd-from-bottom)
// 4 Wheel for #last
// 5 Wheel for #second-last
// 6 Flow State crown
// 7 Daily Scavenger reveal (only if slot active)

export default function RevealFlow({ rollover, onSlotDone }) {
  const session = useSession();
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

  const shotsPlayer = PLAYERS.find((p) => p.slug === rollover.shotsSlug);

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
          <h2 style={{ ...HEADING.h2, marginTop: 0, color: C.dark }}>
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
          <h3 style={{ ...HEADING.h3, textAlign: "center", marginTop: 0, color: C.dark }}>
            Daily Scoreboard
          </h3>
          <div style={{ background: C.sand, borderRadius: RADIUS.sm, overflow: "hidden" }}>
            {board.map((row, i) => {
              const rowPlayer = PLAYERS.find((p) => p.slug === row.slug);
              const isLoser = row.slug === rollover.loserSlug;
              const isSecondLoser = row.slug === rollover.secondLoserSlug;
              const isShots = row.slug === rollover.shotsSlug;
              const bg = isLoser
                ? C.coralDeep
                : isSecondLoser
                ? C.coral
                : isShots
                ? C.gold
                : "transparent";
              const fg = (isLoser || isSecondLoser || isShots) ? C.white : C.dark;
              const badge = isLoser
                ? "🎰 spins"
                : isSecondLoser
                ? "🎰 spins"
                : isShots
                ? "🥃 5 shots"
                : null;
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
                    background: bg,
                    color: fg,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ ...MICRO_LABEL, color: fg === C.white ? C.white : C.textBody }}>
                      {i + 1}
                    </span>
                    {rowPlayer && <Avatar player={rowPlayer} size="sm" />}
                    <span style={{ fontFamily: "Nunito, sans-serif", fontSize: 14 }}>
                      {nameOf(row.slug)}
                    </span>
                    {badge && (
                      <span style={{
                        fontFamily: "Nunito, sans-serif",
                        fontWeight: 800,
                        fontSize: 11,
                        letterSpacing: 1,
                        textTransform: "uppercase",
                        background: "rgba(255,255,255,0.25)",
                        padding: "2px 8px",
                        borderRadius: RADIUS.pill,
                      }}>
                        {badge}
                      </span>
                    )}
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
            Bottom three — your reckoning.
          </p>
          <div style={{ textAlign: "center" }}>
            <button
              type="button"
              onClick={() => setStage(rollover.shotsSlug ? 3 : 4)}
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
              {rollover.shotsSlug ? "Pour the shots 🥃 ▶" : "Open the wheel ▶"}
            </button>
          </div>
        </div>
      )}

      {stage === 3 && (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 8, animation: "shotsIn 600ms ease-out" }}>🥃</div>
          <div style={{
            fontFamily: "Nunito, sans-serif",
            fontWeight: 900,
            fontSize: 11,
            color: C.gold,
            letterSpacing: 3,
            textTransform: "uppercase",
            marginBottom: 8,
          }}>
            Third from bottom
          </div>
          {shotsPlayer && (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <Avatar player={shotsPlayer} size="lg" />
            </div>
          )}
          <h3 style={{ ...HEADING.h2, color: C.dark, margin: "8px 0" }}>
            {nameOf(rollover.shotsSlug)}
          </h3>
          <div style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: 32,
            color: C.coralDeep,
            margin: "12px 0",
          }}>
            5 shots
          </div>
          <div style={{ ...BODY, color: C.textBody, marginBottom: 20 }}>
            No wheel. No mercy. Line them up.
          </div>
          <style>{`@keyframes shotsIn { from { opacity: 0; transform: scale(0.4) rotate(-15deg); } to { opacity: 1; transform: scale(1) rotate(0); } }`}</style>
          <button
            type="button"
            onClick={() => setStage(4)}
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
            On to the wheel ▶
          </button>
        </div>
      )}

      {stage === 4 && (
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontFamily: "Nunito, sans-serif",
            fontWeight: 900,
            fontSize: 11,
            color: C.coralDeep,
            letterSpacing: 3,
            textTransform: "uppercase",
            marginBottom: 4,
          }}>
            Spin 1 of 2 — Last place
          </div>
          <h3 style={{ ...HEADING.h3, color: C.dark, marginTop: 6, marginBottom: 16 }}>
            {nameOf(rollover.loserSlug)}, your fate:
          </h3>
          <WheelOfFortune
            key={`wheel-1-${rollover._id}`}
            target={rollover.forfeitId}
            onResult={() => setStage(rollover.secondLoserSlug ? 5 : 6)}
          />
        </div>
      )}

      {stage === 5 && (
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontFamily: "Nunito, sans-serif",
            fontWeight: 900,
            fontSize: 11,
            color: C.coral,
            letterSpacing: 3,
            textTransform: "uppercase",
            marginBottom: 4,
          }}>
            Spin 2 of 2 — Second-from-bottom
          </div>
          <h3 style={{ ...HEADING.h3, color: C.dark, marginTop: 6, marginBottom: 16 }}>
            {nameOf(rollover.secondLoserSlug)}, your fate:
          </h3>
          <WheelOfFortune
            key={`wheel-2-${rollover._id}`}
            target={rollover.secondForfeitId}
            onResult={() => setStage(6)}
          />
        </div>
      )}

      {stage === 6 && (
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
                  onClick={() => setStage(7)}
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

      {slotActive && stage === 7 && (
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
