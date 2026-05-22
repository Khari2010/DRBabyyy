import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSession } from "../../lib/useSession.js";
import { C } from "../../data/colors.js";
import { RADIUS } from "../../data/design.js";
import { PLAYERS } from "../../data/players.js";
import { useHolidayNameMap, displayName } from "../../lib/displayName.js";
import Card from "../primitives/Card.jsx";

export default function FlowStateAdminControls({ onError, busy, runAction }) {
  const session = useSession();
  const token = session?.token;
  const flowState = useQuery(
    api.flowVotes.getFlowVoteState,
    token ? { token } : {},
  );
  const breakTie = useMutation(api.admin.adminBreakFlowTie);
  const forceClose = useMutation(api.admin.adminForceCloseFlowVote);
  const holidayMap = useHolidayNameMap();
  const [tieConfirmSlug, setTieConfirmSlug] = useState(null);

  const flowPhase = flowState?.phase;

  const handleBreakTie = (slug) => {
    runAction(async () => {
      await breakTie({ token, voteeSlug: slug });
      setTieConfirmSlug(null);
    });
  };

  const handleForceClose = () => {
    if (!window.confirm("Force close Flow State vote with the votes cast so far?")) return;
    runAction(() => forceClose({ token }));
  };

  if (flowPhase === "tied") {
    return (
      <Card style={{ padding: 16, marginBottom: 12, border: `2px solid ${C.gold}` }}>
        <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 14, color: C.dark }}>
          Tie: pick the Max Flow State winner
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
          {flowState.candidates?.map((slug) => {
            const p = PLAYERS.find((x) => x.slug === slug);
            const isConfirming = tieConfirmSlug === slug;
            if (isConfirming) {
              return (
                <span
                  key={slug}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: C.sand,
                    border: `1px solid ${C.gold}`,
                    fontFamily: "Nunito, sans-serif",
                    fontSize: 12,
                    color: C.dark,
                  }}
                >
                  Pick {displayName(slug, holidayMap, p?.name)}?
                  <button
                    type="button"
                    onClick={() => handleBreakTie(slug)}
                    disabled={busy}
                    style={{
                      padding: "4px 10px",
                      borderRadius: RADIUS.sm,
                      background: C.gold,
                      color: C.dark,
                      border: 0,
                      fontFamily: "Nunito, sans-serif",
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: busy ? "default" : "pointer",
                      opacity: busy ? 0.6 : 1,
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setTieConfirmSlug(null)}
                    disabled={busy}
                    style={{
                      padding: "4px 10px",
                      borderRadius: RADIUS.sm,
                      background: C.white,
                      color: C.textBody,
                      border: `1px solid ${C.sandDark}`,
                      fontFamily: "Nunito, sans-serif",
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: busy ? "default" : "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </span>
              );
            }
            return (
              <button
                key={slug}
                type="button"
                onClick={() => setTieConfirmSlug(slug)}
                disabled={busy || tieConfirmSlug !== null}
                style={{
                  border: `1px solid ${C.sandDark}`,
                  borderRadius: 999,
                  padding: "8px 14px",
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 700,
                  fontSize: 13,
                  background: C.white,
                  color: C.dark,
                  cursor: busy || tieConfirmSlug !== null ? "default" : "pointer",
                  opacity: busy || (tieConfirmSlug !== null && tieConfirmSlug !== slug) ? 0.5 : 1,
                }}
              >
                {displayName(slug, holidayMap, p?.name)}
              </button>
            );
          })}
        </div>
      </Card>
    );
  }

  if (flowPhase === "voting") {
    return (
      <button
        type="button"
        onClick={handleForceClose}
        disabled={busy}
        style={{
          marginBottom: 12,
          padding: "10px 14px",
          borderRadius: RADIUS.md,
          background: C.gold,
          color: C.dark,
          border: 0,
          fontFamily: "Nunito, sans-serif",
          fontWeight: 800,
          fontSize: 13,
          cursor: busy ? "default" : "pointer",
          opacity: busy ? 0.6 : 1,
        }}
      >
        Force close Flow State vote
      </button>
    );
  }

  return null;
}
