import { useEffect, useRef, useState } from "react";
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
import Reveal from "../components/Reveal.jsx";
import LogoutChip from "../components/LogoutChip.jsx";
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

function useCountUp(value, durationMs = 600) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (to - from) * eased;
      setDisplay(Math.round(v));
      if (t < 1) raf = requestAnimationFrame(tick);
      else prev.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);
  return display;
}

function TodayValue({ value, accent }) {
  const display = useCountUp(typeof value === "number" ? value : 0);
  const [pulseKey, setPulseKey] = useState(0);
  const prevRef = useRef(value);
  useEffect(() => {
    if (value !== prevRef.current) {
      setPulseKey((k) => k + 1);
      prevRef.current = value;
    }
  }, [value]);

  return (
    <div
      key={pulseKey}
      style={{
        fontFamily: "'Dela Gothic One', sans-serif",
        fontSize: 40,
        color: accent ?? C.dark,
        lineHeight: 1,
        animation: pulseKey > 0 ? "drStatPulse 0.5s cubic-bezier(0.16,1,0.3,1)" : undefined,
      }}
    >
      {typeof display === "number" ? (display >= 0 ? `+${display}` : display) : display}
    </div>
  );
}

function Stat({ label, value, accent, pulseOnChange = false }) {
  const numericDisplay = useCountUp(typeof value === "number" ? value : 0);
  const [pulseKey, setPulseKey] = useState(0);
  const prevRef = useRef(value);
  useEffect(() => {
    if (pulseOnChange && value !== prevRef.current) {
      setPulseKey((k) => k + 1);
      prevRef.current = value;
    }
  }, [value, pulseOnChange]);

  const display = pulseOnChange && typeof value === "number" ? numericDisplay : value;

  return (
    <div style={{
      background: "rgba(255,255,255,0.85)",
      borderRadius: 14,
      padding: "10px 12px",
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{ ...MICRO_LABEL, color: C.textBody, marginBottom: 2 }}>{label}</div>
      <div
        key={pulseKey}
        style={{
          fontFamily: "'Dela Gothic One', sans-serif",
          fontSize: 24,
          color: accent ?? C.dark,
          lineHeight: 1,
          animation: pulseKey > 0 ? "drStatPulse 0.5s cubic-bezier(0.16,1,0.3,1)" : undefined,
        }}
      >
        {typeof display === "number" ? (display >= 0 ? `+${display}` : display) : display}
      </div>
      <style>{`
        @keyframes drStatPulse {
          0% { transform: scale(1); }
          40% { transform: scale(1.18); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

function DashboardHero({ player, dailyTotal, holidayTotal, rank, crewSize }) {
  const { gamesLive, currentDayNumber } = useGameState();
  const remaining = daysRemaining();
  const isPristine = dailyTotal === 0 && holidayTotal === 0;
  const todayAccent = dailyTotal >= 0 ? C.green : C.coralDeep;
  const holidayAccent = holidayTotal >= 0 ? C.green : C.coralDeep;
  return (
    <Card tint={player?.color ?? C.gold} padding={20} style={{
      boxShadow: `0 4px 20px ${player?.color ?? C.flow}30, 0 0 0 1px ${player?.color ?? C.flow}15`,
    }}>
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

      {/* TODAY — emphasized as a full-width block with a larger value */}
      <div style={{
        marginTop: 16,
        background: "rgba(255,255,255,0.92)",
        borderRadius: 14,
        padding: "14px 16px",
      }}>
        <div style={{ ...MICRO_LABEL, color: C.textBody, marginBottom: 4 }}>Today</div>
        <TodayValue value={dailyTotal} accent={todayAccent} />
      </div>

      {/* HOLIDAY + RANK — secondary row, smaller */}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <Stat label="Holiday" value={holidayTotal} accent={holidayAccent} />
        <Stat
          label="Rank"
          value={rank && crewSize ? `#${rank} of ${crewSize}` : "—"}
        />
      </div>

      <div style={{ ...BODY, fontSize: 12, marginTop: 12, color: C.textBody }}>
        {isPristine
          ? "Tap a challenge to start scoring."
          : remaining > 0
            ? `${remaining} day${remaining === 1 ? "" : "s"} of trip remaining`
            : "Trip in progress"}
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
      <LogoutChip />
      <SectionBand bg="sand" pad="32px 0 24px" innerMaxWidth={520}>
        <Reveal>
          <DashboardHero
            player={player}
            dailyTotal={dailyRow?.total ?? 0}
            holidayTotal={holidayRow?.total ?? 0}
            rank={rank >= 0 ? rank + 1 : null}
            crewSize={holiday.length || null}
          />
        </Reveal>
      </SectionBand>

      <SectionBand bg="white" pad="40px 0" innerMaxWidth={520}>
        <Reveal>
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
