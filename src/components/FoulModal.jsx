import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { C } from "../data/colors.js";
import { RADIUS, SHADOW, HEADING, MICRO_LABEL } from "../data/design.js";
import Card from "./primitives/Card.jsx";

const NEGATIVES = [
  { id: "throw-up", action: "Throwing up", points: -50, icon: "🤮" },
  { id: "bed-pre-11", action: "Going to bed before 11pm", points: -40, icon: "😴" },
  { id: "debate-drinks", action: "Debating chosen drinks", points: -10, icon: "🙄" },
  { id: "first-to-bed", action: "First to go to bed", points: -30, icon: "💤" },
];

export default function FoulModal({ targetSlug, targetName, onClose }) {
  const session = useSession();
  const token = session?.token;
  const logNegative = useMutation(api.entries.logNegative);
  const [submitting, setSubmitting] = useState(null);

  const apply = async (negativeId) => {
    if (!token) {
      alert("Not logged in");
      return;
    }
    setSubmitting(negativeId);
    try {
      await logNegative({ token, subjectSlug: targetSlug, negativeId });
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div
      role="dialog"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(26,26,46,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <Card
        padding={24}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 360,
          width: "100%",
          boxShadow: SHADOW.dramatic,
        }}
      >
        <h3
          style={{
            ...HEADING.h3,
            marginTop: 0,
            marginBottom: 16,
            color: C.dark,
          }}
        >
          {targetName} — Log a foul
        </h3>

        <div style={{ display: "grid", gap: 8 }}>
          {NEGATIVES.map((n) => (
            <button
              key={n.id}
              disabled={submitting !== null}
              onClick={() => apply(n.id)}
              style={{
                padding: "12px 14px",
                borderRadius: RADIUS.md,
                textAlign: "left",
                background: submitting === n.id ? C.sandDark : C.sand,
                border: `1.5px solid ${C.sandDark}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: submitting === n.id ? "default" : "pointer",
                fontFamily: "Nunito, sans-serif",
                fontSize: 14,
                color: C.dark,
                transition: "background 0.15s",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>{n.icon}</span>
                <span>{n.action}</span>
              </span>
              <span
                style={{
                  ...MICRO_LABEL,
                  color: C.coralDeep,
                  flexShrink: 0,
                  marginLeft: 8,
                }}
              >
                {n.points}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 12,
            width: "100%",
            padding: "10px 14px",
            borderRadius: RADIUS.md,
            border: `1.5px solid ${C.sandDark}`,
            background: "transparent",
            fontFamily: "Nunito, sans-serif",
            fontWeight: 700,
            fontSize: 14,
            color: C.textBody,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </Card>
    </div>
  );
}
