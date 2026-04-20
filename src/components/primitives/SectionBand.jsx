import { C } from "../../data/colors.js";
import { SECTION } from "../../data/design.js";

/**
 * Section background band. Use to enforce consistent padding + alternating
 * white / sand / dark backgrounds across the page.
 *
 * Props:
 *  - bg: "white" | "sand" | "dark" (default "sand")
 *  - id: optional HTML id for anchor nav.
 *  - pad: override for vertical padding (defaults to SECTION.pad).
 *  - innerMaxWidth: inner content max-width (default SECTION.maxWidthWide = 1100).
 *  - children.
 */
export default function SectionBand({
  bg = "sand",
  id,
  pad = SECTION.pad,
  innerMaxWidth = SECTION.maxWidthWide,
  children,
}) {
  const palette = {
    white: { background: C.white, color: C.dark },
    sand: { background: C.sand, color: C.dark },
    dark: { background: C.dark, color: C.white },
  };
  const { background, color } = palette[bg] ?? palette.sand;

  return (
    <section id={id} style={{ background, color, padding: pad }}>
      <div
        style={{
          maxWidth: innerMaxWidth,
          margin: "0 auto",
          padding: SECTION.innerPad,
        }}
      >
        {children}
      </div>
    </section>
  );
}
