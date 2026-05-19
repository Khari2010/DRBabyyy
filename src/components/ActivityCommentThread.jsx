import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { PLAYERS } from "../data/players.js";
import { C } from "../data/colors.js";
import { MICRO_LABEL } from "../data/design.js";
import Avatar from "./primitives/Avatar.jsx";

function nameOf(slug) {
  return PLAYERS.find((p) => p.slug === slug)?.name ?? slug;
}
function playerOf(slug) {
  return PLAYERS.find((p) => p.slug === slug);
}

export default function ActivityCommentThread({ activityId }) {
  const session = useSession();
  const token = session?.token;
  const comments = useQuery(api.activityComments.listByActivity, { activityId }) ?? [];
  const add = useMutation(api.activityComments.add);
  const remove = useMutation(api.activityComments.remove);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() || !token) return;
    setSubmitting(true);
    try {
      await add({ token, activityId, text });
      setText("");
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const del = async (id) => {
    if (!token) return;
    if (!confirm("Delete this comment?")) return;
    try { await remove({ token, commentId: id }); } catch (err) { alert(err.message); }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ ...MICRO_LABEL, color: C.textBody, marginBottom: 8 }}>
        Comments ({comments.length})
      </div>

      {comments.map((c) => {
        const p = playerOf(c.authorSlug);
        const isMine = c.authorSlug === session?.slug;
        return (
          <div key={c._id} style={{
            display: "flex", gap: 8, padding: "8px 0",
            borderTop: `1px solid ${C.sandDark}`,
          }}>
            {p && <Avatar player={p} size="sm" />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 12,
                color: p?.color ?? C.dark,
              }}>{nameOf(c.authorSlug)}</div>
              <div style={{
                fontFamily: "Nunito, sans-serif", fontSize: 14, color: C.dark, wordBreak: "break-word",
              }}>{c.text}</div>
            </div>
            {isMine && (
              <button type="button" onClick={() => del(c._id)}
                style={{
                  alignSelf: "flex-start", padding: "2px 8px", borderRadius: 6,
                  background: "transparent", border: `1px solid ${C.sandDark}`, color: C.textBody,
                  fontFamily: "Nunito, sans-serif", fontSize: 11, cursor: "pointer",
                }}>×</button>
            )}
          </div>
        );
      })}

      {token && (
        <form onSubmit={submit} style={{
          display: "flex", gap: 8, marginTop: 10,
        }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Drop a comment…"
            maxLength={280}
            style={{
              flex: 1, padding: "8px 12px", borderRadius: 8,
              border: `1px solid ${C.sandDark}`,
              fontFamily: "Nunito, sans-serif", fontSize: 14,
            }}
          />
          <button type="submit" disabled={submitting || !text.trim()}
            style={{
              padding: "8px 14px", borderRadius: 8, border: 0,
              background: C.green, color: C.white,
              fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 13,
              cursor: submitting ? "default" : "pointer",
              opacity: submitting ? 0.6 : 1,
            }}>
            {submitting ? "..." : "Post"}
          </button>
        </form>
      )}
    </div>
  );
}
