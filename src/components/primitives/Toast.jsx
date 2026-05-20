import { useToastQueue, dismissToast } from "../../lib/useToast.js";
import { C } from "../../data/colors.js";
import { RADIUS, SHADOW } from "../../data/design.js";

export default function ToastContainer() {
  const toasts = useToastQueue();
  if (toasts.length === 0) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 88, // sits above bottom nav (~64px) + 24px gap
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        alignItems: "center",
        padding: "0 16px",
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastItem({ toast }) {
  return (
    <div
      style={{
        background: C.dark,
        color: C.white,
        borderRadius: RADIUS.lg,
        boxShadow: SHADOW.dramatic,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        maxWidth: 420,
        width: "100%",
        pointerEvents: "auto",
        animation: "drToastSlideUp 0.4s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      {toast.icon && <span style={{ fontSize: 24, lineHeight: 1 }}>{toast.icon}</span>}
      <span
        style={{
          flex: 1,
          fontFamily: "Nunito, sans-serif",
          fontWeight: 700,
          fontSize: 14,
          color: toast.accent ?? C.white,
        }}
      >
        {toast.message}
      </span>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action.onClick();
            dismissToast(toast.id);
          }}
          style={{
            background: "transparent",
            border: `1px solid rgba(255,255,255,0.4)`,
            borderRadius: RADIUS.pill,
            color: C.white,
            fontFamily: "Nunito, sans-serif",
            fontWeight: 800,
            fontSize: 11,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            padding: "6px 12px",
            cursor: "pointer",
          }}
        >
          {toast.action.label}
        </button>
      )}
      <style>{`
        @keyframes drToastSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
