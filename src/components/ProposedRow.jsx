import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { useHolidayNameMap, displayName } from "../lib/displayName.js";
import { C } from "../data/colors.js";
import SuggestionDraftForm from "./SuggestionDraftForm.jsx";

export default function ProposedRow({ suggestion, isAdmin }) {
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
