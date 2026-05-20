import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { C } from "../data/colors.js";
import Card from "./primitives/Card.jsx";
import { showToast } from "../lib/useToast.js";

// Item config — order MUST match the ITEM_ORDER constant in convex/welcome.ts.
// `onTap` returns void; it is what runs when the row is clicked. We pass `slug`,
// `navigate`, and `markLockscreenSeen` to give it everything it needs.
function buildItems({ slug, navigate, markLockscreenSeen }) {
  const scrollTo = (anchorId) => {
    const el = document.getElementById(anchorId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return {
    setup: [
      {
        id: "holidayName",
        label: "Pick your holiday name",
        onTap: () => scrollTo("profile"),
      },
      {
        id: "catchphrase",
        label: "Add a catchphrase",
        onTap: () => scrollTo("profile"),
      },
      {
        id: "room",
        label: "Tell us your room number",
        onTap: () => scrollTo("about"),
      },
      {
        id: "lockscreen",
        label: "Make your lockscreen",
        onTap: () => {
          markLockscreenSeen();
          scrollTo("profile");
        },
      },
    ],
    try: [
      {
        id: "wallPost",
        label: "Post on the Wall",
        onTap: () => navigate("/wall"),
      },
      {
        id: "challengeClaim",
        label: "Claim a challenge",
        onTap: () => navigate(`/player/${slug}/games`),
      },
      {
        id: "scavengerVisit",
        label: "Play today's scavenger",
        onTap: () => navigate(`/player/${slug}/games?tab=scavenger`),
      },
      {
        id: "adventureVote",
        label: "Vote on an adventure",
        onTap: () => scrollTo("adventures"),
      },
      {
        id: "leaderboardVisit",
        label: "Check the leaderboard",
        onTap: () => navigate("/leaderboard"),
      },
    ],
  };
}

function Row({ id, label, done, onTap }) {
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={label}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        minHeight: 44,
        padding: "8px 4px",
        background: "transparent",
        border: "none",
        textAlign: "left",
        cursor: "pointer",
        fontFamily: "Nunito, sans-serif",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: done ? C.green : "transparent",
          border: done ? "none" : `1.5px solid ${C.sandDark}`,
          color: C.white,
          fontWeight: 900,
          fontSize: 13,
          transition: "background 200ms ease, border-color 200ms ease",
        }}
      >
        {done ? "✓" : ""}
      </span>
      <span
        style={{
          flex: 1,
          fontSize: 14,
          fontWeight: 700,
          color: done ? C.textBody : C.dark,
          opacity: done ? 0.55 : 1,
          textDecoration: done ? "line-through" : "none",
          transition: "color 200ms ease, opacity 200ms ease",
        }}
      >
        {label}
      </span>
      {!done && (
        <span aria-hidden style={{ color: C.textBody, opacity: 0.4, fontSize: 16 }}>
          ›
        </span>
      )}
    </button>
  );
}

function GroupHeader({ children }) {
  return (
    <div
      style={{
        fontFamily: "Nunito, sans-serif",
        fontWeight: 800,
        fontSize: 11,
        letterSpacing: 1.5,
        textTransform: "uppercase",
        color: C.textBody,
        opacity: 0.7,
        margin: "8px 0 4px",
      }}
    >
      {children}
    </div>
  );
}

export default function WelcomeChecklist({ slug, token, player }) {
  const navigate = useNavigate();
  const progress = useQuery(api.welcome.getProgress, { slug });
  const markLockscreenSeenMutation = useMutation(api.welcome.markLockscreenSeen);
  const hideMutation = useMutation(api.welcome.hide);

  if (!progress) return null;
  if (progress.hidden) return null;

  const doneById = Object.fromEntries(progress.items.map((i) => [i.id, i.done]));
  const allDone = progress.doneCount === progress.totalCount;

  const items = buildItems({
    slug,
    navigate,
    markLockscreenSeen: () => {
      if (!doneById.lockscreen) {
        markLockscreenSeenMutation({ token, slug }).catch(() => {});
      }
    },
  });

  const handleHide = async () => {
    try {
      await hideMutation({ token, slug });
      showToast({ message: "Hidden — welcome card dismissed", accent: C.textBody });
    } catch {
      showToast({ message: "Couldn't hide — try again", accent: C.coralDeep });
    }
  };

  if (allDone) {
    return (
      <Card tint={player.color} style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 22 }}>🎉</span>
        <span
          style={{
            flex: 1,
            fontFamily: "Nunito, sans-serif",
            fontSize: 14,
            fontWeight: 800,
            color: C.dark,
          }}
        >
          All set! Have a great trip.
        </span>
        <button
          type="button"
          onClick={handleHide}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontFamily: "Nunito, sans-serif",
            fontWeight: 600,
            fontSize: 12,
            color: C.textBody,
          }}
        >
          Hide
        </button>
      </Card>
    );
  }

  return (
    <Card tint={player.color}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 4,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "Nunito, sans-serif",
              fontWeight: 900,
              fontSize: 11,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: player.color,
            }}
          >
            Get started
          </div>
          <div
            style={{
              fontFamily: "'Dela Gothic One', sans-serif",
              fontSize: 22,
              color: C.dark,
              lineHeight: 1.2,
              marginTop: 2,
            }}
          >
            Make the most of the trip
          </div>
        </div>
        <div
          style={{
            fontFamily: "Nunito, sans-serif",
            fontWeight: 800,
            fontSize: 11,
            letterSpacing: 0.5,
            padding: "4px 10px",
            borderRadius: 999,
            background: "rgba(0,0,0,0.04)",
            color: C.textBody,
            flexShrink: 0,
          }}
        >
          {progress.doneCount} / {progress.totalCount}
        </div>
      </div>

      <GroupHeader>Set it up</GroupHeader>
      <div>
        {items.setup.map((it) => (
          <Row key={it.id} {...it} done={doneById[it.id]} />
        ))}
      </div>

      <GroupHeader>Try it out</GroupHeader>
      <div>
        {items.try.map((it) => (
          <Row key={it.id} {...it} done={doneById[it.id]} />
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
        <button
          type="button"
          onClick={handleHide}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontFamily: "Nunito, sans-serif",
            fontWeight: 600,
            fontSize: 12,
            color: C.textBody,
          }}
        >
          Hide this
        </button>
      </div>
    </Card>
  );
}
