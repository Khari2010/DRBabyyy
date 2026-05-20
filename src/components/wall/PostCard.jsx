import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSession } from "../../lib/useSession.js";
import { formatRelative } from "../../lib/formatRelative.js";
import { C } from "../../data/colors.js";
import { RADIUS, SHADOW } from "../../data/design.js";
import ReactionRow from "./ReactionRow.jsx";
import ReplyThread from "./ReplyThread.jsx";
import PhotoLightbox from "../PhotoLightbox.jsx";

export default function PostCard({ post }) {
  const session = useSession();
  const isAdmin = useQuery(
    api.admin.isAdmin,
    session?.token ? { token: session.token } : "skip",
  ) === true;
  const remove = useMutation(api.posts.remove);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const canDelete = session?.slug === post.authorSlug || isAdmin;
  const initial = (post.authorHolidayName || post.authorSlug)[0]?.toUpperCase() ?? "?";

  return (
    <article
      id={`post-${post._id}`}
      style={{
        background: C.white,
        borderRadius: RADIUS.lg,
        boxShadow: SHADOW.card,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 16, background: C.coral, color: "white",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800,
          }}>{initial}</div>
          <div>
            <div style={{ fontWeight: 800, color: C.dark, fontSize: 14 }}>{post.authorHolidayName}</div>
            <div style={{ fontSize: 12, color: C.textBody }}>{formatRelative(post.createdAt)}</div>
          </div>
        </div>
        {canDelete && (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              style={{ background: "transparent", border: "none", color: C.textBody, fontSize: 22, cursor: "pointer" }}
              aria-label="Post menu"
            >⋯</button>
            {menuOpen && (
              <div style={{
                position: "absolute", right: 0, top: "100%",
                background: C.white, boxShadow: SHADOW.floating, borderRadius: RADIUS.md,
                padding: 6, zIndex: 5,
              }}>
                <button
                  onClick={async () => {
                    if (!confirm("Delete this post?")) return;
                    setMenuOpen(false);
                    await remove({ token: session.token, postId: post._id });
                  }}
                  style={{ background: "transparent", border: "none", color: C.coralDeep, padding: "6px 10px", cursor: "pointer", fontWeight: 700 }}
                >Delete</button>
              </div>
            )}
          </div>
        )}
      </header>

      {post.text && (
        <div style={{ fontSize: 15, color: C.dark, whiteSpace: "pre-wrap", lineHeight: 1.4 }}>
          {post.text}
        </div>
      )}

      {post.photoUrl && (
        <img
          src={post.photoUrl}
          alt=""
          onClick={() => setLightboxOpen(true)}
          style={{ width: "100%", borderRadius: RADIUS.md, marginTop: 10, cursor: "zoom-in", display: "block" }}
        />
      )}

      <ReactionRow
        postId={post._id}
        reactionCounts={post.reactionCounts}
        viewerReactions={post.viewerReactions}
      />

      <ReplyThread postId={post._id} commentCount={post.commentCount} isAdmin={isAdmin} />

      {lightboxOpen && post.photoUrl && (
        <PhotoLightbox src={post.photoUrl} onClose={() => setLightboxOpen(false)} />
      )}
    </article>
  );
}
