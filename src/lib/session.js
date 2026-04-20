export const SESSION_KEY = "drbabyyy.session";

export function saveSession({ slug, token }) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ slug, token }));
}

export function loadSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.slug === "string" && typeof parsed.token === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
