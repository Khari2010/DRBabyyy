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

function drawCircularAvatar(ctx, img, cx, cy, radius, accent) {
  // Soft white halo to lift the portrait off the gradient
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 22, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fill();
  ctx.restore();

  // Clip and draw the image as a square covering the circle bounds
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const target = radius * 2;
  // object-fit: cover — scale so the shorter side matches, then center-crop.
  const scale = Math.max(target / iw, target / ih);
  const drawW = iw * scale;
  const drawH = ih * scale;
  ctx.drawImage(img, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
  ctx.restore();

  // White inner ring (sits flush against the photo)
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.stroke();

  // Accent outer ring — picks up each player's signature color
  if (accent) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 14, 0, Math.PI * 2);
    ctx.lineWidth = 8;
    ctx.strokeStyle = accent;
    ctx.stroke();
  }
}

function drawLockscreen(ctx, holidayName, avatarImg, accent) {
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
  // Positioned below the iOS clock digits (which end around y≈600 on a
  // 1290×2796 wallpaper) so the pill never sits underneath the time.
  const pillText = "PUNTA CANA  ·  MAY 18 – 29";
  ctx.font = "800 44px Nunito, sans-serif";
  const textWidth = ctx.measureText(pillText).width;
  const pillW = textWidth + 110;
  const pillH = 96;
  const pillX = (W - pillW) / 2;
  const pillY = 700;
  ctx.fillStyle = C.coral;
  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.fillStyle = C.white;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(pillText, W / 2, pillY + pillH / 2);

  // ── Player portrait (optional) ─────────────────────────────────────────
  if (avatarImg) {
    drawCircularAvatar(ctx, avatarImg, W / 2, 1060, 200, accent);
  }

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
  // Shifted down to make space for the portrait above the title block.
  const flowCenter = H * 0.58;
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

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export default function LockscreenGenerator({
  holidayName,
  legalName,
  avatarUrl,
  accent = C.coral,
  defaultCollapsed = false,
}) {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const nameForDraw = (holidayName && holidayName.trim()) || legalName || "DR CREW";

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const [, , , , avatarImg] = await Promise.all([
        document.fonts.load("400 320px 'Dela Gothic One'").catch(() => null),
        document.fonts.load("400 110px 'Dela Gothic One'").catch(() => null),
        document.fonts.load("800 44px Nunito").catch(() => null),
        document.fonts.load("700 32px Nunito").catch(() => null),
        loadImage(avatarUrl),
      ]);
      if (cancelled) return;
      drawLockscreen(ctx, nameForDraw, avatarImg, accent);
      setReady(true);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [nameForDraw, avatarUrl, accent]);

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

  if (collapsed) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px", background: C.sand, borderRadius: 8,
        fontFamily: "Nunito, sans-serif", fontSize: 13,
      }}>
        <span style={{ flex: 1 }}>
          📱 iPhone lockscreen
        </span>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          style={{
            padding: "4px 10px", borderRadius: 6,
            background: "transparent", border: `1px solid ${C.dark}`, color: C.dark,
            fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 11, cursor: "pointer",
          }}
        >
          Generate
        </button>
      </div>
    );
  }

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
