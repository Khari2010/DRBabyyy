import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { C } from "../../data/colors.js";
import { MICRO_LABEL, BODY } from "../../data/design.js";
import Card from "../primitives/Card.jsx";
import ProposedRow from "../ProposedRow.jsx";

export default function SuggestionsAdminCard() {
  const allSuggestions = useQuery(api.suggestions.list, {}) ?? [];
  const proposed = allSuggestions.filter((s) => s.status === "proposed");
  const voting = allSuggestions.filter((s) => s.status === "voting");

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ ...MICRO_LABEL, color: C.textBody, marginBottom: 8 }}>
        Awaiting draft ({proposed.length})
      </div>
      {proposed.length === 0 ? (
        <div style={{ ...BODY, fontSize: 13 }}>No new suggestions.</div>
      ) : (
        proposed.map((s) => <ProposedRow key={s._id} suggestion={s} isAdmin={true} />)
      )}
      {voting.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.sandDark}` }}>
          <div style={{ ...MICRO_LABEL, color: C.textBody, marginBottom: 8 }}>
            Currently voting ({voting.length})
          </div>
          {voting.map((s) => (
            <div key={s._id} style={{
              padding: "6px 0", fontFamily: "Nunito, sans-serif", fontSize: 13,
            }}>
              {s.title} — {s.points} pts · 👍 {s.yesCount} 👎 {s.noCount}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
