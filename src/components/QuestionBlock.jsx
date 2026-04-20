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
    <div style={{ background: "white", borderRadius: 16, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, color: color ?? C.dark, marginBottom: 8 }}>
        {prompt}
      </div>

      {readOnly ? (
        <div style={{ fontFamily: "Nunito, sans-serif", color: answer ? C.textBody : "#aaa", whiteSpace: "pre-wrap" }}>
          {answer || "— no answer yet —"}
        </div>
      ) : editing ? (
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, ANSWER_MAX_CHARS))}
            rows={3}
            style={{ width: "100%", padding: 10, fontFamily: "Nunito, sans-serif", fontSize: 14, borderRadius: 8, border: `2px solid ${C.sandDark}`, resize: "vertical" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <span style={{ fontSize: 12, color: C.textBody }}>{text.length}/{ANSWER_MAX_CHARS}</span>
            <div style={{ display: "flex", gap: 8 }}>
              {answer && (
                <button onClick={cancel} disabled={busy} style={{ background: "transparent", border: "none", color: C.textBody, cursor: "pointer" }}>
                  Cancel
                </button>
              )}
              <button
                onClick={save}
                disabled={busy || text.trim().length === 0}
                style={{ background: color ?? C.dark, color: "white", border: "none", padding: "8px 14px", borderRadius: 8, fontWeight: 800, cursor: "pointer" }}
              >
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ color: C.textBody, whiteSpace: "pre-wrap" }}>{answer}</div>
          <button
            onClick={() => setEditing(true)}
            style={{ marginTop: 8, background: "transparent", border: "none", color: color ?? C.blue, cursor: "pointer", fontWeight: 700, padding: 0 }}
          >
            Edit
          </button>
        </div>
      )}
    </div>
  );
}
