import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { useHolidayNameMap, displayName } from "../lib/displayName.js";
import { C } from "../data/colors.js";

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
