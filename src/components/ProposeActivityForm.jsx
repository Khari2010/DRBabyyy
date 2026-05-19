import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { C } from "../data/colors.js";
import { MICRO_LABEL } from "../data/design.js";

export default function ProposeActivityForm() {
  const session = useSession();
  const token = session?.token;
  const create = useMutation(api.activitySuggestions.create);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!token) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await create({ token, title, notes: notes || undefined });
      setTitle(""); setNotes(""); setOpen(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        style={{
          width: "100%", padding: "12px 14px", borderRadius: 10,
          border: `1px dashed ${C.coralDeep}`, background: "transparent",
          color: C.coralDeep, fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 13,
          cursor: "pointer", marginTop: 10,
        }}>
        + Suggest an adventure
      </button>
    );
  }

  return (
    <form onSubmit={submit} style={{
      padding: 12, borderRadius: 10, background: C.sand, marginTop: 10,
    }}>
      <div style={{ ...MICRO_LABEL, color: C.coralDeep, marginBottom: 8 }}>
        Suggest an adventure
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Hoyo Azul"
        style={{
          width: "100%", padding: "10px 12px", borderRadius: 8,
          border: `1px solid ${C.sandDark}`, marginBottom: 8,
          fontFamily: "Nunito, sans-serif", fontSize: 14,
          boxSizing: "border-box",
        }} />
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)" rows={2}
        style={{
          width: "100%", padding: "10px 12px", borderRadius: 8,
          border: `1px solid ${C.sandDark}`,
          fontFamily: "Nunito, sans-serif", fontSize: 13, resize: "vertical",
          boxSizing: "border-box",
        }} />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button type="button" onClick={() => setOpen(false)}
          style={{
            flex: 1, padding: 10, borderRadius: 8,
            background: "transparent", border: `1px solid ${C.sandDark}`,
            fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 13, cursor: "pointer",
          }}>Cancel</button>
        <button type="submit" disabled={submitting || !title.trim()}
          style={{
            flex: 1, padding: 10, borderRadius: 8,
            background: C.green, color: C.white, border: 0,
            fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 13,
            cursor: submitting ? "default" : "pointer",
            opacity: submitting ? 0.6 : 1,
          }}>{submitting ? "..." : "Send"}</button>
      </div>
    </form>
  );
}
