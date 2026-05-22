import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { C } from "../../data/colors.js";
import { MICRO_LABEL, BODY } from "../../data/design.js";
import Card from "../primitives/Card.jsx";
import ActivityProposedRow from "../ActivityProposedRow.jsx";

export default function ActivityIdeasAdminCard({ onError }) {
  const allActSugg = useQuery(api.activitySuggestions.list, {}) ?? [];
  const actProposed = allActSugg.filter((s) => s.status === "proposed");
  const actVoting = allActSugg.filter((s) => s.status === "voting");

  return (
    <Card>
      <div style={{ ...MICRO_LABEL, color: C.textBody, marginBottom: 8 }}>
        Awaiting draft ({actProposed.length})
      </div>
      {actProposed.length === 0
        ? <div style={{ ...BODY, fontSize: 13 }}>No new ideas.</div>
        : actProposed.map((s) => (
          <ActivityProposedRow key={s._id} suggestion={s} onError={onError} />
        ))}
      {actVoting.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.sandDark}` }}>
          <div style={{ ...MICRO_LABEL, color: C.textBody, marginBottom: 8 }}>
            Currently voting ({actVoting.length})
          </div>
          {actVoting.map((s) => (
            <div key={s._id} style={{
              padding: "6px 0", fontFamily: "Nunito, sans-serif", fontSize: 13,
            }}>
              {s.title} — {s.category} · 👍 {s.yesCount} 👎 {s.noCount}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
