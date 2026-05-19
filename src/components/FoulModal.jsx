import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { C } from "../data/colors.js";

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
        position: "fixed", inset: 0, background: "rgba(26,26,46,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: C.white, padding: 20, borderRadius: 16, maxWidth: 360, width: "100%" }}
      >
        <h3 style={{ marginTop: 0 }}>{targetName} — Log a foul</h3>
        <div style={{ display: "grid", gap: 8 }}>
          {NEGATIVES.map((n) => (
            <button
              key={n.id}
              disabled={submitting !== null}
              onClick={() => apply(n.id)}
              style={{
                padding: 12, borderRadius: 8, textAlign: "left",
                background: submitting === n.id ? C.sandDark : C.sand,
                border: `1px solid ${C.sandDark}`,
                display: "flex", justifyContent: "space-between",
                cursor: submitting === n.id ? "default" : "pointer",
              }}
            >
              <span>{n.icon} {n.action}</span>
              <strong style={{ color: C.coralDeep }}>{n.points}</strong>
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          style={{ marginTop: 12, width: "100%", padding: 10, borderRadius: 8 }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
