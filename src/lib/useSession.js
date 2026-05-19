import { useEffect, useState } from "react";
import { loadSession, SESSION_EVENT } from "./session.js";

// Reactive hook that returns the current session object {slug, token} or null.
// Updates when saveSession/clearSession are called in this tab (via custom
// event) or when localStorage changes in another tab (storage event).
export function useSession() {
  const [session, setSession] = useState(() => loadSession());

  useEffect(() => {
    const refresh = () => setSession(loadSession());
    window.addEventListener(SESSION_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(SESSION_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return session;
}
