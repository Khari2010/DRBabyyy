import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import SuggestionDraftForm from "../components/SuggestionDraftForm.jsx";
import { C } from "../data/colors.js";
import { useHolidayNameMap, displayName } from "../lib/displayName.js";
import BottomNav from "../components/BottomNav.jsx";

function ProposeForm() {
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
        style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${C.sandDark}` }}
      />
      <button
        type="submit"
        disabled={submitting}
        style={{ padding: "10px 16px", borderRadius: 8, background: C.green, color: C.white, border: 0 }}
      >
        {submitting ? "..." : "Suggest"}
      </button>
    </form>
  );
}

function VotingRow({ suggestion }) {
  const session = useSession();
  const token = session?.token;
  const vote = useMutation(api.suggestions.vote);
  const myVote = useQuery(
    api.suggestions.myVote,
    token ? { token, suggestionId: suggestion._id } : "skip",
  );
  const holidayMap = useHolidayNameMap();

  const cast = async (v) => {
    if (!token) return;
    try {
      await vote({ token, suggestionId: suggestion._id, vote: v });
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ padding: 12, borderBottom: `1px solid ${C.sandDark}` }}>
      <div><strong>{suggestion.title}</strong> · {suggestion.points} pts · {suggestion.category}</div>
      <div style={{ fontSize: 12, color: C.textBody }}>
        by {displayName(suggestion.proposerSlug, holidayMap)}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
        <button
          disabled={!!myVote || !token}
          onClick={() => cast("yes")}
          style={{ padding: "4px 10px", borderRadius: 6, background: C.green, color: C.white, border: 0 }}
        >
          👍 Yes ({suggestion.yesCount})
        </button>
        <button
          disabled={!!myVote || !token}
          onClick={() => cast("no")}
          style={{ padding: "4px 10px", borderRadius: 6, background: C.coralDeep, color: C.white, border: 0 }}
        >
          👎 No ({suggestion.noCount})
        </button>
        {myVote && (
          <span style={{ fontSize: 12, color: C.textBody }}>You: {myVote}</span>
        )}
      </div>
    </div>
  );
}

function ProposedRow({ suggestion, isAdmin }) {
  const session = useSession();
  const token = session?.token;
  const reject = useMutation(api.suggestions.reject);
  const [drafting, setDrafting] = useState(false);
  const holidayMap = useHolidayNameMap();

  const handleReject = async () => {
    if (!token) return;
    try {
      await reject({ token, suggestionId: suggestion._id });
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ padding: 12, borderBottom: `1px solid ${C.sandDark}` }}>
      <div><strong>{suggestion.title}</strong></div>
      <div style={{ fontSize: 12, color: C.textBody }}>by {displayName(suggestion.proposerSlug, holidayMap)}</div>
      {isAdmin && !drafting && (
        <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
          <button
            type="button"
            onClick={() => setDrafting(true)}
            style={{ padding: "4px 10px", borderRadius: 6 }}
          >
            Draft
          </button>
          <button
            type="button"
            onClick={handleReject}
            style={{ padding: "4px 10px", borderRadius: 6, background: C.coralDeep, color: C.white, border: 0 }}
          >
            Reject
          </button>
        </div>
      )}
      {isAdmin && drafting && (
        <SuggestionDraftForm suggestion={suggestion} onDone={() => setDrafting(false)} />
      )}
    </div>
  );
}

export default function SuggestionsPage() {
  const session = useSession();
  const token = session?.token;
  const all = useQuery(api.suggestions.list, {}) ?? [];
  const isAdmin = useQuery(api.admin.isAdmin, token ? { token } : "skip") === true;

  const byStatus = {
    proposed: all.filter((s) => s.status === "proposed"),
    voting: all.filter((s) => s.status === "voting"),
    approved: all.filter((s) => s.status === "approved"),
    rejected: all.filter((s) => s.status === "rejected"),
  };

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
      <h1>Suggestions</h1>
      <ProposeForm />

      <h3>⏳ Awaiting admin ({byStatus.proposed.length})</h3>
      {byStatus.proposed.map((s) => (
        <ProposedRow key={s._id} suggestion={s} isAdmin={isAdmin} />
      ))}

      <h3>🗳 Voting ({byStatus.voting.length})</h3>
      {byStatus.voting.map((s) => <VotingRow key={s._id} suggestion={s} />)}

      <h3>✅ Approved ({byStatus.approved.length})</h3>
      {byStatus.approved.map((s) => (
        <div key={s._id} style={{ padding: 8 }}>{s.title} — {s.points} pts</div>
      ))}

      <h3>❌ Rejected ({byStatus.rejected.length})</h3>
      {byStatus.rejected.map((s) => (
        <div key={s._id} style={{ padding: 8, color: C.textBody }}>{s.title}</div>
      ))}
      <BottomNav />
    </main>
  );
}
