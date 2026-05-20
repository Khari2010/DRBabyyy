import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PLAYERS } from "../data/players.js";
import { useSession } from "../lib/useSession.js";
import { useHolidayNameMap, displayName } from "../lib/displayName.js";
import { C } from "../data/colors.js";
import { RADIUS } from "../data/design.js";
import Card from "./primitives/Card.jsx";
import Pill from "./primitives/Pill.jsx";

export default function FlowStateVoteCard() {
  const session = useSession();
  const state = useQuery(
    api.flowVotes.getFlowVoteState,
    session?.token ? { token: session.token } : {},
  );
  const cast = useMutation(api.flowVotes.castFlowVote);
  const holidayMap = useHolidayNameMap();

  if (!state || state.phase === "closed" || state.phase === "resolved") return null;

  if (state.phase === "tied") {
    return (
      <Card style={{ padding: 14, marginBottom: 12 }}>
        <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 14, color: C.dark }}>
          Tied — admin is picking
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {state.candidates?.map((slug) => {
            const p = PLAYERS.find((x) => x.slug === slug);
            return (
              <Pill key={slug} as="span">
                {displayName(slug, holidayMap, p?.name)}
              </Pill>
            );
          })}
        </div>
      </Card>
    );
  }

  // phase === "voting"
  return (
    <Card style={{ padding: 14, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 14, color: C.dark }}>
          Vote: Max Flow State today
        </div>
        <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 12, color: C.textBody }}>
          {state.votedCount} of {state.totalCrew} voted
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
        {PLAYERS.map((p) => {
          const picked = state.myVoteSlug === p.slug;
          const isMe = session?.slug === p.slug;
          return (
            <button
              key={p.slug}
              onClick={() => session?.token && cast({ token: session.token, voteeSlug: p.slug })}
              style={{
                border: picked ? `2px solid ${C.gold}` : `1px solid ${C.sandDark}`,
                background: picked ? `${C.gold}22` : "transparent",
                borderRadius: RADIUS.pill, padding: "6px 10px",
                fontFamily: "Nunito, sans-serif", fontWeight: 700, fontSize: 12, color: C.dark,
                display: "inline-flex", alignItems: "center", gap: 4,
                cursor: "pointer",
              }}
            >
              {picked && "✓ "}
              {displayName(p.slug, holidayMap, p.name)}
              {isMe && <span style={{ opacity: 0.6 }}>(you)</span>}
            </button>
          );
        })}
      </div>
      {state.myVoteSlug && (
        <div style={{ marginTop: 8, fontFamily: "Nunito, sans-serif", fontSize: 11, color: C.textBody }}>
          Tap to change your pick.
        </div>
      )}
    </Card>
  );
}
