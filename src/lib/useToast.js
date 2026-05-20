import { useEffect, useState } from "react";

const TOAST_EVENT = "drbabyyy:toast";
let counter = 0;

export function showToast({ message, icon, accent, action, durationMs = 3000 }) {
  const id = ++counter;
  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT, {
      detail: { id, message, icon, accent, action, durationMs },
    }),
  );
  return id;
}

export function dismissToast(id) {
  window.dispatchEvent(new CustomEvent(`${TOAST_EVENT}:dismiss`, { detail: { id } }));
}

export function useToastQueue() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const onPush = (e) => {
      const t = e.detail;
      setToasts((prev) => [...prev, t]);
      if (t.durationMs > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((x) => x.id !== t.id));
        }, t.durationMs);
      }
    };
    const onDismiss = (e) => {
      setToasts((prev) => prev.filter((x) => x.id !== e.detail.id));
    };
    window.addEventListener(TOAST_EVENT, onPush);
    window.addEventListener(`${TOAST_EVENT}:dismiss`, onDismiss);
    return () => {
      window.removeEventListener(TOAST_EVENT, onPush);
      window.removeEventListener(`${TOAST_EVENT}:dismiss`, onDismiss);
    };
  }, []);

  return toasts;
}
