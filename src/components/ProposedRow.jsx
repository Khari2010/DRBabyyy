import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { useHolidayNameMap, displayName } from "../lib/displayName.js";
import { C } from "../data/colors.js";
import { RADIUS, BODY } from "../data/design.js";
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
    <div style={{ padding: "12px 0", borderBottom: `1px solid ${C.sandDark}` }}>
      <div
        style={{
          fontFamily: "'Dela Gothic One', sans-serif",
          fontSize: "clamp(14px, 3vw, 16px)",
          color: C.dark,
          lineHeight: 1.3,
          marginBottom: 2,
        }}
      >
        {suggestion.title}
      </div>
      <div style={{ ...BODY, fontSize: 12, marginBottom: 6 }}>
        by {displayName(suggestion.proposerSlug, holidayMap)}
      </div>
      {isAdmin && !drafting && (
        <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
          <button
            type="button"
            onClick={() => setDrafting(true)}
            style={{
              padding: "5px 12px",
              borderRadius: RADIUS.sm,
              background: C.sand,
              border: `1.5px solid ${C.sandDark}`,
              fontFamily: "Nunito, sans-serif",
              fontWeight: 800,
              fontSize: 13,
              color: C.dark,
              cursor: "pointer",
            }}
          >
            Draft
          </button>
          <button
            type="button"
            onClick={handleReject}
            style={{
              padding: "5px 12px",
              borderRadius: RADIUS.sm,
              background: C.coralDeep,
              color: C.white,
              border: 0,
              fontFamily: "Nunito, sans-serif",
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
            }}
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
