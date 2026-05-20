import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { C } from "../data/colors.js";
import { RADIUS, MICRO_LABEL } from "../data/design.js";
import Card from "./primitives/Card.jsx";
import ProposeForm from "./ProposeForm.jsx";
import VotingRow from "./VotingRow.jsx";

export default function SuggestCallout() {
  const session = useSession();
  const slug = session?.slug;
  const allSuggestions = useQuery(api.suggestions.list, {}) ?? [];
  const myVoting = allSuggestions.filter((s) => s.status === "voting" && s.proposerSlug !== slug);
  const myProposed = allSuggestions.filter((s) => s.status === "proposed" && s.proposerSlug === slug);
  const recentApproved = allSuggestions.filter((s) => s.status === "approved").slice(-3);

  const [open, setOpen] = useState(myVoting.length > 0 || myProposed.length > 0);

  return (
    <div style={{ marginTop: 24 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", background: `${C.coralDeep}10`, border: `1px solid ${C.coralDeep}25`,
          borderRadius: RADIUS.md, padding: "12px 14px",
          display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
          fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 13, color: C.dark,
        }}
      >
        <span style={{ fontSize: 20 }}>💡</span>
        <span style={{ flex: 1, textAlign: "left" }}>
          Got a better one? Suggest a challenge
        </span>
        {myVoting.length > 0 && (
          <span style={{
            ...MICRO_LABEL, color: C.coralDeep, background: `${C.coralDeep}18`,
            borderRadius: 999, padding: "2px 8px",
          }}>
            {myVoting.length} to vote
          </span>
        )}
        <span style={{ color: C.textBody }}>{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <Card style={{ marginTop: 8 }}>
          <ProposeForm />
          {myProposed.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.sandDark}` }}>
              <div style={{ ...MICRO_LABEL, color: C.textBody, marginBottom: 6 }}>Your pending</div>
              {myProposed.map((s) => (
                <div key={s._id} style={{ fontFamily: "Nunito, sans-serif", fontSize: 13, padding: "2px 0" }}>
                  ⏳ {s.title} — awaiting admin
                </div>
              ))}
            </div>
          )}
          {myVoting.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.sandDark}` }}>
              <div style={{ ...MICRO_LABEL, color: C.coralDeep, marginBottom: 8 }}>Vote now</div>
              {myVoting.map((s) => <VotingRow key={s._id} suggestion={s} />)}
            </div>
          )}
          {recentApproved.length > 0 && (
            <div style={{
              marginTop: 12, fontSize: 12, color: C.textBody, fontFamily: "Nunito, sans-serif",
            }}>
              Recently approved: {recentApproved.map((s) => s.title).join(" · ")}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
