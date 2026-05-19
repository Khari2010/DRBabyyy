import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { useHolidayNameMap, displayName } from "../lib/displayName.js";
import { C } from "../data/colors.js";
import { RADIUS, MICRO_LABEL, BODY } from "../data/design.js";

export default function VotingRow({ suggestion }) {
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
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
        <span style={{ ...MICRO_LABEL, color: C.textBody }}>
          {suggestion.points} pts
        </span>
        <span style={{ ...MICRO_LABEL, color: C.textBody }}>
          {suggestion.category}
        </span>
      </div>
      <div style={{ ...BODY, fontSize: 12, marginBottom: 8 }}>
        by {displayName(suggestion.proposerSlug, holidayMap)}
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <button
          disabled={!!myVote || !token}
          onClick={() => cast("yes")}
          style={{
            padding: "5px 12px",
            borderRadius: RADIUS.sm,
            background: C.green,
            color: C.white,
            border: 0,
            fontFamily: "Nunito, sans-serif",
            fontWeight: 800,
            fontSize: 13,
            cursor: (!!myVote || !token) ? "default" : "pointer",
            opacity: (!!myVote || !token) ? 0.6 : 1,
          }}
        >
          👍 Yes
          <span style={{ marginLeft: 4 }}>({suggestion.yesCount})</span>
        </button>
        <button
          disabled={!!myVote || !token}
          onClick={() => cast("no")}
          style={{
            padding: "5px 12px",
            borderRadius: RADIUS.sm,
            background: C.coralDeep,
            color: C.white,
            border: 0,
            fontFamily: "Nunito, sans-serif",
            fontWeight: 800,
            fontSize: 13,
            cursor: (!!myVote || !token) ? "default" : "pointer",
            opacity: (!!myVote || !token) ? 0.6 : 1,
          }}
        >
          👎 No
          <span style={{ marginLeft: 4 }}>({suggestion.noCount})</span>
        </button>
        {myVote && (
          <span style={{ ...MICRO_LABEL, color: C.textBody }}>
            You: {myVote}
          </span>
        )}
      </div>
    </div>
  );
}
