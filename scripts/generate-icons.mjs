import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, "../src/assets/icon-source.svg");
const OUT = resolve(__dirname, "../public/icons");

const SIZES = [180, 192, 512];

await mkdir(OUT, { recursive: true });
for (const size of SIZES) {
  const dest = resolve(OUT, `icon-${size}.png`);
  await sharp(SRC).resize(size, size).png().toFile(dest);
  console.log(`wrote ${dest}`);
}
