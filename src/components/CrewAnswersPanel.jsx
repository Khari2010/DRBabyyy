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
    <section style={{ padding: "24px 20px 60px", maxWidth: 720, margin: "0 auto" }}>
      <h2 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 28, color: C.dark, marginBottom: 6 }}>
        The crew's answers
      </h2>
      <p style={{ color: C.textBody, fontSize: 14, marginBottom: 14 }}>
        Tap a player to see what they said.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {crew.map((p) => {
          const active = expandedSlug === p.slug;
          return (
            <button
              key={p.slug}
              onClick={() => setExpandedSlug(active ? null : p.slug)}
              style={{
                background: active ? p.color : C.white,
                color: active ? C.white : C.dark,
                border: "none", borderRadius: 999,
                padding: "6px 14px 6px 6px",
                fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 13,
                cursor: "pointer",
                boxShadow: active ? `0 6px 18px ${p.color}55` : "0 2px 8px rgba(0,0,0,0.08)",
                display: "flex", alignItems: "center", gap: 8,
                transition: "background 160ms ease",
              }}
            >
              <span style={{
                width: 32, height: 32, borderRadius: "50%", overflow: "hidden",
                background: C.sand, flexShrink: 0,
                boxShadow: `0 0 0 2px ${active ? C.white : p.color}`,
              }}>
                {p.avatar ? (
                  <img
                    src={p.avatar}
                    alt={p.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 15%" }}
                  />
                ) : (
                  <span style={{ fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>{p.emoji}</span>
                )}
              </span>
              {p.name}
            </button>
          );
        })}
      </div>

      {expandedSlug && (() => {
        const p = crew.find((c) => c.slug === expandedSlug);
        const answers = answersFor(expandedSlug);
        return (
          <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
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
