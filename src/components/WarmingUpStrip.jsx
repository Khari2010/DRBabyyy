import { displayName } from "../lib/displayName.js";
import { PLAYERS } from "../data/players.js";
import { C } from "../data/colors.js";
import { RADIUS } from "../data/design.js";
import Avatar from "./primitives/Avatar.jsx";

function playerBySlug(slug) {
  return PLAYERS.find((p) => p.slug === slug);
}

export default function WarmingUpStrip({ rows, holidayMap, catchphraseMap, onTap, onFoul, mySlug }) {
  if (!rows.length) return null;

  return (
    <div style={{
      position: "relative",
      background: `${C.sand}`,
      border: `1px dashed ${C.sandDark}`,
      borderRadius: RADIUS.lg ?? 18,
      padding: "14px 16px 16px",
      marginTop: 12,
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute",
        top: 0,
        left: 16,
        right: 16,
        height: 6,
        background: `repeating-linear-gradient(45deg, ${C.gold}88 0, ${C.gold}88 8px, ${C.gold}33 8px, ${C.gold}33 16px)`,
        transform: "translateY(-3px) rotate(-0.4deg)",
        borderRadius: 3,
        opacity: 0.75,
        pointerEvents: "none",
      }} aria-hidden="true" />

      <div style={{
        fontFamily: "Nunito, sans-serif",
        fontWeight: 900,
        fontSize: 10,
        letterSpacing: 1.4,
        color: C.textBody,
        textTransform: "uppercase",
        marginBottom: 10,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}>
        ☀️ Still warming up · {rows.length}
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 6,
      }}>
        {rows.map((row) => {
          const p = playerBySlug(row.slug);
          const name = displayName(row.slug, holidayMap, p?.name);
          const isMe = mySlug === row.slug;
          const catchphrase = catchphraseMap?.[row.slug];
          return (
            <div
              key={row.slug}
              onClick={onTap ? () => onTap(row.slug) : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                borderRadius: RADIUS.md ?? 10,
                background: isMe ? `${p?.color ?? C.gold}10` : "transparent",
                cursor: onTap ? "pointer" : "default",
                minHeight: 40,
              }}
            >
              {p && <Avatar player={p} size="sm" />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 700,
                  fontSize: 13,
                  color: C.textBody,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {name}
                </div>
                {catchphrase && (
                  <div style={{
                    fontFamily: "Nunito, sans-serif",
                    fontSize: 10,
                    fontStyle: "italic",
                    color: C.textBody,
                    opacity: 0.6,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    marginTop: 1,
                  }}>
                    “{catchphrase}”
                  </div>
                )}
              </div>
              {onFoul && !isMe && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFoul({ slug: row.slug, name });
                  }}
                  title={`Foul ${name}`}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    border: `1px solid ${C.coralDeep}40`,
                    background: "transparent",
                    color: C.coralDeep,
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                    flexShrink: 0,
                  }}
                >
                  ⚠︎
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
