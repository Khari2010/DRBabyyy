import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { C } from "../data/colors.js";

export default function RoomNumberEditor({ defaultCollapsed = false }) {
  const session = useSession();
  const token = session?.token;
  const current = useQuery(api.players.myRoomNumber, token ? { token } : "skip");
  const setMy = useMutation(api.players.setMyRoomNumber);
  const clearMy = useMutation(api.players.clearMyRoomNumber);
  const [value, setValue] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (defaultCollapsed && current) setCollapsed(true);
    if (current && !value) setValue(current);
  }, [current, defaultCollapsed, value]);

  if (!token) return null;

  const handleSave = async (e) => {
    e?.preventDefault?.();
    if (!value.trim()) return;
    setSubmitting(true);
    try {
      await setMy({ token, roomNumber: value });
      if (defaultCollapsed) setCollapsed(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = async () => {
    if (!confirm("Clear your room number?")) return;
    try {
      await clearMy({ token });
      setValue("");
      setCollapsed(false);
    } catch (err) {
      alert(err.message);
    }
  };

  if (collapsed && current) {
    return (
      <div
        style={{
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
        <span style={{ flex: 1 }}>
          🏨 Room <strong>{current}</strong>
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
    <form
      onSubmit={handleSave}
      style={{
        padding: 12,
        borderRadius: 10,
        background: C.sand,
        fontFamily: "Nunito, sans-serif",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: C.coralDeep,
          marginBottom: 6,
        }}
      >
        Your room number
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. 415"
          maxLength={16}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 8,
            border: `1px solid ${C.sandDark}`,
            fontFamily: "Nunito, sans-serif",
            fontSize: 14,
          }}
        />
        <button
          type="submit"
          disabled={submitting || !value.trim()}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: C.green,
            color: C.white,
            border: 0,
            fontFamily: "Nunito, sans-serif",
            fontWeight: 800,
            fontSize: 13,
            cursor: submitting ? "default" : "pointer",
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? "..." : "Save"}
        </button>
      </div>
      {current && (
        <button
          type="button"
          onClick={handleClear}
          style={{
            marginTop: 8,
            padding: "4px 10px",
            borderRadius: 6,
            background: "transparent",
            border: 0,
            color: C.textBody,
            fontFamily: "Nunito, sans-serif",
            fontSize: 11,
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Clear
        </button>
      )}
    </form>
  );
}
