import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { useGameState } from "../lib/useGameState.js";
import { C } from "../data/colors.js";
import { RADIUS, MICRO_LABEL, BODY } from "../data/design.js";
import SectionBand from "../components/primitives/SectionBand.jsx";
import Card from "../components/primitives/Card.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import Reveal from "../components/Reveal.jsx";
import LogoutChip from "../components/LogoutChip.jsx";
import BottomNav from "../components/BottomNav.jsx";
import AdminScavengerQueue from "../components/AdminScavengerQueue.jsx";
import AdminDisputeReviewQueue from "../components/AdminDisputeReviewQueue.jsx";
import AdminToast from "../components/AdminToast.jsx";
import ResetConfirmDialog from "../components/ResetConfirmDialog.jsx";
import SectionErrorBoundary from "../components/SectionErrorBoundary.jsx";
import SuggestionsAdminCard from "../components/admin/SuggestionsAdminCard.jsx";
import ActivityIdeasAdminCard from "../components/admin/ActivityIdeasAdminCard.jsx";
import FlowStateAdminControls from "../components/admin/FlowStateAdminControls.jsx";

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

  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

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
              {state.gamesLive
                ? "Lock today's scores first (this picks the loser and opens the Flow vote). Then advance once Flow State is resolved."
                : "Tap to kick off Day 1 and unlock claiming."}
            </div>
            {!state.gamesLive && (
              <ActionButton onClick={handleAdvance} variant="primary" disabled={busy}>
                Start the games
              </ActionButton>
            )}
            {state.gamesLive && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <ActionButton onClick={handleLockDay} variant="primary" disabled={busy}>
                  🔒 Lock Day {state.currentDayNumber}
                </ActionButton>
                <ActionButton onClick={handleAdvance} variant="primary" disabled={busy}>
                  ▶ Start Day {state.currentDayNumber + 1}
                </ActionButton>
              </div>
            )}
          </Card>
        </Reveal>

        <Reveal>
          <SectionErrorBoundary label="Flow State controls">
            <FlowStateAdminControls busy={busy} runAction={runAction} />
          </SectionErrorBoundary>
        </Reveal>
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
          <SectionErrorBoundary label="Suggestions">
            <SuggestionsAdminCard />
          </SectionErrorBoundary>
        </Reveal>
      </SectionBand>

      <SectionBand bg="white" pad="32px 0" innerMaxWidth={520}>
        <Reveal>
          <SectionHeader label="Crowdsource" title="Activity ideas" accent={C.turquoise} compact />
        </Reveal>
        <Reveal>
          <SectionErrorBoundary label="Activity ideas">
            <ActivityIdeasAdminCard onError={showError} />
          </SectionErrorBoundary>
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
          <SectionErrorBoundary label="Disputed entries">
            <AdminDisputeReviewQueue />
          </SectionErrorBoundary>
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
          <SectionErrorBoundary label="Scavenger photos">
            <AdminScavengerQueue />
          </SectionErrorBoundary>
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
