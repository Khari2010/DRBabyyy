import { FORFEITS } from "../data/forfeits.js";
import { C } from "../data/colors.js";
import { MICRO_LABEL } from "../data/design.js";

const SIZE = 280;
const RADIUS_PX = 122;
const CX = SIZE / 2;
const CY = SIZE / 2;
const SLICE_DEG = 360 / FORFEITS.length;

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
  const iconX = (CX + RADIUS_PX * 0.7 * Math.cos(midA)).toFixed(2);
  const iconY = (CY + RADIUS_PX * 0.7 * Math.sin(midA)).toFixed(2);
  return { path, iconX, iconY };
}

const SLICES = FORFEITS.map((_, i) => buildSlice(i));

export default function WheelTabPane() {
  return (
    <div style={{
      padding: "20px 16px 24px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 18,
    }}>
      <div style={{ position: "relative", width: SIZE, height: SIZE }}>
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -4,
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "10px solid transparent",
            borderRight: "10px solid transparent",
            borderTop: `16px solid ${C.dark}`,
            zIndex: 2,
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.25))",
          }}
        />
        <div style={{
          width: SIZE,
          height: SIZE,
          borderRadius: "50%",
          boxShadow: `0 10px 30px rgba(0,0,0,0.15), inset 0 0 0 5px ${C.white}`,
        }}>
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
                  x={SLICES[i].iconX}
                  y={SLICES[i].iconY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={20}
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {f.icon}
                </text>
              </g>
            ))}
            <circle cx={CX} cy={CY} r={28} fill={C.dark} />
            <text
              x={CX}
              y={CY}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={22}
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              🎰
            </text>
          </svg>
        </div>
      </div>

      <div style={{
        textAlign: "center",
        fontFamily: "Nunito, sans-serif",
        fontSize: 13,
        color: C.textBody,
        maxWidth: 320,
        lineHeight: 1.45,
      }}>
        Lowest scorer takes one. The wheel spins at End&nbsp;Day —
        you can't dodge it.
      </div>

      <div style={{
        width: "100%",
        maxWidth: 420,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "8px 12px",
        marginTop: 4,
      }}>
        {FORFEITS.map((f) => (
          <div key={f.id} style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "Nunito, sans-serif",
            fontSize: 12,
            color: C.dark,
            minWidth: 0,
          }}>
            <span style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: f.color,
              flexShrink: 0,
              boxShadow: `0 0 0 1px ${C.white}, 0 0 0 2px ${f.color}55`,
            }} />
            <span style={{ fontSize: 14 }}>{f.icon}</span>
            <span style={{
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>{f.label}</span>
          </div>
        ))}
      </div>

      <div style={{
        ...MICRO_LABEL,
        color: C.textBody,
        marginTop: 6,
      }}>
        {FORFEITS.length} possible forfeits
      </div>
    </div>
  );
}
