import { Link } from "react-router-dom";
import BottomNav from "../components/BottomNav.jsx";
import PostComposer from "../components/wall/PostComposer.jsx";
import NotificationsBanner from "../components/wall/NotificationsBanner.jsx";
import PostCard from "../components/wall/PostCard.jsx";
import { useSession } from "../lib/useSession.js";
import { useWallPagination } from "../lib/useWallPagination.js";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { C } from "../data/colors.js";
import { RADIUS, SHADOW } from "../data/design.js";

export default function WallPage() {
  const session = useSession();
  const isAdmin = useQuery(
    api.admin.isAdmin,
    session?.token ? { token: session.token } : "skip",
  ) === true;
  const { results, status, sentinelRef } = useWallPagination(session?.token);

  return (
    <div style={{ background: C.sand, minHeight: "100vh", paddingBottom: 24 }}>
      <header style={{ padding: "20px 20px 12px" }}>
        <h1 style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 28, color: C.dark, margin: 0 }}>
          The Wall
        </h1>
      </header>
      <main style={{ padding: "0 20px" }}>
        {!session ? (
          <div style={{
            background: C.white,
            borderRadius: RADIUS.lg,
            boxShadow: SHADOW.card,
            padding: 20,
            textAlign: "center",
          }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: C.dark, marginBottom: 6 }}>
              Log in to see the wall
            </div>
            <div style={{ fontSize: 13, color: C.textBody, marginBottom: 14 }}>
              Tap your name on the home page and enter your passcode.
            </div>
            <Link
              to="/"
              style={{
                display: "inline-block",
                background: C.coral,
                color: "white",
                textDecoration: "none",
                borderRadius: RADIUS.pill,
                padding: "8px 18px",
                fontFamily: "Nunito, sans-serif",
                fontWeight: 800,
                fontSize: 14,
              }}
            >Go to home</Link>
          </div>
        ) : (
          <>
            <NotificationsBanner />
            <PostComposer />
            {(results ?? []).map((post) => (
              <PostCard key={post._id} post={post} isAdmin={isAdmin} />
            ))}
            {status === "Exhausted" && results.length === 0 && (
              <div style={{ textAlign: "center", color: C.textBody, padding: 40 }}>
                Nothing yet — be the first to post.
              </div>
            )}
            <div ref={sentinelRef} style={{ height: 1 }} />
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
