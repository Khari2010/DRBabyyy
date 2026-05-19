import { useQuery } from "convex/react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { C } from "../data/colors.js";

const NAV_HEIGHT = 64;

function navItems(slug, isAdmin) {
  const items = [
    { to: `/player/${slug}`, icon: "🏖️", label: "Home", match: (p) => p === `/player/${slug}` },
    { to: `/player/${slug}/games`, icon: "🎯", label: "Games", match: (p) => p.startsWith(`/player/${slug}/games`) },
    { to: "/leaderboard", icon: "🏆", label: "Board", match: (p) => p.startsWith("/leaderboard") },
  ];
  if (isAdmin) {
    items.push({ to: "/admin", icon: "⚙️", label: "Admin", match: (p) => p.startsWith("/admin") });
  }
  return items;
}

export default function BottomNav() {
  const session = useSession();
  const location = useLocation();
  const isAdmin = useQuery(api.admin.isAdmin, session?.token ? { token: session.token } : "skip") === true;

  if (!session) return null;

  const items = navItems(session.slug, isAdmin);

  return (
    <>
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: NAV_HEIGHT,
          background: C.white,
          borderTop: `1px solid ${C.sandDark}`,
          display: "flex",
          justifyContent: "space-around",
          alignItems: "stretch",
          zIndex: 90,
          paddingBottom: "env(safe-area-inset-bottom, 0)",
        }}
      >
        {items.map((it) => {
          const active = it.match(location.pathname);
          return (
            <Link
              key={it.to}
              to={it.to}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                textDecoration: "none",
                color: active ? C.dark : C.textBody,
                fontWeight: active ? 700 : 500,
                fontSize: 11,
              }}
            >
              <span style={{ fontSize: 22, lineHeight: 1, opacity: active ? 1 : 0.55 }}>
                {it.icon}
              </span>
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>
      {/* Spacer so page content isn't hidden behind the fixed nav */}
      <div style={{ height: NAV_HEIGHT, paddingBottom: "env(safe-area-inset-bottom, 0)" }} aria-hidden />
    </>
  );
}
