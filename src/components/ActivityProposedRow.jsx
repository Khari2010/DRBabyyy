import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { C } from "../data/colors.js";
import { RADIUS } from "../data/design.js";
import ActivityDraftForm from "./ActivityDraftForm.jsx";

export default function ActivityProposedRow({ suggestion, onError }) {
  const session = useSession();
  const token = session?.token;
  const reject = useMutation(api.activitySuggestions.reject);
  const [drafting, setDrafting] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const handleReject = async () => {
    if (!token || rejecting) return;
    setRejecting(true);
    try {
      await reject({ token, suggestionId: suggestion._id });
    } catch (err) {
      onError?.(err.message);
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div style={{ padding: "8px 0", borderBottom: `1px solid ${C.sandDark}` }}>
      <div style={{ fontFamily: "'Dela Gothic One', sans-serif", color: C.dark }}>
        {suggestion.title}
      </div>
      {suggestion.notes && (
        <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 12, color: C.textBody }}>
          {suggestion.notes}
        </div>
      )}
      {!drafting && (
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
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
            disabled={rejecting}
            style={{
              padding: "5px 12px",
              borderRadius: RADIUS.sm,
              background: C.coralDeep,
              color: C.white,
              border: 0,
              fontFamily: "Nunito, sans-serif",
              fontWeight: 800,
              fontSize: 13,
              cursor: rejecting ? "default" : "pointer",
              opacity: rejecting ? 0.6 : 1,
            }}
          >
            {rejecting ? "..." : "Reject"}
          </button>
        </div>
      )}
      {drafting && (
        <ActivityDraftForm
          suggestion={suggestion}
          onDone={() => setDrafting(false)}
          onError={onError}
        />
      )}
    </div>
  );
}
