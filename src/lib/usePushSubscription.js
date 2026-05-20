import { useEffect, useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "./useSession.js";

// State values: "unsupported" | "needs-install" | "default" | "granted" | "denied"

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function usePushSubscription() {
  const session = useSession();
  const subscribe = useMutation(api.pushNotifications.subscribe);
  const unsubscribeMut = useMutation(api.pushNotifications.unsubscribe);
  const [state, setState] = useState("unsupported");

  const compute = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches
      || window.navigator.standalone === true;
    if (!standalone) {
      setState("needs-install");
      return;
    }
    const perm = Notification.permission;
    if (perm === "denied") { setState("denied"); return; }
    if (perm === "default") { setState("default"); return; }

    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (!existing && session?.token) {
      // silent re-subscribe
      try {
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
        });
        const json = sub.toJSON();
        await subscribe({
          token: session.token,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          userAgent: navigator.userAgent,
        });
      } catch (err) {
        console.warn("silent re-subscribe failed:", err);
      }
    }
    setState("granted");
  }, [session?.token, subscribe]);

  useEffect(() => { compute(); }, [compute]);

  const requestPermission = useCallback(async () => {
    if (!session?.token) return;
    const perm = await Notification.requestPermission();
    if (perm !== "granted") { await compute(); return; }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
    });
    const json = sub.toJSON();
    await subscribe({
      token: session.token,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      userAgent: navigator.userAgent,
    });
    await compute();
  }, [session?.token, subscribe, compute]);

  const unsubscribe = useCallback(async () => {
    if (!session?.token) return;
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await unsubscribeMut({ token: session.token, endpoint: existing.endpoint });
      await existing.unsubscribe();
    }
    await compute();
  }, [session?.token, unsubscribeMut, compute]);

  return { state, requestPermission, unsubscribe };
}
