// Normalize album cover art to one square {slug}.jpg per album, sourced from the
// 280x280 WordPress thumbnail (falling back to 200x200 where no 280 exists),
// then remove the size-variant clutter. The committed bases were the large
// "featured" images — many non-square banners that cropped badly into the
// square card — and are no longer needed.
//
// Usage: node scripts/fix-album-covers.mjs [--apply]   (default: dry run)
import { readdirSync, existsSync, copyFileSync, rmSync } from "node:fs";
import albums from "../db/data/albums.json" with { type: "json" };

const APPLY = process.argv.includes("--apply");
const DIR = "public/thumbs/album";
const present = new Set(readdirSync(DIR));

let from280 = 0,
  from200 = 0,
  keptBase = 0,
  missing = 0;

for (const a of albums) {
  const base = `${a.slug}.jpg`;
  const v280 = `${a.slug}-280x280.jpg`;
  const v200 = `${a.slug}-200x200.jpg`;

  let source = null;
  if (present.has(v280)) (source = v280), from280++;
  else if (present.has(v200)) (source = v200), from200++;

  if (source) {
    if (APPLY) copyFileSync(`${DIR}/${source}`, `${DIR}/${base}`);
  } else if (present.has(base)) {
    console.log(`keep base ${base}  (no 280/200 variant)`);
    keptBase++;
  } else {
    console.log(`MISSING   ${base}  (no art at all)`);
    missing++;
  }
}

// Delete every size variant, 50x50, stray " copy" files, and any orphan base
// image whose slug doesn't match a published album (leftover featured banners).
const slugSet = new Set(albums.map((a) => a.slug));
const junk = readdirSync(DIR).filter((f) => {
  if (/-(50x50|200x200|280x280)\.(jpe?g|png)$/i.test(f)) return true;
  if (/ copy\.(jpe?g|png)$/i.test(f)) return true;
  const m = f.match(/^(.*)\.(jpe?g|png)$/i);
  return m ? !slugSet.has(m[1]) : false; // orphan base, not an album cover
});

console.log(
  `\nfrom 280x280: ${from280}, from 200x200: ${from200}, kept base: ${keptBase}, missing: ${missing}`,
);
console.log(`junk to delete: ${junk.length} files`);
if (APPLY) {
  for (const f of junk) rmSync(`${DIR}/${f}`);
  console.log("applied: covers set to square thumbs, variants + copies removed");
} else {
  console.log("(dry run — pass --apply to write)");
}
