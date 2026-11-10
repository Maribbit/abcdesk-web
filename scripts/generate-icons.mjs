/**
 * Generate PNG icons from the SVG source.
 * Run: node scripts/generate-icons.mjs
 */
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const svgPath = resolve(root, "public/icons/icon.svg");
const outDir = resolve(root, "public/icons");

// 192 and 512 are what a manifest wants before a browser will offer to install
// the workspace; the smaller two are the tab and header marks.
const sizes = [16, 48, 128, 192, 512];

async function main() {
  const svgBuffer = await readFile(svgPath);

  for (const size of sizes) {
    const png = await sharp(svgBuffer)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    const outPath = resolve(outDir, `icon${size}.png`);
    await writeFile(outPath, png);
    console.log(`Generated ${outPath} (${size}x${size})`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
