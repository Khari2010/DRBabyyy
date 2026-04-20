import { useState } from "react";
import { PLAYERS, V1_LOGIN_SLUGS } from "../data/players.js";
import { QUESTIONS } from "../data/questions.js";
import QuestionBlock from "./QuestionBlock.jsx";
import { C } from "../data/colors.js";

export default function CrewAnswersPanel({ mySlug, allAnswers }) {
  const [expandedSlug, setExpandedSlug] = useState(null);

  const crew = PLAYERS.filter(
    (p) => V1_LOGIN_SLUGS.includes(p.slug) && p.slug !== mySlug,
  );

  const answersFor = (slug) =>
    Object.fromEntries(
      allAnswers.filter((a) => a.playerSlug === slug).map((a) => [a.questionId, a.text]),
    );

  return (
    <section style={{ padding: "20px 20px 60px", maxWidth: 720, margin: "0 auto" }}>
      <h2 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 28, color: C.dark }}>
        The crew's answers
      </h2>
      <p style={{ color: C.textBody, fontFamily: "Nunito, sans-serif" }}>
        Tap a player to see what they said.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
        {crew.map((p) => (
          <button
            key={p.slug}
            onClick={() => setExpandedSlug(expandedSlug === p.slug ? null : p.slug)}
            style={{
              background: expandedSlug === p.slug ? p.color : "white",
              color: expandedSlug === p.slug ? "white" : C.dark,
              border: "none", borderRadius: 999, padding: "8px 14px",
              fontFamily: "Nunito, sans-serif", fontWeight: 800, cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
            }}
          >
            <span style={{ fontSize: 18, marginRight: 6 }}>{p.emoji}</span>
            {p.name}
          </button>
        ))}
      </div>

      {expandedSlug && (() => {
        const p = crew.find((c) => c.slug === expandedSlug);
        const answers = answersFor(expandedSlug);
        return (
          <div style={{ marginTop: 20, display: "grid", gap: 12 }}>
            {QUESTIONS.map((q) => (
              <QuestionBlock
                key={q.id}
                prompt={q.prompt}
                answer={answers[q.id]}
                readOnly
                color={p.color}
              />
            ))}
          </div>
        );
      })()}
    </section>
  );
}
