// src/components/ClaimModal.jsx
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { C } from "../data/colors.js";
import { RADIUS, SHADOW, HEADING, BODY, MICRO_LABEL } from "../data/design.js";
import Card from "./primitives/Card.jsx";

const BONUS_RE = /^\+(\d+)\s+(\w+)$/;

function parseBonus(bonusText) {
  if (!bonusText) return [];
  return bonusText.split(",").map((part) => {
    const m = part.trim().match(BONUS_RE);
    if (!m) return null;
    return { key: m[2], points: Number(m[1]) };
  }).filter(Boolean);
}

export default function ClaimModal({ challenge, onClose }) {
  const session = useSession();
  const token = session?.token;
  const claim = useMutation(api.entries.claim);
  const [selected, setSelected] = useState(() => new Set());
  const [submitting, setSubmitting] = useState(false);

  const bonusOpts = parseBonus(challenge.bonus);
  const bonusPoints = bonusOpts
    .filter((b) => selected.has(b.key))
    .reduce((sum, b) => sum + b.points, 0);
  const total = challenge.points + bonusPoints;

  const toggle = (key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!token) {
      alert("Not logged in");
      return;
    }
    setSubmitting(true);
    const bonusKey = Array.from(selected).sort().join("+") || undefined;
    try {
      await claim({ token, challengeId: challenge.challengeId, bonusKey });
      onClose();
    } catch (err) {
      alert(err.message || "claim failed");
    } finally {
      setSubmitting(false);
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
        <div style={{ fontSize: 32 }}>{challenge.icon}</div>

        <h3
          style={{
            ...HEADING.h3,
            margin: "8px 0 4px",
            color: C.dark,
          }}
        >
          {challenge.title}
        </h3>

        <div
          style={{
            ...BODY,
            marginBottom: 12,
          }}
        >
          +{challenge.points} base
        </div>

        {bonusOpts.map((b) => (
          <label
            key={b.key}
            style={{
              display: "flex",
              gap: 8,
              padding: "6px 0",
              cursor: "pointer",
              fontFamily: "Nunito, sans-serif",
              fontSize: 14,
              color: C.textBody,
              alignItems: "center",
            }}
          >
            <input
              type="checkbox"
              checked={selected.has(b.key)}
              onChange={() => toggle(b.key)}
            />
            <span>+{b.points} {b.key}</span>
          </label>
        ))}

        <div
          style={{
            fontFamily: "Nunito, sans-serif",
            fontWeight: 800,
            fontSize: 15,
            margin: "12px 0",
            color: C.dark,
          }}
        >
          Total: +{total}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
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
          <button
            disabled={submitting}
            onClick={handleConfirm}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: RADIUS.md,
              background: C.green,
              color: C.white,
              border: 0,
              fontFamily: "Nunito, sans-serif",
              fontWeight: 800,
              fontSize: 14,
              cursor: submitting ? "default" : "pointer",
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? "..." : "I did this"}
          </button>
        </div>
      </Card>
    </div>
  );
}
