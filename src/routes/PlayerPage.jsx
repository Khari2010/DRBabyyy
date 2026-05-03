import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { loadSession, clearSession } from "../lib/session.js";
import { playerBySlug, V1_LOGIN_SLUGS } from "../data/players.js";
import { flightsForPlayer } from "../data/flights.js";
import { C } from "../data/colors.js";
import AdventuresPanel from "../components/AdventuresPanel.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import GamesOverview from "../components/GamesOverview.jsx";
import AboutYourHoliday from "../components/AboutYourHoliday.jsx";
import YourItineraryHome from "../components/YourItineraryHome.jsx";
import TheCrew from "../components/TheCrew.jsx";
import Reveal from "../components/Reveal.jsx";
import PlayerStickyNav from "../components/PlayerStickyNav.jsx";

// Ensure the Google Fonts link + shared keyframes are loaded once (matches
// what HomePage does in its own effect). These are required because the
// player page can be a user's first landing if they open it directly.
function useHomeStyleAssets() {
  useEffect(() => {
    const href =
      "https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=Nunito:wght@400;600;700;800;900&display=swap";
    let link = document.querySelector(`link[data-punta-fonts]`);
    if (!link) {
      link = document.createElement("link");
      link.href = href;
      link.rel = "stylesheet";
      link.setAttribute("data-punta-fonts", "true");
      document.head.appendChild(link);
    }

    let style = document.querySelector(`style[data-punta-anim]`);
    if (!style) {
      style = document.createElement("style");
      style.setAttribute("data-punta-anim", "true");
      style.textContent = `
        *{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{overflow-x:hidden}
        .no-scrollbar::-webkit-scrollbar{display:none}
        .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
        @keyframes float{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-18px) rotate(5deg)}}
        @keyframes tapPulse{0%,100%{opacity:0.35}50%{opacity:0.7}}
      `;
      document.head.appendChild(style);
    }
  }, []);
}

export default function PlayerPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const session = loadSession();

  const isKnownSlug = V1_LOGIN_SLUGS.includes(slug ?? "");
  const slugMatches = session && session.slug === slug;

  // Convex hooks must stay above the early-return guard.
  const serverSession = useQuery(
    api.auth.getSession,
    session && slugMatches ? { token: session.token } : "skip",
  );
  const logoutMutation = useMutation(api.auth.logout);
  const allAnswers = useQuery(api.answers.listAll) ?? [];
  const saveAnswerMutation = useMutation(api.answers.save);
  const allVotes = useQuery(api.activityVotes.listAll) ?? [];
  const castVoteMutation = useMutation(api.activityVotes.castVote);

  useHomeStyleAssets();

  useEffect(() => {
    if (!isKnownSlug) {
      navigate("/", { replace: true });
      return;
    }
    if (!session || !slugMatches) {
      navigate("/", { replace: true });
      return;
    }
    if (serverSession === null) {
      clearSession();
      navigate("/", { replace: true });
    }
  }, [isKnownSlug, session, slugMatches, serverSession, navigate]);

  if (!isKnownSlug || !session || !slugMatches || serverSession === undefined) {
    return (
      <div
        style={{
          background: C.sand,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Nunito, sans-serif",
          color: C.textBody,
        }}
      >
        Loading…
      </div>
    );
  }
  if (serverSession === null) return null;

  const player = playerBySlug(slug);
  if (!player) return null;

  const myFlights = flightsForPlayer(player.name);

  const myAnswers = Object.fromEntries(
    allAnswers
      .filter((a) => a.playerSlug === slug)
      .map((a) => [a.questionId, a.text]),
  );

  const saveAnswer = async (questionId, text) => {
    await saveAnswerMutation({ token: session.token, questionId, text });
  };

  const castVote = async (activityId, vote) => {
    await castVoteMutation({ token: session.token, activityId, vote });
  };

  const handleLogout = async () => {
    try {
      await logoutMutation({ token: session.token });
    } catch {
      /* ignore */
    }
    clearSession();
    navigate("/", { replace: true });
  };

  return (
    <div
      style={{
        background: C.sand,
        minHeight: "100vh",
        fontFamily: "Nunito, sans-serif",
        overflowX: "hidden",
        lineHeight: 1.6,
      }}
    >
      <PlayerStickyNav accent={player.color} />

      {/* ── HERO / LOGOUT CHIP ───────────────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 900,
          background: C.white,
          borderRadius: 999,
          padding: "6px 10px 6px 14px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontFamily: "Nunito, sans-serif",
          fontWeight: 800,
          maxWidth: "calc(100vw - 32px)",
        }}
      >
        <button
          onClick={() => navigate("/")}
          style={{
            background: "transparent",
            border: "none",
            color: C.textBody,
            cursor: "pointer",
            fontWeight: 800,
            fontSize: 13,
            padding: "6px 4px",
            minHeight: 32,
          }}
        >
          ← Home
        </button>
        <span style={{ width: 1, height: 18, background: C.sandDark }} />
        <button
          onClick={() => navigate("/games")}
          style={{
            background: C.gold,
            color: C.white,
            border: "none",
            borderRadius: 999,
            cursor: "pointer",
            fontWeight: 800,
            fontSize: 13,
            padding: "6px 12px",
            minHeight: 32,
            letterSpacing: 0.5,
          }}
        >
          🎮 Games
        </button>
        <span style={{ width: 1, height: 18, background: C.sandDark }} />
        <button
          onClick={handleLogout}
          style={{
            background: "transparent",
            border: "none",
            color: C.textBody,
            cursor: "pointer",
            fontWeight: 800,
            fontSize: 13,
            padding: "6px 4px",
            minHeight: 32,
          }}
        >
          Log out
        </button>
      </div>

      {/* Hero — keeps player-colour gradient → sand, applies home's double-border avatar */}
      <section
        style={{
          padding: "clamp(72px, 14vw, 120px) clamp(16px, 4vw, 24px) clamp(48px, 10vw, 72px)",
          textAlign: "center",
          background: `linear-gradient(180deg, ${player.color}33 0%, ${C.sand} 100%)`,
        }}
      >
        <Reveal>
          <div
            style={{
              width: 150,
              height: 150,
              borderRadius: "50%",
              overflow: "hidden",
              margin: "0 auto 18px",
              background: C.white,
              border: `4px solid ${player.color}`,
              boxShadow: `0 8px 24px ${player.color}40, 0 0 0 6px ${C.white}`,
            }}
          >
            {player.avatar ? (
              <img
                src={player.avatar}
                alt={player.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center 15%",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 80,
                }}
              >
                {player.emoji}
              </div>
            )}
          </div>
          <div
            style={{
              display: "inline-block",
              fontFamily: "Nunito, sans-serif",
              fontWeight: 800,
              fontSize: 11,
              color: C.white,
              background: player.color,
              padding: "5px 16px",
              borderRadius: 16,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            {player.title}
          </div>
          <h1
            style={{
              fontFamily: "'Dela Gothic One', sans-serif",
              fontSize: "clamp(44px, 12vw, 80px)",
              margin: "0 0 6px",
              color: C.dark,
              lineHeight: 0.95,
            }}
          >
            {player.name}
          </h1>
          <div
            style={{
              fontFamily: "Nunito, sans-serif",
              fontSize: 14,
              color: C.textBody,
              fontWeight: 700,
              marginBottom: 16,
              letterSpacing: 0.5,
            }}
          >
            {player.role}
          </div>
          <p
            style={{
              maxWidth: 560,
              margin: "0 auto",
              lineHeight: 1.7,
              color: C.textBody,
              fontSize: 15,
              fontWeight: 500,
            }}
          >
            {player.bio}
          </p>
        </Reveal>
      </section>

      {/* ── ABOUT YOUR HOLIDAY ───────────────────────────────────────────── */}
      <section id="about" style={{ padding: "80px 0 60px", background: C.white }}>
        <Reveal>
          <SectionHeader
            label="The Mission Briefing"
            title="About Your Holiday"
            tagline="Everything you need before wheels up"
            accent={C.turquoise}
          />
        </Reveal>
        <AboutYourHoliday player={player} myFlights={myFlights} />
      </section>

      {/* ── ADVENTURES ───────────────────────────────────────────────────── */}
      <section id="adventures" style={{ padding: "80px 0 60px", background: C.sand }}>
        <Reveal>
          <SectionHeader
            label="The Plan"
            title="Adventure Map"
            tagline="Like what you're into. Dislike what you'd skip. Votes shape the trip."
            accent={C.coralDeep}
          />
        </Reveal>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px" }}>
          <Reveal delay={0.1}>
            <AdventuresPanel mySlug={slug} allVotes={allVotes} onVote={castVote} />
          </Reveal>
        </div>
      </section>

      {/* ── ITINERARY ────────────────────────────────────────────────────── */}
      <section id="itinerary" style={{ padding: "80px 0 60px", background: C.white }}>
        <Reveal>
          <SectionHeader
            label="The Squad Phase · 18–25 May"
            title="Day by Day"
            tagline="Your days lit up, the rest dimmed — tap any day to see the full plan."
            accent={C.gold}
          />
        </Reveal>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <Reveal delay={0.1}>
            <YourItineraryHome player={player} />
          </Reveal>
        </div>
      </section>

      {/* ── THE GAME (DARK band) ─────────────────────────────────────────── */}
      <section id="game" style={{ padding: "80px 0 60px", background: C.dark }}>
        <Reveal>
          <SectionHeader
            label="Earn Your Bragging Rights"
            title="Learn the Game"
            tagline="Points, penalties, forfeits — the whole system."
            accent={C.gold}
            onDark
          />
        </Reveal>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
          <GamesOverview />
        </div>
      </section>

      {/* ── THE CREW (WHITE band after dark) ─────────────────────────────── */}
      <section id="crew" style={{ padding: "80px 0 60px", background: C.white }}>
        <Reveal>
          <SectionHeader
            label="The Crew"
            title="Your Answers & Theirs"
            tagline="Share your pre-trip take, peek at what the squad said."
            accent={C.blue}
          />
        </Reveal>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
          <Reveal delay={0.1}>
            <TheCrew
              player={player}
              myAnswers={myAnswers}
              allAnswers={allAnswers}
              onSaveAnswer={saveAnswer}
            />
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer
        style={{
          textAlign: "center",
          padding: "16px 24px 24px",
          fontFamily: "Nunito, sans-serif",
          fontSize: 11,
          color: C.textBody,
          opacity: 0.4,
          fontWeight: 700,
          letterSpacing: 1,
          background: C.white,
        }}
      >
        PUNTA CANA '26 • ROYALTON CHIC • 🌊
      </footer>
    </div>
  );
}
