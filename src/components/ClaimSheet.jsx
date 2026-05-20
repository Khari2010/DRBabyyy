import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { showToast } from "../lib/useToast.js";
import { C } from "../data/colors.js";
import { RADIUS, HEADING, BODY } from "../data/design.js";
import BottomSheet from "./primitives/BottomSheet.jsx";

const BONUS_RE = /^\+(\d+)\s+(\w+)$/;

function parseBonus(bonusText) {
  if (!bonusText) return [];
  return bonusText.split(",").map((part) => {
    const m = part.trim().match(BONUS_RE);
    if (!m) return null;
    return { key: m[2], points: Number(m[1]) };
  }).filter(Boolean);
}

export default function ClaimSheet({ challenge, onClose }) {
  const session = useSession();
  const token = session?.token;
  const claim = useMutation(api.entries.claim);
  const unclaim = useMutation(api.entries.unclaim);
  const [selected, setSelected] = useState(() => new Set());
  const [submitting, setSubmitting] = useState(false);

  const bonusOpts = parseBonus(challenge?.bonus);
  const bonusPoints = bonusOpts.filter((b) => selected.has(b.key)).reduce((s, b) => s + b.points, 0);
  const total = (challenge?.points ?? 0) + bonusPoints;

  const toggle = (key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!token) {
      showToast({ message: "Not logged in", accent: C.coralDeep });
      return;
    }
    setSubmitting(true);
    const bonusKey = Array.from(selected).sort().join("+") || undefined;
    try {
      const entryId = await claim({ token, challengeId: challenge.challengeId, bonusKey });
      showToast({
        message: `+${total} · ${challenge.title}`,
        icon: challenge.icon,
        durationMs: 4000,
        action: entryId
          ? { label: "Undo", onClick: () => unclaim({ token, entryId }).catch(() => {}) }
          : undefined,
      });
      onClose();
    } catch (err) {
      showToast({ message: err.message || "Claim failed", accent: C.coralDeep });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet open={!!challenge} onClose={onClose}>
      <div style={{ fontSize: 36 }}>{challenge?.icon}</div>
      <h3 style={{ ...HEADING.h3, margin: "8px 0 4px", color: C.dark }}>
        {challenge?.title}
      </h3>
      <div style={{ ...BODY, marginBottom: 12 }}>+{challenge?.points} base</div>

      {bonusOpts.map((b) => (
        <label key={b.key} style={{
          display: "flex", gap: 10, padding: "8px 0", cursor: "pointer",
          fontFamily: "Nunito, sans-serif", fontSize: 14, color: C.textBody,
          alignItems: "center", borderTop: `1px solid ${C.sandDark}`,
        }}>
          <input type="checkbox" checked={selected.has(b.key)} onChange={() => toggle(b.key)} />
          <span style={{ flex: 1 }}>+{b.points} {b.key}</span>
        </label>
      ))}

      <div style={{
        fontFamily: "'Dela Gothic One', sans-serif",
        fontSize: 22, margin: "16px 0 12px", color: C.dark,
      }}>
        Total: +{total}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onClose}
          style={{
            flex: 1, padding: "12px 14px", borderRadius: RADIUS.md,
            border: `1.5px solid ${C.sandDark}`, background: "transparent",
            fontFamily: "Nunito, sans-serif", fontWeight: 700, fontSize: 14,
            color: C.textBody, cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          disabled={submitting}
          onClick={handleConfirm}
          style={{
            flex: 2, padding: "12px 14px", borderRadius: RADIUS.md,
            background: C.green, color: C.white, border: 0,
            fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 14,
            cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? "..." : "I did this"}
        </button>
      </div>
    </BottomSheet>
  );
}
