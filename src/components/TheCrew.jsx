import { C } from "../data/colors.js";
import { QUESTIONS } from "../data/questions.js";
import QuestionBlock from "./QuestionBlock.jsx";
import CrewAnswersPanel from "./CrewAnswersPanel.jsx";

// Coming-soon placeholder. The full questionnaire UI below is kept for future
// revival when we re-enable answers + crew browsing.
export default function TheCrew({ player, myAnswers, allAnswers, onSaveAnswer }) {
  return (
    <div
      style={{
        padding: "32px 24px",
        textAlign: "center",
        background: C.white,
        borderRadius: 20,
        border: `1px dashed ${C.sandDark}`,
        boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 8 }}>🛠️</div>
      <div
        style={{
          fontFamily: "Nunito, sans-serif",
          fontWeight: 900,
          fontSize: 11,
          color: player.color,
          letterSpacing: 3,
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        Coming soon
      </div>
      <div
        style={{
          fontFamily: "'Dela Gothic One', sans-serif",
          fontSize: "clamp(20px, 5vw, 26px)",
          color: C.dark,
          lineHeight: 1.2,
          marginBottom: 8,
        }}
      >
        Crew Q&amp;A
      </div>
      <div
        style={{
          fontFamily: "Nunito, sans-serif",
          fontSize: 14,
          color: C.textBody,
          lineHeight: 1.5,
          maxWidth: 380,
          margin: "0 auto",
        }}
      >
        Pre-trip questionnaire + tap-a-player to read their answers. Building this back in after the trip.
      </div>
    </div>
  );
}

// Kept for future revival.
function _PreservedFullTheCrew({ player, myAnswers, allAnswers, onSaveAnswer }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: 20,
        alignItems: "start",
      }}
    >
      {/* LEFT — your answers */}
      <div>
        <div
          style={{
            fontFamily: "Nunito, sans-serif",
            fontWeight: 900,
            fontSize: 11,
            color: player.color,
            letterSpacing: 3,
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          Your answers
        </div>
        <div
          style={{
            fontFamily: "Nunito, sans-serif",
            fontSize: 12,
            color: C.textBody,
            fontWeight: 600,
            lineHeight: 1.5,
            marginBottom: 14,
          }}
        >
          Answer each one — the crew will see these on their own pages.
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {QUESTIONS.map((q) => (
            <QuestionBlock
              key={q.id}
              prompt={q.prompt}
              answer={myAnswers[q.id]}
              color={player.color}
              onSave={(text) => onSaveAnswer(q.id, text)}
            />
          ))}
        </div>
      </div>

      {/* RIGHT — crew */}
      <div>
        <div
          style={{
            fontFamily: "Nunito, sans-serif",
            fontWeight: 900,
            fontSize: 11,
            color: C.blue,
            letterSpacing: 3,
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          The crew
        </div>
        <div
          style={{
            fontFamily: "Nunito, sans-serif",
            fontSize: 12,
            color: C.textBody,
            fontWeight: 600,
            lineHeight: 1.5,
            marginBottom: 14,
          }}
        >
          Tap a player to see their pre-trip answers.
        </div>
        <CrewAnswersPanel mySlug={player.slug} allAnswers={allAnswers} />
      </div>
    </div>
  );
}
