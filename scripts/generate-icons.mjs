/**
 * Generate PNG icons from the SVG sources.
 * Run: node scripts/generate-icons.mjs
 *
 * The mark stands on its own: 16 is the tab, 48 the masthead's copy, 128 the
 * size a bookmark or a bot picks. 192 and 512 are what a manifest wants before
 * a browser offers to install the workspace, and a home screen gives an icon no
 * paper to sit on — those two come from `scripts/icon-app.svg`, the same note on
 * a flat sheet.
 */
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const markPath = resolve(root, "public/icons/icon.svg");
const appPath = resolve(__dirname, "icon-app.svg");
const outDir = resolve(root, "public/icons");

const bare = [16, 48, 128];
const onPaper = [192, 512];

async function write(svgBuffer, size) {
  const png = await sharp(svgBuffer)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const outPath = resolve(outDir, `icon${size}.png`);
  await writeFile(outPath, png);
  console.log(`Generated ${outPath} (${size}x${size})`);
}

async function main() {
  const mark = await readFile(markPath);
  const app = await readFile(appPath);

  for (const size of bare) await write(mark, size);
  for (const size of onPaper) await write(app, size);

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
