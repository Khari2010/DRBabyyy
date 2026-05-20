import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { useGameState } from "../lib/useGameState.js";
import { C } from "../data/colors.js";
import { BODY } from "../data/design.js";
import Card from "./primitives/Card.jsx";
import Pill from "./primitives/Pill.jsx";
import ChallengeCard from "./ChallengeCard.jsx";
import ClaimSheet from "./ClaimSheet.jsx";

export default function ChallengesSection() {
  const { gamesLive, currentDayNumber } = useGameState();
  const challenges = useQuery(api.challenges.listActive) ?? [];
  const session = useSession();
  const activity = useQuery(
    api.leaderboard.getRecentActivity,
    session?.token ? { limit: 50, token: session.token } : "skip"
  ) ?? [];
  const mySlug = session?.slug;
  const mine = activity.filter((e) => e.subjectSlug === mySlug);
  const [active, setActive] = useState(null);
  const [tab, setTab] = useState("easy");

  if (!gamesLive) {
    return (
      <Card>
        <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 18 }}>
          Games kick off after breakfast (Day 1).
        </div>
        <div style={{ ...BODY, marginTop: 8 }}>
          Once Khari or Kai pulls the trigger, this is where you'll claim challenges.
        </div>
      </Card>
    );
  }

  const byDifficulty = {
    easy: challenges.filter((c) => c.difficulty === "easy"),
    medium: challenges.filter((c) => c.difficulty === "medium"),
    wild: challenges.filter((c) => c.difficulty === "wild"),
  };

  return (
    <section style={{ margin: "16px 0" }}>
      {gamesLive ? (
        <div style={{ marginBottom: 12 }}>
          <div style={{
            fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 11,
            letterSpacing: 3, textTransform: "uppercase", color: C.gold, marginBottom: 4,
          }}>
            Day {currentDayNumber} · The hunt
          </div>
          <div style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: "clamp(22px, 5vw, 30px)", color: C.dark, lineHeight: 1.1,
          }}>
            What did you just do?
          </div>
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        {["easy", "medium", "wild"].map((d) => (
          <Pill
            key={d}
            active={tab === d}
            accent={C.gold}
            onClick={() => setTab(d)}
            style={{ textTransform: "capitalize" }}
          >
            {d} ({byDifficulty[d].length})
          </Pill>
        ))}
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {byDifficulty[tab].map((c) => (
          <ChallengeCard key={c.challengeId} challenge={c} onClaim={setActive} />
        ))}
      </div>
      {active !== null && <ClaimSheet challenge={active} onClose={() => setActive(null)} />}
      {mine.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{
            fontFamily: "Nunito, sans-serif",
            fontWeight: 800,
            fontSize: 11,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            color: C.textBody,
            marginBottom: 8,
          }}>
            My recent
          </div>
          <Card padding={0} style={{ overflow: "hidden" }}>
            {mine.map((e) => (
              <div
                key={e._id}
                style={{
                  padding: 10,
                  borderBottom: `1px solid ${C.sandDark}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  opacity: e.status === "disputed" ? 0.5 : 1,
                  textDecoration: e.status === "disputed" ? "line-through" : "none",
                  fontFamily: "Nunito, sans-serif",
                }}
              >
                <span>
                  {e.type === "challenge"
                    ? (e.challengeId ?? "?")
                    : `foul: ${e.negativeId ?? "?"}`}
                </span>
                <span style={{ fontWeight: 600 }}>
                  {e.points >= 0 ? "+" : ""}{e.points}
                  {e.status === "verified" ? " 🛡" : ""}
                  {e.status === "disputed" ? " ⚠️" : ""}
                </span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </section>
  );
}
