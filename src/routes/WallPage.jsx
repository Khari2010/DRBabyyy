import BottomNav from "../components/BottomNav.jsx";
import PostComposer from "../components/wall/PostComposer.jsx";
import NotificationsBanner from "../components/wall/NotificationsBanner.jsx";
import PostCard from "../components/wall/PostCard.jsx";
import { useSession } from "../lib/useSession.js";
import { useWallPagination } from "../lib/useWallPagination.js";
import { C } from "../data/colors.js";

export default function WallPage() {
  const session = useSession();
  const { results, status, sentinelRef } = useWallPagination(session?.token);

  return (
    <div style={{ background: C.sand, minHeight: "100vh", paddingBottom: 24 }}>
      <header style={{ padding: "20px 20px 12px" }}>
        <h1 style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 28, color: C.dark, margin: 0 }}>
          The Wall
        </h1>
      </header>
      <main style={{ padding: "0 20px" }}>
        <NotificationsBanner />
        <PostComposer />
        {(results ?? []).map((post) => (
          <PostCard key={post._id} post={post} />
        ))}
        {status === "Exhausted" && results.length === 0 && (
          <div style={{ textAlign: "center", color: C.textBody, padding: 40 }}>
            Nothing yet — be the first to post.
          </div>
        )}
        <div ref={sentinelRef} style={{ height: 1 }} />
      </main>
      <BottomNav />
    </div>
  );
}
