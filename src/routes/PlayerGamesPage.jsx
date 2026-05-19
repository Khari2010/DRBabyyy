import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { loadSession } from "../lib/session.js";
import { V1_LOGIN_SLUGS, playerBySlug } from "../data/players.js";
import { TRIP_END_DAY } from "../data/presence.js";
import { useGameState } from "../lib/useGameState.js";
import { C } from "../data/colors.js";
import { SECTION_ACCENTS, BODY, MICRO_LABEL } from "../data/design.js";
import SectionBand from "../components/primitives/SectionBand.jsx";
import Card from "../components/primitives/Card.jsx";
import Avatar from "../components/primitives/Avatar.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import Reveal from "../components/Reveal.jsx";
import BottomNav from "../components/BottomNav.jsx";
import ChallengesSection from "../components/ChallengesSection.jsx";
import ProposeForm from "../components/ProposeForm.jsx";
import VotingRow from "../components/VotingRow.jsx";

const ACCENT = SECTION_ACCENTS.game;

function daysRemaining() {
  const now = new Date();
  if (now.getMonth() !== 4) return 0;
  return Math.max(0, TRIP_END_DAY - now.getDate());
}

function Stat({ label, value, accent }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.85)",
      borderRadius: 14,
      padding: "10px 12px",
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{ ...MICRO_LABEL, color: C.textBody, marginBottom: 2 }}>{label}</div>
      <div style={{
        fontFamily: "'Dela Gothic One', sans-serif",
        fontSize: 24,
        color: accent ?? C.dark,
        lineHeight: 1,
      }}>
        {typeof value === "number" ? (value >= 0 ? `+${value}` : value) : value}
      </div>
    </div>
  );
}

function DashboardHero({ player, dailyTotal, holidayTotal, rank }) {
  const { gamesLive, currentDayNumber } = useGameState();
  const remaining = daysRemaining();
  return (
    <Card tint={player?.color ?? C.gold} padding={20}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {player && <Avatar player={player} size="lg" />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...MICRO_LABEL, color: player?.color ?? ACCENT, marginBottom: 2 }}>
            {gamesLive ? `Day ${currentDayNumber}` : "Pre-trip"}
          </div>
          <div style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: "clamp(22px, 5vw, 32px)",
            color: C.dark,
            lineHeight: 1.1,
          }}>{player?.name ?? "Player"}'s Games</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <Stat label="Today" value={dailyTotal} accent={dailyTotal >= 0 ? C.green : C.coralDeep} />
        <Stat label="Holiday" value={holidayTotal} accent={holidayTotal >= 0 ? C.green : C.coralDeep} />
        <Stat label="Rank" value={rank ? `#${rank}` : "—"} />
      </div>

      <div style={{ ...BODY, fontSize: 12, marginTop: 12, color: C.textBody }}>
        {remaining > 0 ? `${remaining} day${remaining === 1 ? "" : "s"} of trip remaining` : "Trip in progress"}
      </div>
    </Card>
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
  const allSuggestions = useQuery(api.suggestions.list, {}) ?? [];

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

  const myVoting = allSuggestions.filter((s) => s.status === "voting" && s.proposerSlug !== slug);
  const myProposed = allSuggestions.filter((s) => s.status === "proposed" && s.proposerSlug === slug);
  const recentApproved = allSuggestions.filter((s) => s.status === "approved").slice(-3);

  return (
    <div style={{ minHeight: "100vh", background: C.sand }}>
      <SectionBand bg="sand" pad="32px 0 24px" innerMaxWidth={520}>
        <Reveal>
          <DashboardHero
            player={player}
            dailyTotal={dailyRow?.total ?? 0}
            holidayTotal={holidayRow?.total ?? 0}
            rank={rank >= 0 ? rank + 1 : null}
          />
        </Reveal>
      </SectionBand>

      <SectionBand bg="white" pad="40px 0" innerMaxWidth={520}>
        <Reveal>
          <SectionHeader
            label="Earn it"
            title="Your challenges"
            accent={ACCENT}
            compact
          />
        </Reveal>
        <Reveal delay={0.05}>
          <ChallengesSection />
        </Reveal>
      </SectionBand>

      <SectionBand bg="sand" pad="40px 0 80px" innerMaxWidth={520}>
        <Reveal>
          <SectionHeader
            label="Crowdsource"
            title="Suggest a challenge"
            accent={C.coralDeep}
            tagline="Pitch an idea; the admin sets points and the crew votes."
            compact
          />
        </Reveal>
        <Reveal delay={0.05}>
          <Card>
            <ProposeForm />
            {myProposed.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.sandDark}` }}>
                <div style={{ ...MICRO_LABEL, color: C.textBody, marginBottom: 6 }}>Your pending</div>
                {myProposed.map((s) => (
                  <div key={s._id} style={{ fontFamily: "Nunito, sans-serif", fontSize: 13, padding: "2px 0" }}>
                    ⏳ {s.title} — awaiting admin
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Reveal>

        {myVoting.length > 0 && (
          <Reveal delay={0.1}>
            <div style={{ marginTop: 20 }}>
              <div style={{ ...MICRO_LABEL, color: C.coralDeep, marginBottom: 8 }}>Vote now</div>
              <Card padding={0} style={{ overflow: "hidden" }}>
                {myVoting.map((s) => <VotingRow key={s._id} suggestion={s} />)}
              </Card>
            </div>
          </Reveal>
        )}

        {recentApproved.length > 0 && (
          <div style={{
            marginTop: 16, fontSize: 12, color: C.textBody, fontFamily: "Nunito, sans-serif",
          }}>
            Recently approved: {recentApproved.map((s) => s.title).join(" · ")}
          </div>
        )}
      </SectionBand>

      <BottomNav />
    </div>
  );
}
