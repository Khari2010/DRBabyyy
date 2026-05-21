import { useEffect, useRef, useState } from "react";
import { C } from "../data/colors.js";
import { RADIUS, SHADOW } from "../data/design.js";

const PHRASE = "RESET";

export default function ResetConfirmDialog({ open, onConfirm, onCancel }) {
  const [typed, setTyped] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTyped("");
      setSubmitting(false);
      // Defer focus to after the dialog mounts.
      const id = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [open]);

  if (!open) return null;
  const matches = typed.trim().toUpperCase() === PHRASE;

  const handleConfirm = async () => {
    if (!matches || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(26, 26, 46, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        zIndex: 200,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onCancel();
      }}
    >
      <div
        style={{
          background: C.white,
          borderRadius: RADIUS.lg,
          boxShadow: SHADOW.dramatic,
          padding: 24,
          maxWidth: 420,
          width: "100%",
          fontFamily: "Nunito, sans-serif",
        }}
      >
        <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 20, color: C.dark, marginBottom: 8 }}>
          Reset practice data?
        </div>
        <div style={{ fontSize: 13, color: C.textBody, lineHeight: 1.5, marginBottom: 14 }}>
          This wipes every entry, vouch, rollover, suggestion, post, vote, and comment.
          Game state returns to pre-trip. Player profiles and answers are kept.
          This cannot be undone.
        </div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: C.dark, marginBottom: 6 }}>
          Type <span style={{ color: C.coralDeep }}>{PHRASE}</span> to confirm:
        </label>
        <input
          ref={inputRef}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleConfirm();
            if (e.key === "Escape" && !submitting) onCancel();
          }}
          disabled={submitting}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: RADIUS.sm,
            border: `1.5px solid ${matches ? C.coralDeep : C.sandDark}`,
            fontFamily: "Nunito, sans-serif",
            fontSize: 14,
            fontWeight: 700,
            color: C.dark,
            background: C.sand,
            outline: "none",
            boxSizing: "border-box",
            textTransform: "uppercase",
            letterSpacing: 2,
          }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            style={{
              padding: "10px 16px",
              borderRadius: RADIUS.md,
              background: C.sand,
              color: C.dark,
              border: `1.5px solid ${C.sandDark}`,
              fontFamily: "Nunito, sans-serif",
              fontWeight: 800,
              fontSize: 13,
              cursor: submitting ? "default" : "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!matches || submitting}
            style={{
              padding: "10px 16px",
              borderRadius: RADIUS.md,
              background: C.coralDeep,
              color: C.white,
              border: 0,
              fontFamily: "Nunito, sans-serif",
              fontWeight: 800,
              fontSize: 13,
              cursor: !matches || submitting ? "default" : "pointer",
              opacity: !matches || submitting ? 0.5 : 1,
            }}
          >
            {submitting ? "Resetting…" : "Reset practice data"}
          </button>
        </div>
      </div>
    </div>
  );
}
