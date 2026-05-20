import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/useSession.js";
import { compressImage } from "../lib/compressImage.js";
import { showToast } from "../lib/useToast.js";
import { C } from "../data/colors.js";
import { RADIUS, HEADING, BODY, MICRO_LABEL } from "../data/design.js";
import BottomSheet from "./primitives/BottomSheet.jsx";

const DIFFICULTY_COLOR = { easy: C.green, medium: C.gold, wild: C.coralDeep };
const MEDAL = { 1: "🥇", 2: "🥈" };

export default function ScavengerClaimSheet({ item, onClose }) {
  const session = useSession();
  const token = session?.token;
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  const finders = useQuery(api.scavenger.getItemFinders, item ? { scavengerItemId: item.id } : "skip") ?? [];
  const activeCount = finders.length;
  const nextRank = Math.min(activeCount + 1, 3);
  const bonus = { 1: 5, 2: 3, 3: 0 }[nextRank];
  const willEarn = item ? item.points + bonus : 0;

  const generateUploadUrl = useMutation(api.scavenger.generateUploadUrl);
  const claim = useMutation(api.entries.claimScavenger);

  const onPick = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const onSubmit = async () => {
    if (!file || !token || !item) return;
    setSubmitting(true);
    try {
      const compressed = await compressImage(file);
      const url = await generateUploadUrl({ token });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: compressed,
      });
      if (!res.ok) throw new Error("upload failed");
      const { storageId } = await res.json();
      await claim({ token, scavengerItemId: item.id, photoStorageId: storageId });
      const medal = MEDAL[nextRank] ? ` · ${MEDAL[nextRank]} ${nextRank === 1 ? "1st" : "2nd"}!` : "";
      showToast({
        message: `+${willEarn} · ${item.name}${medal}`,
        icon: item.icon,
        durationMs: 4000,
      });
      onClose();
    } catch (err) {
      showToast({ message: err.message || "Claim failed", accent: C.coralDeep });
      setSubmitting(false);
    }
  };

  if (!item) return null;
  const stripe = DIFFICULTY_COLOR[item.difficulty];

  return (
    <BottomSheet open onClose={submitting ? () => {} : onClose}>
      <div style={{ padding: 20 }}>
        <div style={{ ...MICRO_LABEL, color: stripe, marginBottom: 4 }}>
          {item.difficulty} · {item.points}pt base
        </div>
        <h3 style={{ ...HEADING.h3, color: C.dark, margin: 0 }}>
          {item.icon} {item.name}
        </h3>
        <div style={{ ...BODY, marginTop: 8 }}>
          Rank available right now:{" "}
          <strong>
            {MEDAL[nextRank] ?? "#3+"} · +{willEarn} total
          </strong>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onPick}
          style={{ display: "none" }}
        />

        {!preview ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            style={{
              width: "100%", marginTop: 16,
              padding: "16px 12px", borderRadius: RADIUS.md,
              background: C.gold, color: C.white, border: 0,
              fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 15,
              cursor: "pointer",
            }}
          >📷 Take photo</button>
        ) : (
          <>
            <img
              src={preview}
              alt=""
              style={{
                width: "100%", marginTop: 16,
                borderRadius: RADIUS.md, aspectRatio: "1/1", objectFit: "cover",
              }}
            />
            <button
              type="button"
              onClick={() => { setFile(null); setPreview(null); inputRef.current?.click(); }}
              style={{
                marginTop: 8, background: "transparent", border: 0,
                color: C.textBody, fontFamily: "Nunito, sans-serif",
                fontSize: 13, cursor: "pointer", textDecoration: "underline",
              }}
            >Retake</button>
            <button
              type="button"
              disabled={submitting}
              onClick={onSubmit}
              style={{
                width: "100%", marginTop: 12,
                padding: "16px 12px", borderRadius: RADIUS.md,
                background: submitting ? C.sandDark : C.dark,
                color: C.white, border: 0,
                fontFamily: "'Dela Gothic One', sans-serif", fontSize: 16,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Uploading…" : `Claim +${willEarn}`}
            </button>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
