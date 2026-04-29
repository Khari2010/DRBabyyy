// Compress source PNG/JPG avatars and large hero images into web-ready WebP.
// Run with: node scripts/optimize-avatars.mjs
// Idempotent: skips a target if a same-name .webp already exists and is newer than its source.

import { readdir, stat } from "node:fs/promises";
import { join, parse } from "node:path";
import sharp from "sharp";

const TARGETS = [
  { dir: "public/images/avatars", maxDim: 512, quality: 82 },
  { dir: "public/images/group", maxDim: 1600, quality: 78 },
];

const SOURCE_EXTS = new Set([".png", ".jpg", ".jpeg"]);

async function newer(srcPath, dstPath) {
  try {
    const [s, d] = await Promise.all([stat(srcPath), stat(dstPath)]);
    return s.mtimeMs > d.mtimeMs;
  } catch {
    return true;
  }
}

for (const { dir, maxDim, quality } of TARGETS) {
  let entries;
  try {
    entries = await readdir(dir);
  } catch {
    console.warn(`skip: ${dir} (not found)`);
    continue;
  }
  for (const name of entries) {
    const { ext, name: base } = parse(name);
    if (!SOURCE_EXTS.has(ext.toLowerCase())) continue;
    const src = join(dir, name);
    const dst = join(dir, `${base}.webp`);
    if (!(await newer(src, dst))) {
      console.log(`unchanged: ${dst}`);
      continue;
    }
    const before = (await stat(src)).size;
    await sharp(src)
      .resize({ width: maxDim, height: maxDim, fit: "inside", withoutEnlargement: true })
      .webp({ quality })
      .toFile(dst);
    const after = (await stat(dst)).size;
    const pct = Math.round((1 - after / before) * 100);
    console.log(`${dst}  ${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB  (-${pct}%)`);
  }
}
