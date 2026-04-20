import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { loadSession, clearSession } from "../lib/session.js";
import { playerBySlug, V1_LOGIN_SLUGS } from "../data/players.js";
import { flightsForPlayer } from "../data/flights.js";
import { C } from "../data/colors.js";
import QuestionBlock from "../components/QuestionBlock.jsx";
import { QUESTIONS } from "../data/questions.js";
import CrewAnswersPanel from "../components/CrewAnswersPanel.jsx";
import AdventuresPanel from "../components/AdventuresPanel.jsx";

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
    <div style={{ background: C.sand, minHeight: "100vh", paddingBottom: 80, fontFamily: "Nunito, sans-serif" }}>
      {/* Logout chip — mirrors LoggedInChip style on the home page */}
      <div style={{
        position: "fixed", top: 16, right: 16, zIndex: 900,
        background: C.white, borderRadius: 999, padding: "6px 10px 6px 14px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        display: "flex", alignItems: "center", gap: 10,
        fontFamily: "Nunito, sans-serif", fontWeight: 800,
      }}>
        <button
          onClick={() => navigate("/")}
          style={{ background: "transparent", border: "none", color: C.textBody, cursor: "pointer", fontWeight: 800, fontSize: 13 }}
        >
          ← Home
        </button>
        <span style={{ width: 1, height: 18, background: C.sandDark }} />
        <button
          onClick={handleLogout}
          style={{ background: "transparent", border: "none", color: C.textBody, cursor: "pointer", fontWeight: 800, fontSize: 13 }}
        >
          Log out
        </button>
      </div>

      {/* Hero — centered avatar with color-tinted background */}
      <section style={{
        padding: "64px 20px 48px", textAlign: "center",
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

      {/* Flights — homepage-style tinted cards */}
      <section style={{ padding: "24px 20px 8px", maxWidth: 720, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 28, color: C.dark, marginBottom: 14 }}>
          Your flights
        </h2>
        {myFlights.length === 0 ? (
          <p style={{ color: C.textBody }}>No flights on file.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {myFlights.map((f) => (
              <div
                key={f.id}
                style={{
                  background: `${player.color}0C`,
                  borderRadius: 16, padding: "16px 18px",
                  border: `1px solid ${player.color}22`,
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                  <span style={{
                    fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 10,
                    color: C.white, background: f.type === "Outbound" ? C.turquoise : C.coral,
                    padding: "3px 10px", borderRadius: 10, letterSpacing: 0.5, textTransform: "uppercase",
                  }}>
                    {f.type}
                  </span>
                  <span style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 12, color: C.dark }}>
                    {f.date}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: C.dark }}>{f.from.code}</div>
                    <div style={{ fontSize: 11, color: C.textBody }}>{f.from.city}</div>
                  </div>
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: C.textBody, marginBottom: 4 }}>
                      {f.duration}{f.stops ? ` · via ${f.stopCity}` : ""}
                    </div>
                    <div style={{ height: 2, background: `linear-gradient(90deg, ${player.color}44, ${player.color}, ${player.color}44)`, borderRadius: 2 }} />
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: C.dark }}>{f.to.code}</div>
                    <div style={{ fontSize: 11, color: C.textBody }}>{f.to.city}</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: C.textBody, marginTop: 10, fontWeight: 600 }}>
                  {f.depart} → {f.arrive} · {f.flight} · {f.aircraft}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Questions */}
      <section style={{ padding: "24px 20px 8px", maxWidth: 720, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 28, color: C.dark, marginBottom: 6 }}>
          Pre-trip questions
        </h2>
        <p style={{ color: C.textBody, fontSize: 14, marginBottom: 14 }}>
          Answer each one. Your crew will see these on their own pages.
        </p>
        <div style={{ display: "grid", gap: 10 }}>
          {QUESTIONS.map((q) => (
            <QuestionBlock
              key={q.id}
              prompt={q.prompt}
              answer={myAnswers[q.id]}
              color={player.color}
              onSave={(text) => saveAnswer(q.id, text)}
            />
          ))}
        </div>
      </section>

      <AdventuresPanel mySlug={slug} allVotes={allVotes} onVote={castVote} />

      <CrewAnswersPanel mySlug={slug} allAnswers={allAnswers} />
    </div>
  );
}
