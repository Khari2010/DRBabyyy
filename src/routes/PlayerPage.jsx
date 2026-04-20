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
    return <div style={{ padding: 40 }}>Loading…</div>;
  }
  if (serverSession === null) return null;

  const player = playerBySlug(slug);
  if (!player) return null;

  const myFlights = flightsForPlayer(player.name);

  const allAnswers = useQuery(api.answers.listAll) ?? [];
  const saveAnswerMutation = useMutation(api.answers.save);

  const myAnswers = Object.fromEntries(
    allAnswers
      .filter((a) => a.playerSlug === slug)
      .map((a) => [a.questionId, a.text]),
  );

  const saveAnswer = async (questionId, text) => {
    await saveAnswerMutation({ token: session.token, questionId, text });
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
    <div style={{ background: C.sand, minHeight: "100vh", paddingBottom: 80 }}>
      {/* Logout chip */}
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 900 }}>
        <button
          onClick={handleLogout}
          style={{
            background: "white", border: "none", padding: "8px 14px",
            borderRadius: 999, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            fontFamily: "Nunito, sans-serif", fontWeight: 800, cursor: "pointer",
          }}
        >
          Log out
        </button>
      </div>

      {/* Hero */}
      <section style={{ padding: "60px 20px 40px", textAlign: "center", background: player.color, color: "white" }}>
        <div style={{ fontSize: 96, marginBottom: 12 }}>{player.emoji}</div>
        <h1 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: "clamp(32px, 8vw, 64px)", margin: 0 }}>
          {player.name}
        </h1>
        <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 20, fontWeight: 800, marginTop: 4, opacity: 0.9 }}>
          {player.title}
        </div>
        <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 14, marginTop: 8, opacity: 0.85 }}>
          {player.role}
        </div>
        <p style={{ fontFamily: "Nunito, sans-serif", maxWidth: 560, margin: "20px auto 0", lineHeight: 1.6 }}>
          {player.bio}
        </p>
      </section>

      {/* Flights */}
      <section style={{ padding: "40px 20px", maxWidth: 720, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 28, color: C.dark }}>
          Your flights
        </h2>
        {myFlights.length === 0 ? (
          <p style={{ color: C.textBody }}>No flights on file.</p>
        ) : (
          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            {myFlights.map((f) => (
              <div
                key={f.id}
                style={{
                  background: "white", borderRadius: 16, padding: 20,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
              >
                <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, color: player.color, textTransform: "uppercase", letterSpacing: 1, fontSize: 12 }}>
                  {f.type} · {f.date}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 900 }}>{f.from.code}</div>
                    <div style={{ fontSize: 12, color: C.textBody }}>{f.from.city}</div>
                  </div>
                  <div style={{ flex: 1, textAlign: "center", color: C.textBody, fontSize: 12 }}>
                    → {f.duration}{f.stops ? ` · via ${f.stopCity}` : ""}
                  </div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 900 }}>{f.to.code}</div>
                    <div style={{ fontSize: 12, color: C.textBody }}>{f.to.city}</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: C.textBody, marginTop: 8 }}>
                  {f.depart} → {f.arrive} · {f.flight} · {f.aircraft}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Questions */}
      <section style={{ padding: "20px 20px 40px", maxWidth: 720, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 28, color: C.dark }}>
          Pre-trip questions
        </h2>
        <p style={{ color: C.textBody, fontFamily: "Nunito, sans-serif" }}>
          Answer each one. Your crew will see these on their own pages.
        </p>
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
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
    </div>
  );
}
