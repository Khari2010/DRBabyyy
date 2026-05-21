import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { useGameState } from "../lib/useGameState.js";
import { C } from "../data/colors.js";
import { RADIUS, MICRO_LABEL, BODY } from "../data/design.js";
import { PLAYERS } from "../data/players.js";
import { useHolidayNameMap, displayName } from "../lib/displayName.js";
import SectionBand from "../components/primitives/SectionBand.jsx";
import Card from "../components/primitives/Card.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import Reveal from "../components/Reveal.jsx";
import LogoutChip from "../components/LogoutChip.jsx";
import BottomNav from "../components/BottomNav.jsx";
import ProposedRow from "../components/ProposedRow.jsx";
import ActivityProposedRow from "../components/ActivityProposedRow.jsx";
import AdminScavengerQueue from "../components/AdminScavengerQueue.jsx";
import AdminDisputeReviewQueue from "../components/AdminDisputeReviewQueue.jsx";
import AdminToast from "../components/AdminToast.jsx";
import ResetConfirmDialog from "../components/ResetConfirmDialog.jsx";

const ACCENT = C.coralDeep;

function ActionButton({ onClick, variant = "primary", children, disabled }) {
  const base = {
    width: "100%", padding: "12px 16px", borderRadius: RADIUS.md,
    fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 14,
    letterSpacing: 0.3, cursor: disabled ? "default" : "pointer",
    border: 0, opacity: disabled ? 0.5 : 1,
  };
  const variants = {
    primary: { background: C.green, color: C.white },
    secondary: { background: "transparent", color: C.coralDeep, border: `1.5px solid ${C.coralDeep}` },
    danger: { background: "transparent", color: C.coralDeep, border: `2px solid ${C.coralDeep}` },
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ ...base, ...variants[variant] }}>
      {children}
    </button>
  );
}

export default function AdminPage() {
  const session = useSession();
  const token = session?.token;
  const navigate = useNavigate();
  const isAdmin = useQuery(api.admin.isAdmin, token ? { token } : "skip");
  const state = useGameState();
  const lockDay = useMutation(api.rollovers.lockDay);
  const advance = useMutation(api.rollovers.advance);
  const undoLast = useMutation(api.rollovers.undoLast);
  const resetGame = useMutation(api.admin.resetGame);
  const breakTie = useMutation(api.admin.adminBreakFlowTie);
  const forceClose = useMutation(api.admin.adminForceCloseFlowVote);
  const flowState = useQuery(
    api.flowVotes.getFlowVoteState,
    token ? { token } : {},
  );
  const holidayMap = useHolidayNameMap();

  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [tieConfirmSlug, setTieConfirmSlug] = useState(null);

  const showError = (msg) => setToast({ kind: "error", message: msg });
  const showSuccess = (msg) => setToast({ kind: "success", message: msg });
  const dismissToast = () => setToast(null);

  const runAction = async (fn) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      showError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const allSuggestions = useQuery(api.suggestions.list, {}) ?? [];
  const proposed = allSuggestions.filter((s) => s.status === "proposed");
  const voting = allSuggestions.filter((s) => s.status === "voting");

  const allActSugg = useQuery(api.activitySuggestions.list, {}) ?? [];
  const actProposed = allActSugg.filter((s) => s.status === "proposed");
  const actVoting = allActSugg.filter((s) => s.status === "voting");

  if (!token) {
    return (
      <div style={{ minHeight: "100vh", background: C.sand }}>
        <SectionBand bg="sand" innerMaxWidth={520}>
          <Card><div style={{ ...BODY, textAlign: "center" }}>Please log in first.</div></Card>
        </SectionBand>
        <BottomNav />
      </div>
    );
  }
  if (isAdmin === undefined) {
    return (
      <div style={{ minHeight: "100vh", background: C.sand }}>
        <SectionBand bg="sand" innerMaxWidth={520}>
          <Card><div style={{ ...BODY, textAlign: "center" }}>Loading…</div></Card>
        </SectionBand>
        <BottomNav />
      </div>
    );
  }
  if (isAdmin === false) {
    return (
      <div style={{ minHeight: "100vh", background: C.sand }}>
        <SectionBand bg="sand" innerMaxWidth={520}>
          <Card><div style={{ ...BODY, textAlign: "center" }}>Admins only. Nice try.</div></Card>
        </SectionBand>
        <BottomNav />
      </div>
    );
  }

  const flowPhase = flowState?.phase;
  const canLock = state.gamesLive && flowPhase === "closed";
  const canAdvance = state.gamesLive && flowPhase === "resolved";

  const handleLockDay = () => {
    if (!window.confirm(`Lock Day ${state.currentDayNumber}? This computes the loser, picks the forfeit, and opens the Reveal flow on the Board.`)) return;
    runAction(() => lockDay({ token }));
  };

  const handleAdvance = () => {
    const label = state.gamesLive
      ? `Start Day ${state.currentDayNumber + 1}? This advances past today.`
      : "Start the games (Day 1)?";
    if (!window.confirm(label)) return;
    const wasLive = state.gamesLive;
    runAction(async () => {
      await advance({ token });
      if (wasLive) navigate("/leaderboard");
    });
  };

  const handleUndo = () => {
    if (!window.confirm("Undo the last rollover? This deletes the most recent rollover row.")) return;
    runAction(() => undoLast({ token }));
  };

  const handleReset = async () => {
    await runAction(async () => {
      await resetGame({ token });
      setResetOpen(false);
      showSuccess("Practice data wiped. Game state is now pre-trip.");
    });
  };

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

  const liveStatusText = (() => {
    if (!state.gamesLive) return "Tap to kick off Day 1 and unlock claiming.";
    if (flowPhase === "closed") return `Day ${state.currentDayNumber} is open. Lock it to compute the loser and start the Flow State vote.`;
    if (flowPhase === "voting") return `Day ${state.currentDayNumber} is locked. Flow State vote in progress — force-close it below if needed.`;
    if (flowPhase === "tied") return `Day ${state.currentDayNumber} is locked. Flow State vote tied — pick a winner below.`;
    if (flowPhase === "resolved") return `Day ${state.currentDayNumber} is closed. Advance to start Day ${state.currentDayNumber + 1}.`;
    return "";
  })();

  return (
    <div style={{ minHeight: "100vh", background: C.sand }}>
      <LogoutChip />
      <AdminToast toast={toast} onDismiss={dismissToast} />
      <ResetConfirmDialog
        open={resetOpen}
        onConfirm={handleReset}
        onCancel={() => setResetOpen(false)}
      />
      <SectionBand bg="sand" pad="40px 0 24px" innerMaxWidth={520}>
        <Reveal>
          <SectionHeader
            label="Backstage"
            title="Admin Console"
            accent={ACCENT}
            compact
          />
        </Reveal>

        <Reveal>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ ...MICRO_LABEL, color: ACCENT, marginBottom: 6 }}>Game state</div>
            <div style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 22, color: C.dark, marginBottom: 4 }}>
              {state.gamesLive ? `● LIVE · Day ${state.currentDayNumber}` : "○ Pre-trip"}
            </div>
            <div style={{ ...BODY, fontSize: 13, marginBottom: 14 }}>
              {liveStatusText}
            </div>
            {!state.gamesLive && (
              <ActionButton onClick={handleAdvance} variant="primary" disabled={busy}>
                Start the games
              </ActionButton>
            )}
            {state.gamesLive && canLock && (
              <ActionButton onClick={handleLockDay} variant="primary" disabled={busy}>
                🔒 Lock Day {state.currentDayNumber}
              </ActionButton>
            )}
            {state.gamesLive && canAdvance && (
              <ActionButton onClick={handleAdvance} variant="primary" disabled={busy}>
                ▶ Start Day {state.currentDayNumber + 1}
              </ActionButton>
            )}
          </Card>
        </Reveal>

        {flowPhase === "tied" && (
          <Reveal>
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
          </Reveal>
        )}

        {flowPhase === "voting" && (
          <Reveal>
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
          </Reveal>
        )}
      </SectionBand>

      <SectionBand bg="white" pad="32px 0" innerMaxWidth={520}>
        <Reveal>
          <SectionHeader
            label="Crowdsource"
            title="Suggestions"
            accent={C.coral}
            compact
          />
        </Reveal>
        <Reveal>
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
        </Reveal>
      </SectionBand>

      <SectionBand bg="white" pad="32px 0" innerMaxWidth={520}>
        <Reveal>
          <SectionHeader label="Crowdsource" title="Activity ideas" accent={C.turquoise} compact />
        </Reveal>
        <Reveal>
          <Card>
            <div style={{ ...MICRO_LABEL, color: C.textBody, marginBottom: 8 }}>
              Awaiting draft ({actProposed.length})
            </div>
            {actProposed.length === 0
              ? <div style={{ ...BODY, fontSize: 13 }}>No new ideas.</div>
              : actProposed.map((s) => (
                <ActivityProposedRow key={s._id} suggestion={s} onError={showError} />
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
        </Reveal>
      </SectionBand>

      <SectionBand bg="sand" pad="40px 0" innerMaxWidth={520}>
        <Reveal>
          <SectionHeader
            label="Admin · Verification"
            title="Disputed entries"
            tagline="Two dispute votes pause the entry. Restore it or confirm removal."
            accent={ACCENT}
            compact
          />
        </Reveal>
        <Reveal>
          <AdminDisputeReviewQueue />
        </Reveal>
      </SectionBand>

      <SectionBand bg="sand" pad="40px 0" innerMaxWidth={520}>
        <Reveal>
          <SectionHeader
            label="Admin · Photo audit"
            title="Scavenger photos"
            tagline="Tap a photo to inspect. Reject only what's faked or clearly wrong."
            accent={ACCENT}
            compact
          />
        </Reveal>
        <Reveal>
          <AdminScavengerQueue />
        </Reveal>
      </SectionBand>

      <SectionBand bg="sand" pad="32px 0 80px" innerMaxWidth={520}>
        <Reveal>
          <SectionHeader
            label="Caution"
            title="Edge actions"
            accent={C.coralDeep}
            tagline="Reversal and reset tools — use carefully."
            compact
          />
        </Reveal>
        <Reveal>
          <Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <ActionButton onClick={handleUndo} variant="secondary" disabled={busy}>
                Undo last rollover
              </ActionButton>
              <ActionButton onClick={() => setResetOpen(true)} variant="danger" disabled={busy}>
                ⚠️ Reset practice data
              </ActionButton>
            </div>
          </Card>
        </Reveal>
      </SectionBand>

      <BottomNav />
    </div>
  );
}
