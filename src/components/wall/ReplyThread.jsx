import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSession } from "../../lib/useSession.js";
import { formatRelative } from "../../lib/formatRelative.js";
import { C } from "../../data/colors.js";
import { RADIUS } from "../../data/design.js";

const MAX = 280;

export default function ReplyThread({ postId, commentCount, isAdmin }) {
  const session = useSession();
  const [open, setOpen] = useState(false);
  const comments = useQuery(api.postComments.listByPost, open ? { postId } : "skip");
  const add = useMutation(api.postComments.add);
  const remove = useMutation(api.postComments.remove);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          background: "transparent",
          border: "none",
          color: C.textBody,
          padding: "6px 0 0",
          fontSize: 13,
          cursor: "pointer",
        }}
      >▸ {commentCount > 0 ? `${commentCount} ${commentCount === 1 ? "reply" : "replies"}` : "Reply"}</button>
    );
  }

  async function submit() {
    if (!session || draft.trim().length === 0 || busy) return;
    setBusy(true);
    const txt = draft.trim();
    setDraft("");
    try {
      await add({ token: session.token, postId, text: txt });
    } catch (err) {
      console.error(err);
      setDraft(txt);
      alert("Couldn't reply. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 8, paddingLeft: 12, borderLeft: `2px solid ${C.sandDark}` }}>
      {(comments ?? []).map((c) => (
        <div key={c._id} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: C.textBody, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700, color: C.dark }}>{c.authorHolidayName}</span>
            <span>
              {formatRelative(c.createdAt)}
              {(c.authorSlug === session?.slug || isAdmin) && (
                <button
                  onClick={async () => { await remove({ token: session.token, commentId: c._id }); }}
                  style={{ marginLeft: 8, background: "transparent", border: "none", color: C.textBody, cursor: "pointer" }}
                  aria-label="Delete reply"
                >×</button>
              )}
            </span>
          </div>
          <div style={{ fontSize: 14, color: C.dark }}>{c.text}</div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX))}
          placeholder="Reply…"
          style={{
            flex: 1,
            border: `1px solid ${C.sandDark}`,
            borderRadius: RADIUS.pill,
            padding: "6px 12px",
            fontSize: 14,
            outline: "none",
          }}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        />
        <button
          onClick={submit}
          disabled={draft.trim().length === 0 || busy}
          style={{
            background: draft.trim().length === 0 ? C.sandDark : C.coral,
            color: draft.trim().length === 0 ? C.textBody : "white",
            border: "none",
            borderRadius: RADIUS.pill,
            padding: "6px 14px",
            cursor: draft.trim().length === 0 ? "not-allowed" : "pointer",
            fontWeight: 700,
          }}
        >Send</button>
      </div>
      <button
        onClick={() => setOpen(false)}
        style={{ background: "transparent", border: "none", color: C.textBody, fontSize: 12, marginTop: 6, cursor: "pointer" }}
      >Hide replies</button>
    </div>
  );
}
