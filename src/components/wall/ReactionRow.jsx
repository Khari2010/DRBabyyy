import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSession } from "../../lib/useSession.js";
import { C } from "../../data/colors.js";
import { RADIUS } from "../../data/design.js";

const QUICK = ["❤️", "😂", "🔥", "😭", "🍻", "👀"];

// reactionCounts is Array<{emoji, count}> (Convex disallows emoji as object keys).
export default function ReactionRow({ postId, reactionCounts, viewerReactions }) {
  const session = useSession();
  const toggle = useMutation(api.postReactions.toggle);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [otherOpen, setOtherOpen] = useState(false);
  const otherInputRef = useRef(null);

  const countMap = useMemo(
    () => new Map((reactionCounts ?? []).map((r) => [r.emoji, r.count])),
    [reactionCounts],
  );
  const viewerSet = useMemo(() => new Set(viewerReactions ?? []), [viewerReactions]);
  // Show any emoji that has reactions, or that the viewer reacted with — not just the quick set.
  const visible = useMemo(() => {
    const seen = new Set();
    [...(reactionCounts ?? []).map((r) => r.emoji), ...viewerSet].forEach((e) => seen.add(e));
    return Array.from(seen);
  }, [reactionCounts, viewerSet]);

  // Focus the keyboard input after it mounts so iOS pops the keyboard.
  useEffect(() => {
    if (otherOpen) {
      requestAnimationFrame(() => otherInputRef.current?.focus());
    }
  }, [otherOpen]);

  async function tap(emoji) {
    if (!session) return;
    try {
      await toggle({ token: session.token, postId, emoji });
    } catch (err) { console.error(err); }
  }

  function handleOtherInput(e) {
    const val = e.target.value;
    if (!val) return;
    // Grab the last grapheme so single-tap of an emoji is captured cleanly.
    const last = [...val].pop() ?? val;
    tap(last);
    e.target.value = "";
    e.target.blur();
    setOtherOpen(false);
    setPickerOpen(false);
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
          background: C.sand,
          border: `1px solid ${C.sandDark}`,
          borderRadius: RADIUS.pill,
          padding: "4px 10px",
          fontSize: 14,
          cursor: "pointer",
          color: C.textBody,
          display: "inline-flex",
          alignItems: "center",
          gap: 2,
          lineHeight: 1,
        }}
        aria-label="Add reaction"
      >
        <span style={{ fontSize: 14 }}>🙂</span>
        <span style={{ fontSize: 14, fontWeight: 700, marginLeft: 2 }}>+</span>
      </button>
      {pickerOpen && (
        <div style={{
          flexBasis: "100%",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 6,
          marginTop: 4,
        }}>
          {QUICK.map((e) => (
            <button
              key={e}
              onClick={() => { tap(e); setPickerOpen(false); }}
              style={{ fontSize: 22, background: "transparent", border: "none", cursor: "pointer", padding: 4 }}
            >{e}</button>
          ))}
          {!otherOpen && (
            <button
              onClick={() => setOtherOpen(true)}
              style={{
                background: C.sandDark,
                border: "none",
                borderRadius: RADIUS.pill,
                padding: "6px 12px",
                fontSize: 13,
                fontWeight: 700,
                color: C.dark,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                marginLeft: 4,
              }}
            >🌐 Other</button>
          )}
          {otherOpen && (
            <input
              ref={otherInputRef}
              type="text"
              placeholder="Tap the 🌐 on your keyboard"
              onChange={handleOtherInput}
              onBlur={() => setOtherOpen(false)}
              style={{
                flex: 1,
                minWidth: 160,
                border: `1px solid ${C.sandDark}`,
                borderRadius: RADIUS.pill,
                padding: "6px 12px",
                fontSize: 16, // 16+ on iOS to avoid zoom
                outline: "none",
                background: C.white,
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
