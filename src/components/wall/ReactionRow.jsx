import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSession } from "../../lib/useSession.js";
import { C } from "../../data/colors.js";
import { RADIUS } from "../../data/design.js";

const ALLOWED = ["❤️", "😂", "🔥", "😭", "🍻", "👀"];

// reactionCounts is Array<{emoji, count}> (Convex disallows emoji as object keys).
export default function ReactionRow({ postId, reactionCounts, viewerReactions }) {
  const session = useSession();
  const toggle = useMutation(api.postReactions.toggle);
  const [pickerOpen, setPickerOpen] = useState(false);

  const countMap = useMemo(
    () => new Map((reactionCounts ?? []).map((r) => [r.emoji, r.count])),
    [reactionCounts],
  );
  const viewerSet = new Set(viewerReactions ?? []);
  const visible = ALLOWED.filter((e) => (countMap.get(e) ?? 0) > 0 || viewerSet.has(e));

  async function tap(emoji) {
    if (!session) return;
    try {
      await toggle({ token: session.token, postId, emoji });
    } catch (err) { console.error(err); }
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
      {visible.map((emoji) => {
        const mine = viewerSet.has(emoji);
        return (
          <button
            key={emoji}
            onClick={() => tap(emoji)}
            style={{
              background: mine ? C.coral : C.sandDark,
              color: mine ? "white" : C.dark,
              border: "none",
              borderRadius: RADIUS.pill,
              padding: "4px 10px",
              fontSize: 13,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>{emoji}</span>
            <span style={{ fontWeight: 700 }}>{countMap.get(emoji) ?? 0}</span>
          </button>
        );
      })}
      <button
        onClick={() => setPickerOpen((v) => !v)}
        style={{
          background: "transparent",
          border: `1px dashed ${C.sandDark}`,
          borderRadius: RADIUS.pill,
          padding: "4px 10px",
          fontSize: 13,
          cursor: "pointer",
          color: C.textBody,
        }}
        aria-label="Add reaction"
      >+ react</button>
      {pickerOpen && (
        <div style={{
          flexBasis: "100%",
          display: "flex",
          gap: 6,
          marginTop: 4,
        }}>
          {ALLOWED.map((e) => (
            <button
              key={e}
              onClick={() => { tap(e); setPickerOpen(false); }}
              style={{ fontSize: 22, background: "transparent", border: "none", cursor: "pointer", padding: 4 }}
            >{e}</button>
          ))}
        </div>
      )}
    </div>
  );
}
