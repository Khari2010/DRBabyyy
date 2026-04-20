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
import YourItineraryCarousel from "../components/YourItineraryCarousel.jsx";
import TheCrew from "../components/TheCrew.jsx";

const SECTION_WRAPPER = {
  maxWidth: 960,
  margin: "0 auto",
  padding: "0 clamp(16px, 4vw, 20px)",
  marginBottom: 40,
  boxSizing: "border-box",
  width: "100%",
};

export default function PlayerPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const session = loadSession();

  const isKnownSlug = V1_LOGIN_SLUGS.includes(slug ?? "");
  const slugMatches = session && session.slug === slug;

  const serverSession = useQuery(
    api.auth.getSession,
    session && slugMatches ? { token: session.token } : "skip",
  );
  const logoutMutation = useMutation(api.auth.logout);
  const allAnswers = useQuery(api.answers.listAll) ?? [];
  const saveAnswerMutation = useMutation(api.answers.save);
  const allVotes = useQuery(api.activityVotes.listAll) ?? [];
  const castVoteMutation = useMutation(api.activityVotes.castVote);

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
      <div style={{ background: C.sand, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Nunito, sans-serif", color: C.textBody }}>
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
    <div style={{ background: C.sand, minHeight: "100vh", paddingBottom: 80, fontFamily: "Nunito, sans-serif", overflowX: "hidden" }}>
      {/* Logout chip */}
      <div style={{
        position: "fixed", top: 16, right: 16, zIndex: 900,
        background: C.white, borderRadius: 999,
        padding: "clamp(5px, 1.5vw, 6px) clamp(8px, 2vw, 10px) clamp(5px, 1.5vw, 6px) clamp(10px, 2.5vw, 14px)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        display: "flex", alignItems: "center", gap: "clamp(6px, 2vw, 10px)",
        fontFamily: "Nunito, sans-serif", fontWeight: 800,
        maxWidth: "calc(100vw - 32px)",
      }}>
        <button
          onClick={() => navigate("/")}
          style={{ background: "transparent", border: "none", color: C.textBody, cursor: "pointer", fontWeight: 800, fontSize: 13, padding: "6px 4px", minHeight: 32 }}
        >
          ← Home
        </button>
        <span style={{ width: 1, height: 18, background: C.sandDark }} />
        <button
          onClick={handleLogout}
          style={{ background: "transparent", border: "none", color: C.textBody, cursor: "pointer", fontWeight: 800, fontSize: 13, padding: "6px 4px", minHeight: 32 }}
        >
          Log out
        </button>
      </div>

      {/* Hero */}
      <section style={{
        padding: "clamp(56px, 12vw, 72px) clamp(16px, 4vw, 24px) clamp(32px, 8vw, 48px)",
        textAlign: "center",
        background: `linear-gradient(180deg, ${player.color}33 0%, ${C.sand} 100%)`,
      }}>
        <div style={{
          width: 150, height: 150, borderRadius: "50%", overflow: "hidden",
          margin: "0 auto 18px", background: C.white,
          boxShadow: `0 12px 36px ${player.color}55, 0 0 0 6px ${C.white}`,
        }}>
          {player.avatar ? (
            <img
              src={player.avatar}
              alt={player.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 15%" }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 80 }}>
              {player.emoji}
            </div>
          )}
        </div>
        <div style={{
          display: "inline-block", fontFamily: "Nunito, sans-serif", fontWeight: 800,
          fontSize: 11, color: C.white, background: player.color,
          padding: "5px 16px", borderRadius: 16, letterSpacing: 1.5,
          textTransform: "uppercase", marginBottom: 12,
        }}>
          {player.title}
        </div>
        <h1 style={{
          fontFamily: "'Dela Gothic One', sans-serif",
          fontSize: "clamp(32px, 8vw, 56px)", margin: "0 0 6px", color: C.dark,
        }}>
          {player.name}
        </h1>
        <div style={{ fontSize: 14, color: C.textBody, fontWeight: 600, marginBottom: 16 }}>
          {player.role}
        </div>
        <p style={{
          maxWidth: 560, margin: "0 auto", lineHeight: 1.7,
          color: C.textBody, fontSize: 15, fontWeight: 500,
        }}>
          {player.bio}
        </p>
      </section>

      {/* About Your Holiday — dashboard */}
      <AboutYourHoliday player={player} myFlights={myFlights} />

      {/* Adventure Map */}
      <SectionHeader
        label="The Plan"
        title="Adventure Map"
        tagline="Like what you're into. Dislike what you'd skip. Votes shape the trip."
        accent={C.coralDeep}
      />
      <section style={SECTION_WRAPPER}>
        <AdventuresPanel mySlug={slug} allVotes={allVotes} onVote={castVote} />
      </section>

      {/* Itinerary carousel */}
      <SectionHeader
        label="Your Days"
        title="Day by day"
        tagline="Swipe through — tap a day to see the full plan"
        accent={C.coral}
      />
      <section style={SECTION_WRAPPER}>
        <YourItineraryCarousel player={player} />
      </section>

      {/* The Game */}
      <SectionHeader
        label="The Game"
        title="Challenges & forfeits"
        tagline="Points, penalties, forfeits — the whole system"
        accent={C.gold}
      />
      <section style={SECTION_WRAPPER}>
        <GamesOverview player={player} />
      </section>

      {/* The Crew */}
      <SectionHeader
        label="The Crew"
        title="Your answers & theirs"
        tagline="Share your pre-trip take, peek at what the squad said"
        accent={C.blue}
      />
      <section style={SECTION_WRAPPER}>
        <TheCrew
          player={player}
          myAnswers={myAnswers}
          allAnswers={allAnswers}
          onSaveAnswer={saveAnswer}
        />
      </section>
    </div>
  );
}
