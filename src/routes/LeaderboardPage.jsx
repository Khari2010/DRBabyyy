import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useGameState } from "../lib/useGameState.js";
import { useSession } from "../lib/useSession.js";
import { PLAYERS } from "../data/players.js";
import { C } from "../data/colors.js";
import { RADIUS, BODY } from "../data/design.js";
import SectionBand from "../components/primitives/SectionBand.jsx";
import Card from "../components/primitives/Card.jsx";
import Avatar from "../components/primitives/Avatar.jsx";
import Pill from "../components/primitives/Pill.jsx";
import BottomSheet from "../components/primitives/BottomSheet.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import Reveal from "../components/Reveal.jsx";
import EntryRow from "../components/EntryRow.jsx";
import FoulModal from "../components/FoulModal.jsx";
import LogoutChip from "../components/LogoutChip.jsx";
import BottomNav from "../components/BottomNav.jsx";
import EndDayTakeover from "../components/EndDayTakeover.jsx";
import { showToast } from "../lib/useToast.js";

const ACCENT = C.gold;

function playerBySlug(slug) {
  return PLAYERS.find((p) => p.slug === slug);
}

function BoardRow({ row, rank, onFoul, isMe }) {
  const p = playerBySlug(row.slug);
  const isTop3 = rank <= 3;
  const medal = ["🥇", "🥈", "🥉"][rank - 1];

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 14px",
      borderBottom: `1px solid ${C.sandDark}`,
      background: isMe ? `${p?.color ?? C.coral}08` : "transparent",
    }}>
      <div style={{
        width: 28, textAlign: "center",
        fontFamily: "'Dela Gothic One', sans-serif",
        fontSize: 18, color: C.textBody,
      }}>
        {medal ?? rank}
      </div>
      {p ? <Avatar player={p} size="sm" /> : <div style={{ width: 24 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "Nunito, sans-serif", fontWeight: 800,
          fontSize: 14, color: C.dark,
        }}>{p?.name ?? row.slug}</div>
        <div style={{
          fontSize: 11, color: C.textBody, fontFamily: "Nunito, sans-serif",
        }}>
          {row.claimCount} claim{row.claimCount === 1 ? "" : "s"} · {row.verifiedCount} 🛡
        </div>
      </div>
      <div style={{
        fontFamily: "'Dela Gothic One', sans-serif",
        fontSize: 20, color: row.total >= 0 ? C.green : C.coralDeep,
        minWidth: 56, textAlign: "right",
      }}>
        {row.total >= 0 ? "+" : ""}{row.total}
      </div>
      {onFoul && (
        <button
          type="button"
          onClick={() => onFoul({ slug: row.slug, name: p?.name ?? row.slug })}
          title="Log a foul"
          style={{
            padding: "4px 8px", marginLeft: 4,
            fontFamily: "Nunito, sans-serif", fontWeight: 800,
            fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase",
            borderRadius: RADIUS.sm, border: 0, background: C.coralDeep, color: C.white,
            cursor: "pointer",
          }}
        >
          Foul
        </button>
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState("daily");
  const { currentDailyKey, currentDayNumber, gamesLive } = useGameState();
  const session = useSession();
  const loggedIn = !!session;
  const [foulTarget, setFoulTarget] = useState(null);
  const handleFoul = loggedIn ? setFoulTarget : null;

  const daily = useQuery(api.leaderboard.getDaily, { dailyKey: currentDailyKey }) ?? [];
  const holiday = useQuery(api.leaderboard.getHoliday, {}) ?? [];
  const activity = useQuery(
    api.leaderboard.getRecentActivity,
    session?.token ? { limit: 12, token: session.token } : "skip",
  ) ?? [];
  const rows = tab === "daily" ? daily : holiday;

  const lastClosedDay = currentDayNumber > 1 ? currentDayNumber - 1 : null;
  const lastClosed = useQuery(
    api.rollovers.get,
    lastClosedDay ? { dayNumber: lastClosedDay } : "skip",
  );
  const allRollovers = useQuery(api.rollovers.listAll, {}) ?? [];
  const pendingReveal = lastClosed && lastClosed.loserSlug && !lastClosed.forfeitId;
  const history = allRollovers.filter((r) => r.loserSlug && r.forfeitId).sort((a, b) => b.dayNumber - a.dayNumber);

  const isAdmin = useQuery(
    api.admin.isAdmin,
    session?.token ? { token: session.token } : "skip",
  );

  // Reuse the existing `daily` rows (already aggregated per player) — sum
  // `claimCount` across rows for total entry count.
  const currentDayEntryCount = daily.reduce((sum, row) => sum + row.claimCount, 0);

  const trigger = useMutation(api.rollovers.trigger);
  const [endDayConfirm, setEndDayConfirm] = useState(false);
  const [endDayPending, setEndDayPending] = useState(false);
  const [takeoverOpen, setTakeoverOpen] = useState(false);
  const [takeoverDay, setTakeoverDay] = useState(null);

  const canEndDay = !!isAdmin && gamesLive && currentDayEntryCount > 0 && !endDayPending;

  const handleEndDay = async () => {
    if (!session?.token) return;
    setEndDayPending(true);
    const closingDay = currentDayNumber;
    try {
      await trigger({ token: session.token });
      setEndDayConfirm(false);
      setTakeoverDay(closingDay);
      setTakeoverOpen(true);
    } catch (err) {
      showToast({ message: err.message || "End Day failed", accent: C.coralDeep });
    } finally {
      setEndDayPending(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.sand }}>
      <LogoutChip />
      <SectionBand bg="sand" pad="40px 0 24px" innerMaxWidth={520}>
        <Reveal>
          <SectionHeader
            label={gamesLive ? `Day ${currentDayNumber}` : "Pre-trip"}
            title="Leaderboard"
            tagline={loggedIn ? null : "Log in to see activity, vouches, and forfeit history."}
            accent={ACCENT}
            compact
          />
        </Reveal>

        {isAdmin && pendingReveal && lastClosed && (
          <Reveal>
            <button
              type="button"
              onClick={() => {
                setTakeoverDay(lastClosed.dayNumber);
                setTakeoverOpen(true);
              }}
              style={{
                width: "100%",
                marginBottom: 16,
                padding: "14px 18px",
                borderRadius: RADIUS.md,
                background: C.coralDeep,
                color: C.white,
                border: 0,
                fontFamily: "Nunito, sans-serif",
                fontWeight: 800,
                fontSize: 14,
                letterSpacing: 0.3,
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span>Day {lastClosed.dayNumber} is unresolved — open the wheel</span>
              <span aria-hidden="true">▶</span>
            </button>
          </Reveal>
        )}

        <Reveal>
          <div style={{
            display: "flex",
            gap: 8,
            marginBottom: 16,
            justifyContent: "center",
            alignItems: "center",
            flexWrap: "wrap",
          }}>
            <Pill active={tab === "daily"} accent={ACCENT} onClick={() => setTab("daily")}>Today</Pill>
            <Pill active={tab === "holiday"} accent={ACCENT} onClick={() => setTab("holiday")}>Holiday</Pill>
            {canEndDay && (
              <button
                type="button"
                onClick={() => setEndDayConfirm(true)}
                style={{
                  marginLeft: 8,
                  padding: "8px 14px",
                  borderRadius: 999,
                  background: C.coralDeep,
                  color: C.white,
                  border: 0,
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 800,
                  fontSize: 12,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                End Day {currentDayNumber}
              </button>
            )}
          </div>
        </Reveal>

        <Reveal>
          <Card padding={0} style={{ overflow: "hidden" }}>
            {rows.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: C.textBody, ...BODY }}>
                No claims yet
              </div>
            ) : (
              rows.map((row, i) => (
                <BoardRow
                  key={row.slug}
                  row={row}
                  rank={i + 1}
                  isMe={session?.slug === row.slug}
                  onFoul={handleFoul && row.slug !== session?.slug ? handleFoul : null}
                />
              ))
            )}
          </Card>
        </Reveal>
      </SectionBand>

      {loggedIn && (
        <SectionBand bg="white" pad="40px 0" innerMaxWidth={520}>
          <Reveal>
            <SectionHeader
              label="Live feed"
              title="Recent activity"
              accent={C.turquoise}
              compact
            />
          </Reveal>
          <Reveal>
            <Card padding={0} style={{ overflow: "hidden" }}>
              {activity.length === 0
                ? <div style={{ padding: 24, textAlign: "center", color: C.textBody, ...BODY }}>Nothing yet</div>
                : activity.map((e) => <EntryRow key={e._id} entry={e} />)}
            </Card>
          </Reveal>
        </SectionBand>
      )}

      {loggedIn && history.length > 0 && (
        <SectionBand bg="sand" pad="40px 0" innerMaxWidth={520}>
          <Reveal>
            <SectionHeader
              label="History"
              title="Punishments"
              accent={C.coralDeep}
              compact
            />
          </Reveal>
          <Reveal>
            <Card padding={0} style={{ overflow: "hidden" }}>
              {history.map((r) => {
                const player = playerBySlug(r.loserSlug);
                return (
                  <div key={r._id} style={{
                    padding: "12px 14px",
                    borderBottom: `1px solid ${C.sandDark}`,
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                    {player && <Avatar player={player} size="sm" />}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, color: C.dark }}>
                        Day {r.dayNumber} · {player?.name ?? r.loserSlug}
                      </div>
                      <div style={{ fontSize: 12, color: C.textBody, fontFamily: "Nunito, sans-serif" }}>
                        {r.forfeitLabel}
                      </div>
                    </div>
                  </div>
                );
              })}
            </Card>
          </Reveal>
        </SectionBand>
      )}

      <BottomSheet open={endDayConfirm} onClose={() => !endDayPending && setEndDayConfirm(false)}>
        <h3 style={{
          fontFamily: "'Dela Gothic One', sans-serif",
          fontSize: 20,
          color: C.dark,
          margin: "8px 0 12px",
          textAlign: "center",
        }}>
          End Day {currentDayNumber}?
        </h3>
        <p style={{
          fontFamily: "Nunito, sans-serif",
          fontSize: 14,
          color: C.textBody,
          lineHeight: 1.45,
          textAlign: "center",
          margin: "0 0 20px",
        }}>
          This locks all of today's claims and reveals the loser.
          You can undo from <strong>/admin</strong> if needed.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            type="button"
            onClick={() => setEndDayConfirm(false)}
            disabled={endDayPending}
            style={{
              padding: "12px 20px",
              borderRadius: RADIUS.md,
              background: C.sand,
              color: C.dark,
              border: `1.5px solid ${C.sandDark}`,
              fontFamily: "Nunito, sans-serif",
              fontWeight: 800,
              fontSize: 14,
              cursor: endDayPending ? "default" : "pointer",
              opacity: endDayPending ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleEndDay}
            disabled={endDayPending}
            style={{
              padding: "12px 20px",
              borderRadius: RADIUS.md,
              background: C.coralDeep,
              color: C.white,
              border: 0,
              fontFamily: "Nunito, sans-serif",
              fontWeight: 800,
              fontSize: 14,
              cursor: endDayPending ? "default" : "pointer",
              opacity: endDayPending ? 0.7 : 1,
            }}
          >
            {endDayPending ? "Ending…" : "End Day"}
          </button>
        </div>
      </BottomSheet>

      <EndDayTakeover
        open={takeoverOpen}
        dayNumber={takeoverDay}
        onClose={() => {
          setTakeoverOpen(false);
          setTakeoverDay(null);
        }}
      />

      {foulTarget && (
        <FoulModal
          targetSlug={foulTarget.slug}
          targetName={foulTarget.name}
          onClose={() => setFoulTarget(null)}
        />
      )}
      <BottomNav />
    </div>
  );
}
