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
import ProposedRow from "../components/ProposedRow.jsx";

const ACCENT = C.coralDeep;

function ActivityDraftForm({ suggestion, onDone }) {
  const session = useSession();
  const token = session?.token;
  const draft = useMutation(api.activitySuggestions.draft);
  const [category, setCategory] = useState("");
  const [cost, setCost] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    if (!category) { alert("Need category"); return; }
    try {
      await draft({ token, suggestionId: suggestion._id, category, cost: cost || undefined });
      onDone();
    } catch (err) { alert(err.message); }
  };
  return (
    <form onSubmit={submit} style={{ marginTop: 8, padding: 8, background: C.sand, borderRadius: 8 }}>
      <input value={category} onChange={(e) => setCategory(e.target.value)}
        placeholder="Category (excursion / dining / nightlife)"
        style={{ padding: 6, marginRight: 6, fontFamily: "Nunito, sans-serif" }} />
      <input value={cost} onChange={(e) => setCost(e.target.value)}
        placeholder="Cost (optional)"
        style={{ padding: 6, fontFamily: "Nunito, sans-serif" }} />
      <button type="submit"
        style={{ marginLeft: 6, padding: 6, background: C.green, color: C.white, border: 0, borderRadius: 4 }}>
        Send to vote
      </button>
    </form>
  );
}

function ActivityProposedRow({ suggestion }) {
  const session = useSession();
  const token = session?.token;
  const reject = useMutation(api.activitySuggestions.reject);
  const [drafting, setDrafting] = useState(false);
  return (
    <div style={{ padding: "8px 0", borderBottom: `1px solid ${C.sandDark}` }}>
      <div style={{ fontFamily: "'Dela Gothic One', sans-serif", color: C.dark }}>{suggestion.title}</div>
      {suggestion.notes && (
        <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 12, color: C.textBody }}>
          {suggestion.notes}
        </div>
      )}
      {!drafting && (
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <button type="button" onClick={() => setDrafting(true)}
            style={{ padding: "4px 10px", borderRadius: 6, background: C.sand, border: `1px solid ${C.sandDark}` }}>
            Draft
          </button>
          <button type="button"
            onClick={() => reject({ token, suggestionId: suggestion._id }).catch((e) => alert(e.message))}
            style={{ padding: "4px 10px", borderRadius: 6, background: C.coralDeep, color: C.white, border: 0 }}>
            Reject
          </button>
        </div>
      )}
      {drafting && (
        <ActivityDraftForm suggestion={suggestion} onDone={() => setDrafting(false)} />
      )}
    </div>
  );
}

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
  const trigger = useMutation(api.rollovers.trigger);
  const undoLast = useMutation(api.rollovers.undoLast);
  const resetGame = useMutation(api.admin.resetGame);

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

  const handleRollover = async () => {
    const label = state.gamesLive
      ? `Lock Day ${state.currentDayNumber}, reveal the loser, and start Day ${state.currentDayNumber + 1}?`
      : "Start the games (Day 1)?";
    if (!window.confirm(label)) return;
    const wasLive = state.gamesLive;
    try {
      await trigger({ token });
      if (wasLive) navigate("/leaderboard");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUndo = async () => {
    if (!window.confirm("Undo the last rollover? This deletes the most recent rollover row.")) return;
    try { await undoLast({ token }); } catch (err) { alert(err.message); }
  };

  const handleReset = async () => {
    if (!window.confirm("⚠️ WIPE all entries, vouches, rollovers, suggestions, and reset to pre-trip. Continue?")) return;
    try {
      await resetGame({ token });
      alert("Practice data wiped. Game state is now pre-trip.");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.sand }}>
      <LogoutChip />
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
                ? "Tap to lock today's scores and reveal the loser."
                : "Tap to kick off Day 1 and unlock claiming."}
            </div>
            <ActionButton onClick={handleRollover} variant="primary">
              {state.gamesLive
                ? `Trigger rollover → Day ${state.currentDayNumber + 1}`
                : "Start the games"}
            </ActionButton>
          </Card>
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
                <ActivityProposedRow key={s._id} suggestion={s} />
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
              <ActionButton onClick={handleUndo} variant="secondary">
                Undo last rollover
              </ActionButton>
              <ActionButton onClick={handleReset} variant="danger">
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
