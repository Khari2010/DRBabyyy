import { useNavigate } from "react-router-dom";
import { playerBySlug } from "../data/players.js";
import { C } from "../data/colors.js";
import { clearSession } from "../lib/session.js";

export default function LoggedInChip({ slug, onLogout }) {
  const navigate = useNavigate();
  const player = playerBySlug(slug);
  if (!player) return null;

  return (
    <div style={{
      position: "fixed", top: 16, right: 16, zIndex: 900,
      background: "white", borderRadius: 999, padding: "8px 14px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      display: "flex", alignItems: "center", gap: 10,
      fontFamily: "Nunito, sans-serif", fontWeight: 800,
    }}>
      <span style={{ fontSize: 20 }}>{player.emoji}</span>
      <button
        onClick={() => navigate(`/player/${player.slug}`)}
        style={{ background: player.color, color: "white", border: "none", padding: "6px 10px", borderRadius: 999, cursor: "pointer", fontWeight: 800 }}
      >
        Go to your page
      </button>
      <button
        onClick={() => {
          clearSession();
          onLogout?.();
        }}
        style={{ background: "transparent", border: "none", color: C.textBody, cursor: "pointer" }}
      >
        Log out
      </button>
    </div>
  );
}
