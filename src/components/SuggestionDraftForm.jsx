import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { C } from "../data/colors.js";

const CATEGORIES = ["social", "drinks", "fitness", "content", "wild", "squad", "chill"];

export default function SuggestionDraftForm({ suggestion, onDone }) {
  const session = useSession();
  const token = session?.token;
  const draft = useMutation(api.suggestions.draft);
  const [points, setPoints] = useState("");
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const p = Number(points);
    if (!Number.isFinite(p) || !category) {
      alert("Need points + category");
      return;
    }
    setSubmitting(true);
    try {
      await draft({ token, suggestionId: suggestion._id, points: p, category });
      onDone();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ marginTop: 8, padding: 8, background: C.sand, borderRadius: 8 }}>
      <input
        type="number"
        value={points}
        onChange={(e) => setPoints(e.target.value)}
        placeholder="Points"
        style={{ padding: 6, marginRight: 6, width: 80 }}
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        style={{ padding: 6 }}
      >
        <option value="">— Category —</option>
        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <button
        type="submit"
        disabled={submitting}
        style={{
          marginLeft: 6, padding: 6,
          background: C.green, color: C.white, border: 0, borderRadius: 4,
        }}
      >
        {submitting ? "..." : "Send to vote"}
      </button>
    </form>
  );
}
