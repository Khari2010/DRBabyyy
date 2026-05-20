import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useGameState } from "../lib/useGameState.js";
import { useSession } from "../lib/useSession.js";
import { useHolidayNameMap, displayName } from "../lib/displayName.js";
import { PLAYERS } from "../data/players.js";
import { C } from "../data/colors.js";
import { RADIUS, BODY } from "../data/design.js";
import SectionBand from "../components/primitives/SectionBand.jsx";
import Card from "../components/primitives/Card.jsx";
import Avatar from "../components/primitives/Avatar.jsx";
import Pill from "../components/primitives/Pill.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import Reveal from "../components/Reveal.jsx";
import EntryRow from "../components/EntryRow.jsx";
import FoulModal from "../components/FoulModal.jsx";
import LogoutChip from "../components/LogoutChip.jsx";
import BottomNav from "../components/BottomNav.jsx";
import EndDayTakeover from "../components/EndDayTakeover.jsx";
import PlayerDayDrawer from "../components/PlayerDayDrawer.jsx";
import FlowStateVoteCard from "../components/FlowStateVoteCard.jsx";
import DaySummaryCard from "../components/DaySummaryCard.jsx";
import WheelTabPane from "../components/WheelTabPane.jsx";
import PodiumHero from "../components/PodiumHero.jsx";
import WarmingUpStrip from "../components/WarmingUpStrip.jsx";

const ACCENT = C.gold;

function playerBySlug(slug) {
  return PLAYERS.find((p) => p.slug === slug);
}

function BoardRow({ row, rank, onFoul, isMe, isLast, holidayMap, catchphraseMap, isZero, onTap, isFlowWinner }) {
  const p = playerBySlug(row.slug);
  const isTop3 = rank <= 3;
  const medal = ["🥇", "🥈", "🥉"][rank - 1];
  const catchphrase = catchphraseMap?.[row.slug];

  return (
    <div
      onClick={onTap ? () => onTap(row.slug) : undefined}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 14px",
        borderBottom: isLast ? undefined : `1px solid ${C.sandDark}`,
        background: isMe ? `${p?.color ?? C.coral}08` : "transparent",
        opacity: isZero ? 0.55 : 1,
        cursor: onTap ? "pointer" : "default",
      }}
    >
      <div style={{
        width: 28, textAlign: "center",
        fontFamily: "'Dela Gothic One', sans-serif",
        fontSize: 18, color: C.textBody,
      }}>
        {isZero ? "" : (medal ?? rank)}
      </div>
      {p ? <Avatar player={p} size="sm" /> : <div style={{ width: 24 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "Nunito, sans-serif", fontWeight: 800,
          fontSize: 14, color: C.dark,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <span>{isFlowWinner ? `👑 ${displayName(row.slug, holidayMap, p?.name)}` : displayName(row.slug, holidayMap, p?.name)}</span>
          {isMe && (
            <span style={{
              padding: "1px 6px",
              borderRadius: 999,
              background: C.sand,
              border: `1px solid ${C.sandDark}`,
              color: C.textBody,
              fontFamily: "Nunito, sans-serif",
              fontWeight: 800,
              fontSize: 9,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}>
              you
            </span>
          )}
        </div>
        {catchphrase && (
          <div
            style={{
              fontFamily: "Nunito, sans-serif",
              fontSize: 11,
              fontStyle: "italic",
              color: C.textBody,
              opacity: 0.7,
              marginTop: 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            “{catchphrase}”
          </div>
        )}
        {isZero ? (
          <div style={{
            fontSize: 11, color: C.textBody, fontFamily: "Nunito, sans-serif",
            marginTop: 2,
          }}>
            no claims yet
          </div>
        ) : (
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "2px 8px",
            borderRadius: 999,
            background: row.verifiedCount === row.claimCount
              ? `${C.green}22`
              : C.sandDark,
            color: row.verifiedCount === row.claimCount
              ? C.green
              : C.textBody,
            fontFamily: "Nunito, sans-serif",
            fontWeight: 700,
            fontSize: 11,
            marginTop: 2,
          }}>
            {row.verifiedCount} of {row.claimCount} verified
          </div>
        )}
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
          onClick={(e) => {
            e.stopPropagation();
            onFoul({ slug: row.slug, name: displayName(row.slug, holidayMap, p?.name) });
          }}
          title="Log a foul"
          style={{
            padding: "0 14px", marginLeft: 4, minHeight: 44,
            fontFamily: "Nunito, sans-serif", fontWeight: 800,
            fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase",
            borderRadius: RADIUS.sm, border: 0, background: C.coralDeep, color: C.white,
            cursor: "pointer",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}
        >
          Foul
        </button>
      )}
    </div>
  );
}

function BoardRowSkeleton({ isLast }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 14px",
      borderBottom: isLast ? undefined : `1px solid ${C.sandDark}`,
    }}>
      <div style={{ width: 28 }} />
      <div style={{
        width: 32, height: 32, borderRadius: "50%", background: C.sandDark, opacity: 0.5,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          width: "40%", height: 12, borderRadius: 4, background: C.sandDark, opacity: 0.5,
          marginBottom: 6,
        }} />
        <div style={{
          width: "25%", height: 10, borderRadius: 4, background: C.sandDark, opacity: 0.3,
        }} />
      </div>
      <div style={{
        width: 40, height: 18, borderRadius: 4, background: C.sandDark, opacity: 0.5,
      }} />
    </div>
  );
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState("daily");
  const { currentDailyKey, currentDayNumber, gamesLive } = useGameState();
  const session = useSession();
  const loggedIn = !!session;
  const holidayMap = useHolidayNameMap();
  const catchphraseMap = useQuery(api.players.catchphraseMap) ?? {};
  const [foulTarget, setFoulTarget] = useState(null);
  const handleFoul = loggedIn ? setFoulTarget : null;

  const dailyRaw = useQuery(api.leaderboard.getDaily, { dailyKey: currentDailyKey });
  const holidayRaw = useQuery(api.leaderboard.getHoliday, {});
  const flowState = useQuery(
    api.flowVotes.getFlowVoteState,
    session?.token ? { token: session.token } : {},
  );
  const flowHistory = useQuery(api.flowVotes.getFlowHistory, {});
  const activityRaw = useQuery(
    api.leaderboard.getRecentActivity,
    session?.token ? { limit: 12, token: session.token } : "skip",
  );
  const daily = dailyRaw ?? [];
  const holiday = holidayRaw ?? [];
  const activity = activityRaw ?? [];
  const rowsLoading = (tab === "daily" ? dailyRaw : holidayRaw) === undefined;
  const activityLoading = !!session?.token && activityRaw === undefined;
  const rowsBase = tab === "daily" ? daily : holiday;
  const rows = useMemo(() => {
    const scoringSlugs = new Set(rowsBase.map((r) => r.slug));
    const zeros = PLAYERS
      .filter((p) => !scoringSlugs.has(p.slug))
      .map((p) => ({
        slug: p.slug,
        total: 0,
        claimCount: 0,
        verifiedCount: 0,
        earliestAt: Infinity,
        isZero: true,
      }));
    return [...rowsBase, ...zeros];
  }, [rowsBase]);

  const lastClosedDay = currentDayNumber > 1 ? currentDayNumber - 1 : null;
  const lastClosed = useQuery(
    api.rollovers.get,
    lastClosedDay ? { dayNumber: lastClosedDay } : "skip",
  );
  const allRollovers = useQuery(api.rollovers.listAll, {}) ?? [];
  const pendingReveal = lastClosed && lastClosed.loserSlug && !lastClosed.forfeitId;
  const history = useMemo(
    () => allRollovers.filter((r) => r.loserSlug && r.forfeitId).sort((a, b) => b.dayNumber - a.dayNumber),
    [allRollovers],
  );

  const isAdmin = useQuery(
    api.admin.isAdmin,
    session?.token ? { token: session.token } : "skip",
  );

  // Reuse the existing `daily` rows (already aggregated per player) — sum
  // `claimCount` across rows for total entry count.
  const currentDayEntryCount = daily.reduce((sum, row) => sum + row.claimCount, 0);

  const dailyPlayingCount = daily.length;

  const [takeoverOpen, setTakeoverOpen] = useState(false);
  const [takeoverDay, setTakeoverDay] = useState(null);
  const [drawerSlug, setDrawerSlug] = useState(null);
  const [feedTab, setFeedTab] = useState("activity");

  return (
    <div style={{ minHeight: "100vh", background: C.sand }}>
      <LogoutChip />
      <SectionBand bg="sand" pad="40px 0 24px" innerMaxWidth={520}>
        <Reveal>
          <SectionHeader
            label={gamesLive ? `Day ${currentDayNumber}` : "Pre-trip"}
            title="Leaderboard"
            tagline={
              !loggedIn
                ? "Log in to see activity, vouches, and forfeit history."
                : tab === "daily" && gamesLive
                ? `${dailyPlayingCount} of ${PLAYERS.length} crew playing · ${currentDayEntryCount} claim${currentDayEntryCount === 1 ? "" : "s"} today`
                : null
            }
            accent={ACCENT}
            compact
          />
        </Reveal>

        {loggedIn && lastClosed?.closedAt && (
          <Reveal>
            <DaySummaryCard
              dayNumber={lastClosed.dayNumber}
              hasLoser={!!lastClosed.loserSlug}
              onReveal={() => {
                setTakeoverDay(lastClosed.dayNumber);
                setTakeoverOpen(true);
              }}
            />
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
          </div>
        </Reveal>

        {tab === "daily" && <FlowStateVoteCard />}

        <Reveal>
          {rowsLoading ? (
            <Card padding={0} style={{ overflow: "hidden" }}>
              {[0, 1, 2, 3].map((i) => (
                <BoardRowSkeleton key={i} isLast={i === 3} />
              ))}
            </Card>
          ) : (() => {
            const scoring = rows.filter((r) => !r.isZero);
            const warmingUp = rows.filter((r) => r.isZero);
            const leader = scoring[0] ?? null;
            const chasing = scoring.slice(1);
            const stampLabel = tab === "daily"
              ? `Day ${currentDayNumber}\n20 May`
              : "Trip\ntotal";

            if (!leader && warmingUp.length === 0) {
              return (
                <Card padding={0} style={{ overflow: "hidden" }}>
                  <div style={{ padding: 24, textAlign: "center", color: C.textBody, ...BODY }}>
                    No claims yet
                  </div>
                </Card>
              );
            }

            return (
              <>
                {leader && (
                  <PodiumHero
                    row={leader}
                    isMe={session?.slug === leader.slug}
                    holidayMap={holidayMap}
                    catchphraseMap={catchphraseMap}
                    isFlowWinner={leader.slug === flowState?.winnerSlug && tab === "daily"}
                    stampLabel={stampLabel}
                    onTap={setDrawerSlug}
                    onFoul={handleFoul && leader.slug !== session?.slug ? handleFoul : null}
                  />
                )}
                {chasing.length > 0 && (
                  <Card padding={0} style={{ overflow: "hidden" }}>
                    {chasing.map((row, i) => (
                      <BoardRow
                        key={row.slug}
                        row={row}
                        rank={i + 2}
                        isMe={session?.slug === row.slug}
                        isLast={i === chasing.length - 1}
                        holidayMap={holidayMap}
                    catchphraseMap={catchphraseMap}
                        isZero={false}
                        onTap={setDrawerSlug}
                        onFoul={handleFoul && row.slug !== session?.slug ? handleFoul : null}
                        isFlowWinner={row.slug === flowState?.winnerSlug && tab === "daily"}
                      />
                    ))}
                  </Card>
                )}
                <WarmingUpStrip
                  rows={warmingUp}
                  holidayMap={holidayMap}
                    catchphraseMap={catchphraseMap}
                  mySlug={session?.slug}
                  onTap={setDrawerSlug}
                  onFoul={handleFoul}
                />
              </>
            );
          })()}
        </Reveal>
      </SectionBand>

      {loggedIn && (
        <SectionBand bg="white" pad="40px 0" innerMaxWidth={520}>
          <Reveal>
            <SectionHeader
              label={feedTab === "activity" ? "Live feed" : "What's at stake"}
              title={feedTab === "activity" ? "Recent activity" : "The wheel"}
              accent={feedTab === "activity" ? C.turquoise : C.coralDeep}
              compact
            />
          </Reveal>
          <Reveal>
            <div style={{
              display: "flex",
              gap: 8,
              marginBottom: 16,
              justifyContent: "center",
              alignItems: "center",
            }}>
              <Pill
                active={feedTab === "activity"}
                accent={C.turquoise}
                onClick={() => setFeedTab("activity")}
              >
                Activity
              </Pill>
              <Pill
                active={feedTab === "wheel"}
                accent={C.coralDeep}
                onClick={() => setFeedTab("wheel")}
              >
                🎰 The Wheel
              </Pill>
            </div>
          </Reveal>
          <Reveal>
            <Card padding={0} style={{ overflow: "hidden" }}>
              {feedTab === "wheel" ? (
                <WheelTabPane />
              ) : activityLoading ? (
                [0, 1, 2].map((i) => (
                  <BoardRowSkeleton key={i} isLast={i === 2} />
                ))
              ) : activity.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: C.textBody, ...BODY }}>Nothing yet</div>
              ) : (
                activity.map((e) => <EntryRow key={e._id} entry={e} />)
              )}
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
              {history.map((r, i) => {
                const player = playerBySlug(r.loserSlug);
                const isLast = i === history.length - 1;
                const flowWinner = flowHistory?.byDay?.find((d) => d.dayNumber === r.dayNumber)?.winnerSlug;
                return (
                  <div key={r._id} style={{
                    padding: "12px 14px",
                    borderBottom: isLast ? undefined : `1px solid ${C.sandDark}`,
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                    {player && <Avatar player={player} size="sm" />}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, color: C.dark }}>
                        Day {r.dayNumber} · {displayName(r.loserSlug, holidayMap, player?.name)}
                      </div>
                      <div style={{ fontSize: 12, color: C.textBody, fontFamily: "Nunito, sans-serif" }}>
                        {r.forfeitLabel}
                      </div>
                      {flowWinner && (
                        <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 12, color: C.textBody, marginTop: 2 }}>
                          👑 {displayName(flowWinner, holidayMap, playerBySlug(flowWinner)?.name)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </Card>
          </Reveal>
        </SectionBand>
      )}

      <PlayerDayDrawer
        open={drawerSlug !== null}
        slug={drawerSlug}
        dailyKey={tab === "daily" ? currentDailyKey : undefined}
        dayLabel={tab === "daily" ? (gamesLive ? `Day ${currentDayNumber}` : "Pre-trip") : "Holiday total"}
        onClose={() => setDrawerSlug(null)}
      />

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
