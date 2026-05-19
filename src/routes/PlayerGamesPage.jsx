import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { loadSession } from "../lib/session.js";
import { V1_LOGIN_SLUGS, playerBySlug } from "../data/players.js";
import { TRIP_END_DAY } from "../data/presence.js";
import { useGameState } from "../lib/useGameState.js";
import { C } from "../data/colors.js";
import BottomNav from "../components/BottomNav.jsx";
import ChallengesSection from "../components/ChallengesSection.jsx";
import ProposeForm from "../components/ProposeForm.jsx";
import VotingRow from "../components/VotingRow.jsx";

function daysRemaining() {
  // Today is during the trip. TRIP_END_DAY is the day number in May (e.g. 29).
  // Approximate: assume current month is May.
  const now = new Date();
  // Fall back: if before May or after, return 0 to avoid weird numbers.
  if (now.getMonth() !== 4 /* May */) return 0;
  return Math.max(0, TRIP_END_DAY - now.getDate());
}

function DashboardHeader({ player, board, dailyTotal, holidayTotal, rank }) {
  const { gamesLive, currentDayNumber } = useGameState();
  const remaining = daysRemaining();

  return (
    <section
      style={{
        background: player?.color ?? C.dark,
        color: C.white,
        padding: "20px 16px",
        borderRadius: 16,
        margin: "16px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>{player?.name ?? "Player"}'s Games</h1>
        <div style={{ fontSize: 12, opacity: 0.85 }}>
          {gamesLive ? `Day ${currentDayNumber}` : "Pre-trip"}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 16 }}>
        <Stat label="Today" value={dailyTotal} />
        <Stat label="Holiday" value={holidayTotal} />
        <Stat label="Rank" value={rank ? `#${rank}` : "—"} />
      </div>

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
        {remaining > 0 ? `${remaining} day${remaining === 1 ? "" : "s"} of trip remaining` : "Trip in progress"}
      </div>
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 10, padding: "8px 10px" }}>
      <div style={{ fontSize: 11, opacity: 0.85 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800 }}>
        {typeof value === "number" ? (value >= 0 ? `+${value}` : value) : value}
      </div>
    </div>
  );
}

export default function PlayerGamesPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const session = loadSession();
  const player = playerBySlug(slug ?? "");
  const { currentDailyKey } = useGameState();
  const daily = useQuery(api.leaderboard.getDaily, { dailyKey: currentDailyKey }) ?? [];
  const holiday = useQuery(api.leaderboard.getHoliday, {}) ?? [];

  // Same gate as PlayerPage: must be logged in as this slug, must be a known slug.
  const isKnownSlug = V1_LOGIN_SLUGS.includes(slug ?? "");
  const slugMatches = session && session.slug === slug;

  useEffect(() => {
    if (!isKnownSlug || !session || !slugMatches) {
      navigate("/", { replace: true });
    }
  }, [isKnownSlug, session, slugMatches, navigate]);

  if (!isKnownSlug || !session || !slugMatches) return null;

  const dailyRow = daily.find((r) => r.slug === slug);
  const holidayRow = holiday.find((r) => r.slug === slug);
  const rank = holiday.findIndex((r) => r.slug === slug);

  const allSuggestions = useQuery(api.suggestions.list, {}) ?? [];
  const myVoting = allSuggestions.filter((s) => s.status === "voting" && s.proposerSlug !== slug);
  const myProposed = allSuggestions.filter((s) => s.status === "proposed" && s.proposerSlug === slug);
  const recentApproved = allSuggestions.filter((s) => s.status === "approved").slice(-3);

  return (
    <main style={{ minHeight: "100vh", background: C.sand }}>
      <DashboardHeader
        player={player}
        board={holiday}
        dailyTotal={dailyRow?.total ?? 0}
        holidayTotal={holidayRow?.total ?? 0}
        rank={rank >= 0 ? rank + 1 : null}
      />
      <div style={{ padding: "0 16px" }}>
        <ChallengesSection />
      </div>

      <section style={{ margin: "24px 0", padding: "0 16px" }}>
        <h2 style={{ fontSize: 18 }}>Suggest a challenge</h2>
        <ProposeForm />

        {myProposed.length > 0 && (
          <div style={{ marginTop: 12, padding: 10, background: C.white, borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: C.textBody, marginBottom: 4 }}>Your pending suggestions</div>
            {myProposed.map((s) => (
              <div key={s._id} style={{ fontSize: 13, padding: "4px 0" }}>
                ⏳ {s.title} — awaiting admin
              </div>
            ))}
          </div>
        )}

        {myVoting.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8 }}>Vote on the crew's ideas</h3>
            <div style={{ background: C.white, borderRadius: 12, overflow: "hidden" }}>
              {myVoting.map((s) => <VotingRow key={s._id} suggestion={s} />)}
            </div>
          </div>
        )}

        {recentApproved.length > 0 && (
          <div style={{ marginTop: 16, fontSize: 12, color: C.textBody }}>
            Recently approved: {recentApproved.map((s) => s.title).join(" · ")}
          </div>
        )}
      </section>

      <BottomNav />
    </main>
  );
}
