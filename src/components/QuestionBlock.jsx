import { useState } from "react";
import { ANSWER_MAX_CHARS } from "../data/questions.js";
import { C } from "../data/colors.js";

export default function QuestionBlock({ prompt, answer, readOnly, color, onSave }) {
  const [editing, setEditing] = useState(!answer && !readOnly);
  const [text, setText] = useState(answer ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await onSave(text.slice(0, ANSWER_MAX_CHARS));
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    setText(answer ?? "");
    setEditing(false);
  };

  return (
    <div
      style={{
        background: C.white,
        borderRadius: 20,
        padding: "22px 22px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
        border: `1px solid ${(color ?? C.dark)}14`,
      }}
    >
      <div
        style={{
          fontFamily: "Nunito, sans-serif",
          fontWeight: 900,
          fontSize: 14,
          color: color ?? C.dark,
          marginBottom: 12,
          lineHeight: 1.4,
        }}
      >
        {prompt}
      </div>

      {readOnly ? (
        <div
          style={{
            fontFamily: "Nunito, sans-serif",
            fontSize: 14,
            fontWeight: 500,
            color: answer ? C.textBody : "#aaa",
            whiteSpace: "pre-wrap",
            lineHeight: 1.55,
          }}
        >
          {answer || "— no answer yet —"}
        </div>
      ) : editing ? (
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, ANSWER_MAX_CHARS))}
            rows={3}
            style={{
              width: "100%",
              padding: 12,
              fontFamily: "Nunito, sans-serif",
              fontSize: 14,
              borderRadius: 12,
              border: `2px solid ${C.sandDark}`,
              resize: "vertical",
              outline: "none",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <span style={{ fontSize: 12, color: C.textBody, fontWeight: 600 }}>{text.length}/{ANSWER_MAX_CHARS}</span>
            <div style={{ display: "flex", gap: 8 }}>
              {answer && (
                <button
                  onClick={cancel}
                  disabled={busy}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: C.textBody,
                    cursor: "pointer",
                    fontFamily: "Nunito, sans-serif",
                    fontWeight: 800,
                    fontSize: 13,
                  }}
                >
                  Cancel
                </button>
              )}
              <button
                onClick={save}
                disabled={busy || text.trim().length === 0}
                style={{
                  background: color ?? C.dark,
                  color: "white",
                  border: "none",
                  padding: "10px 18px",
                  borderRadius: 10,
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 900,
                  fontSize: 13,
                  cursor: busy || text.trim().length === 0 ? "not-allowed" : "pointer",
                  opacity: busy || text.trim().length === 0 ? 0.6 : 1,
                  boxShadow: `0 4px 12px ${(color ?? C.dark)}44`,
                }}
              >
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div
            style={{
              fontFamily: "Nunito, sans-serif",
              fontSize: 14,
              fontWeight: 500,
              color: C.textBody,
              whiteSpace: "pre-wrap",
              lineHeight: 1.55,
            }}
          >
            {answer}
          </div>
          <button
            onClick={() => setEditing(true)}
            style={{
              marginTop: 10,
              background: "transparent",
              border: "none",
              color: color ?? C.blue,
              cursor: "pointer",
              fontFamily: "Nunito, sans-serif",
              fontWeight: 800,
              fontSize: 13,
              padding: 0,
            }}
          >
            Edit
          </button>
        </div>
      )}
    </div>
  );
}
