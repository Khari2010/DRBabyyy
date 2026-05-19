import { useEffect, useRef, useState } from "react";
import { C } from "../data/colors.js";

const W = 1290;
const H = 2796;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Auto-shrink font size so the rendered text fits within maxWidth.
function fitFontSize(ctx, text, fontTemplate, startSize, maxWidth, minSize = 48) {
  let size = startSize;
  while (size > minSize) {
    ctx.font = fontTemplate.replace("{size}", `${size}`);
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 6;
  }
  ctx.font = fontTemplate.replace("{size}", `${minSize}`);
  return minSize;
}

function drawLockscreen(ctx, holidayName) {
  ctx.clearRect(0, 0, W, H);

  // ── Background gradient: sky → cream ────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#7DB8E0");
  bg.addColorStop(0.55, "#BCD0D9");
  bg.addColorStop(0.85, "#E8DCC4");
  bg.addColorStop(1, "#FEF9EF");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ── Date pill ───────────────────────────────────────────────────────────
  const pillText = "PUNTA CANA  ·  MAY 18 – 29";
  ctx.font = "800 44px Nunito, sans-serif";
  const textWidth = ctx.measureText(pillText).width;
  const pillW = textWidth + 110;
  const pillH = 96;
  const pillX = (W - pillW) / 2;
  const pillY = 560;
  ctx.fillStyle = C.coral;
  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.fillStyle = C.white;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(pillText, W / 2, pillY + pillH / 2);

  // ── FLOW STATE — auto-fit so both lines stay within side margins ────────
  const flowFontTemplate = "400 {size}px 'Dela Gothic One', system-ui, sans-serif";
  const flowMaxWidth = W - 200;
  // "STATE" is longer than "FLOW" so it sets the cap.
  const flowSize = Math.min(
    fitFontSize(ctx, "FLOW", flowFontTemplate, 280, flowMaxWidth, 160),
    fitFontSize(ctx, "STATE", flowFontTemplate, 280, flowMaxWidth, 160),
  );
  ctx.font = flowFontTemplate.replace("{size}", `${flowSize}`);
  ctx.textBaseline = "alphabetic";
  const lineGap = flowSize * 0.92;
  const blockHeight = lineGap + flowSize;
  // Vertically center the FLOW STATE block around 52% of the canvas.
  const flowCenter = H * 0.52;
  const flowY1 = flowCenter - blockHeight / 2 + flowSize * 0.82;
  const flowY2 = flowY1 + lineGap;
  const shadowOffset = Math.round(flowSize * 0.055);
  ctx.fillStyle = C.coral;
  ctx.fillText("FLOW", W / 2 + shadowOffset, flowY1 + shadowOffset);
  ctx.fillText("STATE", W / 2 + shadowOffset, flowY2 + shadowOffset);
  ctx.fillStyle = C.white;
  ctx.fillText("FLOW", W / 2, flowY1);
  ctx.fillText("STATE", W / 2, flowY2);

  // ── Holiday name (yellow tag) ──────────────────────────────────────────
  const tagText = (holidayName || "DR CREW").toUpperCase();
  const tagFontTemplate = "400 {size}px 'Dela Gothic One', system-ui, sans-serif";
  const tagSize = fitFontSize(ctx, tagText, tagFontTemplate, 170, W - 280, 80);
  ctx.font = tagFontTemplate.replace("{size}", `${tagSize}`);
  const tagY = flowY2 + tagSize * 1.7;
  ctx.fillStyle = C.yellow;
  ctx.fillText(tagText, W / 2, tagY);

  // Divider line with center dot
  const divY = tagY + tagSize * 0.65;
  const measuredTagWidth = ctx.measureText(tagText).width;
  const lineHalf = Math.min(260, Math.max(140, measuredTagWidth / 2.4));
  ctx.strokeStyle = C.white;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(W / 2 - lineHalf, divY);
  ctx.lineTo(W / 2 - 32, divY);
  ctx.moveTo(W / 2 + 32, divY);
  ctx.lineTo(W / 2 + lineHalf, divY);
  ctx.stroke();
  ctx.fillStyle = C.white;
  ctx.beginPath();
  ctx.arc(W / 2, divY, 6, 0, Math.PI * 2);
  ctx.fill();

  // ── Footer (DR · 2026 + coords) ────────────────────────────────────────
  ctx.font = "700 32px Nunito, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  const footerY = 2440;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("DR   ·   2026", 120, footerY);
  ctx.textAlign = "right";
  ctx.fillText("18°28'N    68°22'W", W - 120, footerY);
}

export default function LockscreenGenerator({ holidayName, legalName, accent = C.coral }) {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const nameForDraw = (holidayName && holidayName.trim()) || legalName || "DR CREW";

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      try {
        await Promise.all([
          document.fonts.load("400 320px 'Dela Gothic One'"),
          document.fonts.load("400 110px 'Dela Gothic One'"),
          document.fonts.load("800 44px Nunito"),
          document.fonts.load("700 32px Nunito"),
        ]);
      } catch {
        /* fonts may not be loadable in test env — fall through */
      }
      if (cancelled) return;
      drawLockscreen(ctx, nameForDraw);
      setReady(true);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [nameForDraw]);

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloading(true);
    try {
      const blob = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png", 1),
      );
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safeName = nameForDraw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      a.href = url;
      a.download = `flow-state-${safeName || "lockscreen"}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 560,
        margin: "16px auto 0",
        padding: "20px 24px 22px",
        background: C.white,
        borderRadius: 16,
        boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
        border: `1px solid ${C.sandDark}`,
      }}
    >
      <div
        style={{
          fontFamily: "Nunito, sans-serif",
          fontWeight: 800,
          fontSize: 11,
          color: C.white,
          background: accent,
          padding: "4px 12px",
          borderRadius: 16,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          display: "inline-block",
          marginBottom: 10,
        }}
      >
        Your Lockscreen
      </div>
      <div
        style={{
          fontFamily: "Nunito, sans-serif",
          color: C.textBody,
          fontSize: 14,
          fontWeight: 500,
          marginBottom: 14,
          lineHeight: 1.5,
        }}
      >
        Built for iPhone (1290 × 2796). Set your holiday name above to
        personalise the yellow tag, then download below.
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "8px 0 16px",
        }}
      >
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{
            width: 240,
            height: "auto",
            borderRadius: 18,
            boxShadow: "0 12px 32px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06)",
            background: C.sand,
            display: "block",
          }}
        />
      </div>

      <button
        type="button"
        onClick={handleDownload}
        disabled={!ready || downloading}
        style={{
          display: "block",
          width: "100%",
          background: ready ? accent : C.sandDark,
          color: C.white,
          border: "none",
          borderRadius: 10,
          padding: "12px 16px",
          fontFamily: "Nunito, sans-serif",
          fontWeight: 800,
          fontSize: 14,
          letterSpacing: 0.5,
          cursor: ready ? "pointer" : "default",
        }}
      >
        {downloading ? "Preparing…" : ready ? "Download lockscreen (PNG)" : "Loading fonts…"}
      </button>
    </div>
  );
}
