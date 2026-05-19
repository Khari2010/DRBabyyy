import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { C } from "../data/colors.js";

const MAX_LENGTH = 24;

export default function HolidayNameEditor({ token, legalName, accent = C.coral, defaultCollapsed = false }) {
  const current = useQuery(api.players.myHolidayName, token ? { token } : "skip");
  const setMutation = useMutation(api.players.setMyHolidayName);
  const clearMutation = useMutation(api.players.clearMyHolidayName);

  const [value, setValue] = useState("");
  const [status, setStatus] = useState({ kind: "idle", message: "" });
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (current !== undefined && current !== null) {
      setValue(current);
      if (defaultCollapsed && current) {
        setCollapsed(true);
      }
    }
  }, [current, defaultCollapsed]);

  const hasUnsavedChange = (current ?? "") !== value.trim();
  const trimmedLength = value.trim().length;

  const handleSave = async () => {
    setStatus({ kind: "saving", message: "" });
    try {
      const result = await setMutation({ token, holidayName: value });
      setValue(result.holidayName);
      setStatus({ kind: "saved", message: "Saved." });
      if (defaultCollapsed) setCollapsed(true);
    } catch (e) {
      setStatus({ kind: "error", message: e?.message ?? "Couldn't save." });
    }
  };

  const handleClear = async () => {
    setStatus({ kind: "saving", message: "" });
    try {
      await clearMutation({ token });
      setValue("");
      setStatus({ kind: "saved", message: "Cleared." });
    } catch (e) {
      setStatus({ kind: "error", message: e?.message ?? "Couldn't clear." });
    }
  };

  if (collapsed) {
    return (
      <div
        style={{
          maxWidth: 560,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          background: C.sand,
          borderRadius: 8,
          fontFamily: "Nunito, sans-serif",
          fontSize: 13,
        }}
      >
        <span style={{ flex: 1, fontWeight: 500, color: C.textBody }}>
          Holiday name: <strong>{current}</strong>
        </span>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          style={{
            padding: "4px 10px",
            borderRadius: 6,
            background: "transparent",
            border: `1px solid ${C.dark}`,
            color: C.dark,
            fontFamily: "Nunito, sans-serif",
            fontWeight: 800,
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 560,
        margin: "0 auto",
        padding: "20px 24px",
        background: C.white,
        borderRadius: 16,
        boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
        border: `1px solid ${C.sandDark}`,
      }}
    >
      <div
        style={{
          fontFamily: "Nunito, sans-serif",
          fontWeight: 800,
          fontSize: 11,
          color: C.white,
          background: accent,
          padding: "4px 12px",
          borderRadius: 16,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          display: "inline-block",
          marginBottom: 10,
        }}
      >
        Your Holiday Name
      </div>
      <div
        style={{
          fontFamily: "Nunito, sans-serif",
          color: C.textBody,
          fontSize: 14,
          fontWeight: 500,
          marginBottom: 14,
          lineHeight: 1.5,
        }}
      >
        The name the crew calls you on holiday. Shown on the leaderboard,
        suggestions, and your downloadable lockscreen. Leave blank to use
        <strong> {legalName}</strong>.
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (status.kind !== "idle") setStatus({ kind: "idle", message: "" });
          }}
          maxLength={MAX_LENGTH}
          placeholder={legalName}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 10,
            border: `1px solid ${C.sandDark}`,
            fontFamily: "Nunito, sans-serif",
            fontWeight: 700,
            fontSize: 16,
            color: C.dark,
            background: C.sand,
            outline: "none",
            minWidth: 0,
          }}
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasUnsavedChange || trimmedLength === 0 || status.kind === "saving"}
          style={{
            background: hasUnsavedChange && trimmedLength > 0 ? accent : C.sandDark,
            color: C.white,
            border: "none",
            borderRadius: 10,
            padding: "10px 16px",
            fontFamily: "Nunito, sans-serif",
            fontWeight: 800,
            fontSize: 13,
            letterSpacing: 0.5,
            cursor: hasUnsavedChange && trimmedLength > 0 ? "pointer" : "default",
            minWidth: 84,
          }}
        >
          {status.kind === "saving" ? "Saving…" : "Save"}
        </button>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 10,
          fontFamily: "Nunito, sans-serif",
          fontSize: 12,
          color: C.textBody,
        }}
      >
        <span style={{ opacity: 0.7 }}>
          {trimmedLength}/{MAX_LENGTH}
        </span>
        <span>
          {status.kind === "error" && (
            <span style={{ color: C.coralDeep ?? "#C2410C", fontWeight: 700 }}>
              {status.message}
            </span>
          )}
          {status.kind === "saved" && (
            <span style={{ color: accent, fontWeight: 700 }}>{status.message}</span>
          )}
          {current && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                marginLeft: 12,
                background: "transparent",
                border: "none",
                color: C.textBody,
                fontFamily: "Nunito, sans-serif",
                fontWeight: 700,
                fontSize: 12,
                textDecoration: "underline",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Clear
            </button>
          )}
        </span>
      </div>
    </div>
  );
}
