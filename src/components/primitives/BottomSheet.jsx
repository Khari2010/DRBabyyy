import { useEffect, useRef } from "react";
import { C } from "../../data/colors.js";
import { RADIUS, SHADOW } from "../../data/design.js";

export default function BottomSheet({ open, onClose, children, maxHeight = "85vh" }) {
  const sheetRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open && sheetRef.current) {
      const focusable = sheetRef.current.querySelector(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
      );
      focusable?.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(26,26,46,0.55)",
        zIndex: 150,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        animation: "drSheetFade 0.3s ease",
      }}
    >
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.white,
          borderRadius: `${RADIUS.xl}px ${RADIUS.xl}px 0 0`,
          boxShadow: SHADOW.dramatic,
          width: "100%",
          maxWidth: 520,
          maxHeight,
          overflowY: "auto",
          padding: "12px 20px 24px",
          animation: "drSheetSlideUp 0.4s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 40,
            height: 4,
            borderRadius: 999,
            background: "rgba(0,0,0,0.18)",
            margin: "0 auto 16px",
          }}
        />
        {children}
      </div>
      <style>{`
        @keyframes drSheetFade {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes drSheetSlideUp {
          from { transform: translateY(100%); } to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
