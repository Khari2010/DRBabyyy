import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { C } from "../data/colors.js";
import { RADIUS } from "../data/design.js";

export default function ProposeForm() {
  const session = useSession();
  const token = session?.token;
  const create = useMutation(api.suggestions.create);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (!token) { alert("Not logged in"); return; }
    setSubmitting(true);
    try {
      await create({ token, title });
      setTitle("");
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Suggest a challenge…"
        style={{
          flex: 1,
          padding: "12px 14px",
          borderRadius: RADIUS.md,
          border: `1px solid ${C.sandDark}`,
          fontFamily: "Nunito, sans-serif",
          fontSize: 14,
          color: C.dark,
          background: C.white,
          outline: "none",
        }}
      />
      <button
        type="submit"
        disabled={submitting}
        style={{
          padding: "12px 18px",
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
        {submitting ? "..." : "Suggest"}
      </button>
    </form>
  );
}
