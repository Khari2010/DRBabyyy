import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { C } from "../data/colors.js";
import { RADIUS } from "../data/design.js";

const CATEGORIES = ["excursion", "dining", "nightlife", "wellness", "transit"];

const inputBase = {
  fontFamily: "Nunito, sans-serif",
  fontSize: 14,
  borderRadius: RADIUS.sm,
  border: `1.5px solid ${C.sandDark}`,
  color: C.dark,
  background: C.white,
  outline: "none",
};

export default function ActivityDraftForm({ suggestion, onDone, onError }) {
  const session = useSession();
  const token = session?.token;
  const draft = useMutation(api.activitySuggestions.draft);
  const [category, setCategory] = useState("");
  const [cost, setCost] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!category) {
      onError?.("Pick a category before sending to vote.");
      return;
    }
    setSubmitting(true);
    try {
      await draft({ token, suggestionId: suggestion._id, category, cost: cost || undefined });
      onDone();
    } catch (err) {
      onError?.(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      style={{
        marginTop: 10,
        padding: "12px 14px",
        background: C.sand,
        borderRadius: RADIUS.md,
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        style={{ ...inputBase, padding: "8px 10px" }}
      >
        <option value="">— Category —</option>
        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <input
        value={cost}
        onChange={(e) => setCost(e.target.value)}
        placeholder="Cost (optional)"
        style={{ ...inputBase, padding: "8px 10px", width: 140 }}
      />
      <button
        type="submit"
        disabled={submitting}
        style={{
          padding: "8px 14px",
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
        {submitting ? "..." : "Send to vote"}
      </button>
    </form>
  );
}
