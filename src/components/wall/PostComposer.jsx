import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSession } from "../../lib/useSession.js";
import { compressImage } from "../../lib/compressImage.js";
import { C } from "../../data/colors.js";
import { RADIUS, SHADOW } from "../../data/design.js";

const MAX = 500;

export default function PostComposer() {
  const session = useSession();
  const create = useMutation(api.posts.create);
  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);
  const me = useQuery(api.players.getBySlug, session?.slug ? { slug: session.slug } : "skip");

  const [text, setText] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  if (!session) return null;

  const canSubmit = (text.trim().length > 0 || photoFile) && !busy;
  const placeholder = me?.holidayName ? `What's up, ${me.holidayName}?` : "What's up?";

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    const draft = text;
    setText("");
    const draftFile = photoFile;
    setPhotoFile(null);
    setPhotoPreview(null);
    try {
      let photoStorageId;
      if (draftFile) {
        const compressed = await compressImage(draftFile);
        const uploadUrl = await generateUploadUrl({ token: session.token });
        const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: compressed });
        const { storageId } = await res.json();
        photoStorageId = storageId;
      }
      await create({ token: session.token, text: draft, photoStorageId });
    } catch (err) {
      console.error(err);
      setText(draft);
      setPhotoFile(draftFile);
      if (draftFile) setPhotoPreview(URL.createObjectURL(draftFile));
      alert("Couldn't post. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      background: C.white,
      borderRadius: RADIUS.lg,
      boxShadow: SHADOW.card,
      padding: 14,
      marginBottom: 16,
    }}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX))}
        placeholder={placeholder}
        rows={3}
        style={{
          width: "100%", border: "none", outline: "none", resize: "none",
          fontFamily: "Nunito, sans-serif", fontSize: 16, color: C.dark, background: "transparent",
        }}
      />
      {photoPreview && (
        <div style={{ position: "relative", marginTop: 8 }}>
          <img src={photoPreview} alt="" style={{ width: "100%", borderRadius: RADIUS.md, display: "block" }} />
          <button
            onClick={() => { setPhotoFile(null); setPhotoPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
            style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: 16, width: 28, height: 28, cursor: "pointer" }}
          >×</button>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", padding: 4 }}
            aria-label="Add photo"
          >📷</button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setPhotoFile(f);
              setPhotoPreview(URL.createObjectURL(f));
            }}
            style={{ display: "none" }}
          />
          <span style={{ fontSize: 12, color: C.textBody }}>{text.length}/{MAX}</span>
        </div>
        <button
          onClick={submit}
          disabled={!canSubmit}
          style={{
            background: canSubmit ? C.coral : C.sandDark,
            color: canSubmit ? "white" : C.textBody,
            border: "none",
            borderRadius: RADIUS.pill,
            padding: "8px 18px",
            fontFamily: "Nunito, sans-serif",
            fontWeight: 800,
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >{busy ? "Posting…" : "Post"}</button>
      </div>
    </div>
  );
}
