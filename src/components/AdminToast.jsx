import { useEffect } from "react";
import { C } from "../data/colors.js";
import { RADIUS, SHADOW } from "../data/design.js";

const STYLES = {
  error: { bg: C.coralDeep, fg: C.white },
  success: { bg: C.green, fg: C.white },
};

export default function AdminToast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(onDismiss, 6000);
    return () => clearTimeout(id);
  }, [toast, onDismiss]);

  if (!toast) return null;
  const style = STYLES[toast.kind] ?? STYLES.error;

  return (
    <div
      role={toast.kind === "error" ? "alert" : "status"}
      style={{
        position: "fixed",
        left: "50%",
        top: 16,
        transform: "translateX(-50%)",
        zIndex: 100,
        maxWidth: "calc(100vw - 32px)",
        padding: "10px 14px",
        background: style.bg,
        color: style.fg,
        borderRadius: RADIUS.md,
        boxShadow: SHADOW.floating,
        fontFamily: "Nunito, sans-serif",
        fontSize: 13,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span style={{ whiteSpace: "pre-wrap" }}>{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          background: "transparent",
          color: style.fg,
          border: 0,
          fontSize: 16,
          fontWeight: 900,
          cursor: "pointer",
          padding: "0 4px",
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
