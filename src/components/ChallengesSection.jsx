import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { useGameState } from "../lib/useGameState.js";
import ChallengeCard from "./ChallengeCard.jsx";
import ClaimModal from "./ClaimModal.jsx";

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
      <section style={{ padding: 16, background: "#FEF9EF", borderRadius: 12, margin: "16px 0" }}>
        <strong>Games kick off after breakfast (Day 1).</strong>
        <p style={{ marginTop: 4, color: "#4A4A6A" }}>
          Once Khari or Kai pulls the trigger, this is where you'll claim challenges.
        </p>
      </section>
    );
  }

  const byDifficulty = {
    easy: challenges.filter((c) => c.difficulty === "easy"),
    medium: challenges.filter((c) => c.difficulty === "medium"),
    wild: challenges.filter((c) => c.difficulty === "wild"),
  };

  return (
    <section style={{ margin: "16px 0" }}>
      <h2>Challenges — Day {currentDayNumber}</h2>
      <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        {["easy", "medium", "wild"].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setTab(d)}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              background: tab === d ? "#1A1A2E" : "transparent",
              color: tab === d ? "#FFF" : "#1A1A2E",
              border: "1px solid #1A1A2E",
              textTransform: "capitalize",
              cursor: "pointer",
            }}
          >
            {d} ({byDifficulty[d].length})
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {byDifficulty[tab].map((c) => (
          <ChallengeCard key={c.challengeId} challenge={c} onClaim={setActive} />
        ))}
      </div>
      {active !== null && <ClaimModal challenge={active} onClose={() => setActive(null)} />}
      {mine.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>My recent</h3>
          <div style={{ background: "#FFFFFF", borderRadius: 12, overflow: "hidden" }}>
            {mine.map((e) => (
              <div
                key={e._id}
                style={{
                  padding: 10,
                  borderBottom: "1px solid #F5EDE0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  opacity: e.status === "disputed" ? 0.5 : 1,
                  textDecoration: e.status === "disputed" ? "line-through" : "none",
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
          </div>
        </div>
      )}
    </section>
  );
}
