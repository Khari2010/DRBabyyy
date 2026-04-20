import { FLIGHTS } from "../data/flights.js";
import { C } from "../data/colors.js";

const MONTHS = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

// Parse "18 May" → Date in 2026.
function parseTripDate(str) {
  if (!str) return null;
  const [dayStr, monStr] = str.split(" ");
  const day = Number(dayStr);
  const month = MONTHS[monStr];
  if (Number.isNaN(day) || month === undefined) return null;
  return new Date(2026, month, day);
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function wholeDaysBetween(fromDate, toDate) {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.floor((toDate - fromDate) / MS_PER_DAY);
}

function computeState(player) {
  const outbound = FLIGHTS.find(
    (f) => f.type === "Outbound" && f.who.includes(player.name),
  );
  const ret = FLIGHTS.find(
    (f) => f.type === "Return" && f.who.includes(player.name),
  );
  const outDate = parseTripDate(outbound?.date);
  const retDate = parseTripDate(ret?.date);
  const today = startOfToday();

  if (!outDate) return { kind: "unknown" };

  if (today < outDate) {
    const days = wholeDaysBetween(today, outDate);
    return { kind: "before", days, outDate, retDate };
  }
  if (retDate && today <= retDate) {
    return { kind: "during", outDate, retDate };
  }
  return { kind: "after", outDate, retDate };
}

export default function YourCountdown({ player }) {
  const state = computeState(player);

  const cardStyle = {
    position: "relative",
    maxWidth: "min(620px, 100%)",
    margin: "0 auto",
    background: `linear-gradient(135deg, ${player.color}22, ${C.sand})`,
    border: `1px solid ${player.color}33`,
    borderRadius: 28,
    padding: "clamp(32px, 7vw, 48px) clamp(20px, 5vw, 32px)",
    textAlign: "center",
    boxShadow: `0 24px 60px ${player.color}22, inset 0 0 60px ${player.color}0A`,
    overflow: "hidden",
    boxSizing: "border-box",
  };

  const DecorativeBlobs = () => (
    <>
      <div style={{
        position: "absolute", top: -40, right: -40,
        width: 160, height: 160, borderRadius: "50%",
        background: `${player.color}18`, pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: -50, left: -50,
        width: 180, height: 180, borderRadius: "50%",
        background: `${player.color}10`, pointerEvents: "none",
      }} />
    </>
  );

  if (state.kind === "before") {
    const { days } = state;
    const bigNum = days === 0 ? "TODAY" : String(days);
    const labelText =
      days === 0 ? "You fly today" : days === 1 ? "DAY TO GO" : "DAYS TO GO";
    return (
      <div style={cardStyle}>
        <DecorativeBlobs />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              fontFamily: "'Dela Gothic One', sans-serif",
              fontSize: days === 0 ? "clamp(56px, 14vw, 120px)" : "clamp(80px, 18vw, 160px)",
              color: player.color,
              lineHeight: 0.95,
              textShadow: `0 8px 40px ${player.color}44`,
              letterSpacing: -2,
            }}
          >
            {bigNum}
          </div>
          <div
            style={{
              marginTop: 18,
              fontFamily: "Nunito, sans-serif",
              fontWeight: 900,
              fontSize: 12,
              letterSpacing: 4,
              color: player.color,
              textTransform: "uppercase",
            }}
          >
            {labelText}
          </div>
          <div
            style={{
              marginTop: 14,
              fontFamily: "Nunito, sans-serif",
              fontSize: 15,
              color: C.textBody,
              fontWeight: 600,
            }}
          >
            until you land in Punta Cana 🌴
          </div>
        </div>
      </div>
    );
  }

  if (state.kind === "during") {
    return (
      <div style={cardStyle}>
        <DecorativeBlobs />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: "clamp(80px, 18vw, 140px)", lineHeight: 1, marginBottom: 12 }}>🌴</div>
          <div
            style={{
              fontFamily: "'Dela Gothic One', sans-serif",
              fontSize: "clamp(28px, 6vw, 40px)",
              color: C.dark,
              lineHeight: 1.1,
            }}
          >
            You're in Punta Cana right now
          </div>
          <div
            style={{
              marginTop: 14,
              fontFamily: "Nunito, sans-serif",
              fontSize: 15,
              color: C.textBody,
              fontWeight: 600,
            }}
          >
            Soak it up — you earned this.
          </div>
        </div>
      </div>
    );
  }

  if (state.kind === "after") {
    return (
      <div style={cardStyle}>
        <DecorativeBlobs />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: "clamp(72px, 16vw, 120px)", lineHeight: 1, marginBottom: 12 }}>💛</div>
          <div
            style={{
              fontFamily: "'Dela Gothic One', sans-serif",
              fontSize: "clamp(28px, 6vw, 40px)",
              color: C.dark,
              lineHeight: 1.1,
            }}
          >
            Hope you had a blast
          </div>
          <div
            style={{
              marginTop: 14,
              fontFamily: "Nunito, sans-serif",
              fontSize: 15,
              color: C.textBody,
              fontWeight: 600,
            }}
          >
            Until next time.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <DecorativeBlobs />
      <div style={{ position: "relative", zIndex: 1, fontFamily: "Nunito, sans-serif", color: C.textBody, fontWeight: 600 }}>
        Your flight details aren't locked in yet.
      </div>
    </div>
  );
}
