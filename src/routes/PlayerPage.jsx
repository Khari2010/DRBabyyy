import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { loadSession, clearSession } from "../lib/session.js";
import { playerBySlug, V1_LOGIN_SLUGS } from "../data/players.js";
import { C } from "../data/colors.js";

export default function PlayerPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const session = loadSession();

  const isKnownSlug = V1_LOGIN_SLUGS.includes(slug ?? "");
  const slugMatches = session && session.slug === slug;

  const serverSession = useQuery(
    api.auth.getSession,
    session && slugMatches ? { token: session.token } : "skip",
  );

  useEffect(() => {
    if (!isKnownSlug) {
      navigate("/", { replace: true });
      return;
    }
    if (!session || !slugMatches) {
      navigate("/", { replace: true });
      return;
    }
    if (serverSession === null) {
      clearSession();
      navigate("/", { replace: true });
    }
  }, [isKnownSlug, session, slugMatches, serverSession, navigate]);

  if (!isKnownSlug || !session || !slugMatches || serverSession === undefined) {
    return <div style={{ padding: 40 }}>Loading…</div>;
  }
  if (serverSession === null) return null;

  const player = playerBySlug(slug);
  if (!player) return null;

  return (
    <div style={{ background: C.sand, minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "'Dela Gothic One', sans-serif", color: C.dark }}>
          {player.name}'s Page
        </h1>
      </div>
    </div>
  );
}
