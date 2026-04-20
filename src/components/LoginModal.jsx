import { useState } from "react";
import { useAction, useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PLAYERS, V1_LOGIN_SLUGS } from "../data/players.js";
import { C } from "../data/colors.js";

const LOGIN_PLAYERS = PLAYERS.filter((p) => V1_LOGIN_SLUGS.includes(p.slug));

export default function LoginModal({ open, onClose, onSuccess }) {
  const [step, setStep] = useState("pick"); // "pick" | "first-time" | "returning"
  const [selected, setSelected] = useState(null);
  const [passcode, setPasscode] = useState("");
  const [passcodeConfirm, setPasscodeConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const setPasscodeAction = useAction(api.auth.setPasscode);
  const loginAction = useAction(api.auth.login);
  const convex = useConvex();

  if (!open) return null;

  const handlePickPlayer = async (player) => {
    setSelected(player);
    setError("");
    setBusy(true);
    try {
      const has = await convex.query(api.auth.hasPasscode, { slug: player.slug });
      setStep(has ? "returning" : "first-time");
    } catch {
      setStep("first-time");
    } finally {
      setBusy(false);
    }
  };

  const submitFirstTime = async () => {
    setError("");
    if (passcode.length !== 4 || !/^\d{4}$/.test(passcode)) {
      setError("Passcode must be 4 digits.");
      return;
    }
    if (passcode !== passcodeConfirm) {
      setError("Passcodes don't match.");
      return;
    }
    setBusy(true);
    try {
      const { token } = await setPasscodeAction({
        slug: selected.slug,
        passcode,
      });
      onSuccess({ slug: selected.slug, token });
    } catch (err) {
      setError(String(err?.message ?? err));
    } finally {
      setBusy(false);
    }
  };

  const submitReturning = async () => {
    setError("");
    if (passcode.length !== 4 || !/^\d{4}$/.test(passcode)) {
      setError("Passcode must be 4 digits.");
      return;
    }
    setBusy(true);
    try {
      const { token } = await loginAction({ slug: selected.slug, passcode });
      onSuccess({ slug: selected.slug, token });
    } catch (err) {
      setError("That passcode didn't work.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.sand, borderRadius: 20,
          padding: "clamp(20px, 5vw, 32px)",
          width: "min(480px, calc(100vw - 24px))",
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
          boxSizing: "border-box",
          fontFamily: "Nunito, sans-serif",
        }}
      >
        {step === "pick" && (
          <>
            <h2 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 24, marginBottom: 16, color: C.dark }}>
              Who are you?
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "clamp(8px, 2vw, 12px)" }}>
              {LOGIN_PLAYERS.map((p) => (
                <button
                  key={p.slug}
                  onClick={() => handlePickPlayer(p)}
                  disabled={busy}
                  style={{
                    background: p.color, border: "none", borderRadius: 16,
                    padding: "clamp(10px, 3vw, 16px)", cursor: "pointer", color: "white",
                    opacity: busy ? 0.6 : 1,
                    minWidth: 0,
                  }}
                >
                  {p.avatar ? (
                    <img
                      src={p.avatar}
                      alt={p.name}
                      style={{ width: "clamp(56px, 16vw, 72px)", height: "clamp(56px, 16vw, 72px)", borderRadius: "50%", objectFit: "cover", display: "block", margin: "0 auto", border: "3px solid rgba(255,255,255,0.9)" }}
                    />
                  ) : (
                    <div style={{ fontSize: 32 }}>{p.emoji}</div>
                  )}
                  <div style={{ fontWeight: 800, marginTop: 8, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === "first-time" && selected && (
          <>
            <h2 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 22, marginBottom: 8, color: C.dark }}>
              Set your passcode, {selected.name}
            </h2>
            <p style={{ color: C.textBody, marginBottom: 16 }}>
              Choose a 4-digit passcode. You'll use this to log in going forward.
            </p>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4}"
              maxLength={4}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value.replace(/\D/g, ""))}
              placeholder="4 digits"
              style={{ width: "100%", padding: 12, fontSize: 16, borderRadius: 8, border: `2px solid ${C.sandDark}`, marginBottom: 12, boxSizing: "border-box" }}
            />
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4}"
              maxLength={4}
              value={passcodeConfirm}
              onChange={(e) => setPasscodeConfirm(e.target.value.replace(/\D/g, ""))}
              placeholder="Confirm 4 digits"
              style={{ width: "100%", padding: 12, fontSize: 16, borderRadius: 8, border: `2px solid ${C.sandDark}`, marginBottom: 12, boxSizing: "border-box" }}
            />
            {error && <div style={{ color: C.coralDeep, marginBottom: 12 }}>{error}</div>}
            <button
              onClick={submitFirstTime}
              disabled={busy}
              style={{ width: "100%", padding: 14, background: selected.color, color: "white", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 16, cursor: "pointer", minHeight: 48, boxSizing: "border-box" }}
            >
              {busy ? "Saving…" : "Set passcode & enter"}
            </button>
          </>
        )}

        {step === "returning" && selected && (
          <>
            <h2 style={{ fontFamily: "'Dela Gothic One', sans-serif", fontSize: 22, marginBottom: 8, color: C.dark }}>
              Welcome back, {selected.name}
            </h2>
            <p style={{ color: C.textBody, marginBottom: 16 }}>Enter your 4-digit passcode.</p>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4}"
              maxLength={4}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value.replace(/\D/g, ""))}
              placeholder="4 digits"
              style={{ width: "100%", padding: 12, fontSize: 16, borderRadius: 8, border: `2px solid ${C.sandDark}`, marginBottom: 12, boxSizing: "border-box" }}
            />
            {error && <div style={{ color: C.coralDeep, marginBottom: 12 }}>{error}</div>}
            <button
              onClick={submitReturning}
              disabled={busy}
              style={{ width: "100%", padding: 14, background: selected.color, color: "white", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 16, cursor: "pointer", minHeight: 48, boxSizing: "border-box" }}
            >
              {busy ? "Checking…" : "Enter"}
            </button>
          </>
        )}

        <button
          onClick={onClose}
          style={{ marginTop: 16, background: "transparent", border: "none", color: C.textBody, cursor: "pointer", width: "100%", padding: 8 }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
