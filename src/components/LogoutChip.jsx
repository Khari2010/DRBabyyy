import { useNavigate } from "react-router-dom";
import { useSession } from "../lib/useSession.js";
import { clearSession } from "../lib/session.js";
import { C } from "../data/colors.js";
import { RADIUS } from "../data/design.js";

export default function LogoutChip() {
  const session = useSession();
  const navigate = useNavigate();

  if (!session) return null;

  const handleLogout = () => {
    clearSession();
    navigate("/", { replace: true });
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      style={{
        position: "fixed",
        top: "max(12px, env(safe-area-inset-top, 0px))",
        right: 12,
        zIndex: 80,
        padding: "8px 14px",
        borderRadius: RADIUS.pill,
        background: "rgba(255,255,255,0.92)",
        border: `1px solid ${C.sandDark}`,
        color: C.dark,
        fontFamily: "Nunito, sans-serif",
        fontWeight: 800,
        fontSize: 12,
        letterSpacing: 0.3,
        cursor: "pointer",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      Log out
    </button>
  );
}
