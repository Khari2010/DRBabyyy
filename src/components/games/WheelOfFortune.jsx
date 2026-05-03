import { useRef, useState } from "react";
import { FORFEITS } from "../../data/forfeits.js";
import { C } from "../../data/colors.js";
import { RADIUS, SHADOW } from "../../data/design.js";

const SIZE = 320;
const RADIUS_PX = 140;
const CX = SIZE / 2;
const CY = SIZE / 2;
const SLICE_DEG = 360 / FORFEITS.length;
const SPIN_REVOLUTIONS = 5;
const SPIN_MS = 4500;

// Slice geometry. Each slice i is centered at angle -90 + i*SLICE_DEG so that
// slice 0 sits exactly under the pointer at rest. After CSS rotation R the
// slice at the pointer is the one for which i*SLICE_DEG + R ≡ 0 (mod 360).
function buildSlice(i) {
  const startDeg = -90 + (i - 0.5) * SLICE_DEG;
  const endDeg = -90 + (i + 0.5) * SLICE_DEG;
  const startA = (startDeg * Math.PI) / 180;
  const endA = (endDeg * Math.PI) / 180;
  const x1 = (CX + RADIUS_PX * Math.cos(startA)).toFixed(2);
  const y1 = (CY + RADIUS_PX * Math.sin(startA)).toFixed(2);
  const x2 = (CX + RADIUS_PX * Math.cos(endA)).toFixed(2);
  const y2 = (CY + RADIUS_PX * Math.sin(endA)).toFixed(2);
  const path = `M ${CX} ${CY} L ${x1} ${y1} A ${RADIUS_PX} ${RADIUS_PX} 0 0 1 ${x2} ${y2} Z`;
  const midDeg = -90 + i * SLICE_DEG;
  const midA = (midDeg * Math.PI) / 180;
  const labelX = (CX + RADIUS_PX * 0.7 * Math.cos(midA)).toFixed(2);
  const labelY = (CY + RADIUS_PX * 0.7 * Math.sin(midA)).toFixed(2);
  return { path, labelX, labelY };
}

const SLICES = FORFEITS.map((_, i) => buildSlice(i));

export default function WheelOfFortune() {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const pendingIndex = useRef(null);

  const spin = () => {
    if (spinning) return;
    setResult(null);
    const targetIndex = Math.floor(Math.random() * FORFEITS.length);
    pendingIndex.current = targetIndex;
    setRotation((prev) => {
      const targetMod = ((-targetIndex * SLICE_DEG) % 360 + 360) % 360;
      const currentMod = ((prev % 360) + 360) % 360;
      const delta = ((targetMod - currentMod) + 360) % 360;
      return prev + 360 * SPIN_REVOLUTIONS + delta;
    });
    setSpinning(true);
  };

  const handleTransitionEnd = () => {
    if (!spinning) return;
    setSpinning(false);
    if (pendingIndex.current != null) {
      setResult(FORFEITS[pendingIndex.current]);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
      <div style={{ position: "relative", width: SIZE, height: SIZE }}>
        {/* Pointer */}
        <div
          style={{
            position: "absolute",
            top: -4,
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "14px solid transparent",
            borderRight: "14px solid transparent",
            borderTop: `22px solid ${C.dark}`,
            zIndex: 2,
            filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.3))`,
          }}
        />
        {/* Rotating wrapper — div wrapper performs better than animating <svg>. */}
        <div
          onTransitionEnd={handleTransitionEnd}
          style={{
            width: SIZE,
            height: SIZE,
            transform: `rotate(${rotation}deg)`,
            transition: spinning
              ? `transform ${SPIN_MS}ms cubic-bezier(0.17, 0.67, 0.27, 0.99)`
              : "none",
            willChange: "transform",
            borderRadius: "50%",
            boxShadow: `0 12px 40px rgba(0,0,0,0.18), inset 0 0 0 6px ${C.white}`,
          }}
        >
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            style={{ display: "block", borderRadius: "50%" }}
          >
            {FORFEITS.map((f, i) => (
              <g key={f.id}>
                <path
                  d={SLICES[i].path}
                  fill={f.color}
                  stroke={C.white}
                  strokeWidth={2}
                />
                <text
                  x={SLICES[i].labelX}
                  y={SLICES[i].labelY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={22}
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {f.icon}
                </text>
              </g>
            ))}
            <circle cx={CX} cy={CY} r={32} fill={C.dark} />
            <text
              x={CX}
              y={CY}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={24}
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              ⭐
            </text>
          </svg>
        </div>
      </div>

      <button
        onClick={spin}
        disabled={spinning}
        style={{
          background: spinning ? C.sandDark : C.gold,
          color: spinning ? C.textBody : C.white,
          border: "none",
          borderRadius: RADIUS.pill,
          padding: "14px 36px",
          fontFamily: "'Dela Gothic One', sans-serif",
          fontSize: 18,
          letterSpacing: 1,
          cursor: spinning ? "not-allowed" : "pointer",
          boxShadow: spinning ? "none" : SHADOW.floating,
          transition: "all 0.3s ease",
          minWidth: 160,
        }}
      >
        {spinning ? "Spinning…" : "Spin the wheel"}
      </button>

      {result && <ResultModal forfeit={result} onClose={() => setResult(null)} />}
    </div>
  );
}

function ResultModal({ forfeit, onClose }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.white,
          borderRadius: RADIUS.xl,
          padding: "36px 28px 28px",
          width: "min(420px, 100%)",
          textAlign: "center",
          boxShadow: SHADOW.dramatic,
          border: `4px solid ${forfeit.color}`,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -28,
            left: "50%",
            transform: "translateX(-50%)",
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: forfeit.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            boxShadow: SHADOW.floating,
          }}
        >
          {forfeit.icon}
        </div>
        <div
          style={{
            fontFamily: "Nunito, sans-serif",
            fontWeight: 900,
            fontSize: 11,
            color: forfeit.color,
            letterSpacing: 3,
            textTransform: "uppercase",
            marginTop: 16,
            marginBottom: 8,
          }}
        >
          Your forfeit
        </div>
        <div
          style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            fontSize: 28,
            color: C.dark,
            lineHeight: 1.2,
            marginBottom: 20,
          }}
        >
          {forfeit.label}
        </div>
        <button
          onClick={onClose}
          style={{
            background: C.dark,
            color: C.white,
            border: "none",
            borderRadius: RADIUS.pill,
            padding: "10px 28px",
            fontFamily: "Nunito, sans-serif",
            fontWeight: 800,
            fontSize: 13,
            letterSpacing: 1,
            cursor: "pointer",
          }}
        >
          Take it like a champ
        </button>
      </div>
    </div>
  );
}
