#!/usr/bin/env node
/**
 * Turn a horizontal archive clip into a vertical YouTube Short (1080x1920).
 * The original video is centered on a blurred, zoomed copy of itself, so the
 * whole frame (the whole band) stays visible instead of being cropped. No text
 * overlay. Output is H.264/AAC with +faststart, ready to upload.
 *
 * Usage:
 *   node scripts/make-short.mjs <input> [options]
 *
 * Options:
 *   --start, -s <t>   start time (e.g. 45 or 0:45 or 1:02:03). default 0
 *   --dur,   -t <t>   clip length (seconds or timestamp). default: to end
 *   --end,   -e <t>   end time (alternative to --dur)
 *   --out,   -o <f>   output path. default: <dir>/shorts/<name>-short.mp4
 *   --crf      <n>    quality, lower = better. default 18
 *   --dry             print the ffmpeg command and exit
 *
 * Examples:
 *   node scripts/make-short.mjs clip.mp4 -s 0:45 -t 30
 *   node scripts/make-short.mjs clip.mp4 --start 1:10 --end 1:38 -o teaser.mp4
 */
import { existsSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, dirname, extname, join } from "node:path";

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const flag = (names, def) => {
  for (const n of names) {
    const i = args.indexOf(n);
    if (i >= 0 && args[i + 1]) return args[i + 1];
  }
  return def;
};

const input = args.find((a) => !a.startsWith("-") && /\.(mp4|mov|mkv|webm|flv|m4v|avi)$/i.test(a));
if (!input) {
  console.error("usage: node scripts/make-short.mjs <input> [-s 0:45] [-t 30] [-o out.mp4]");
  process.exit(1);
}
if (!existsSync(input)) {
  console.error(`not found: ${input}`);
  process.exit(1);
}

const start = flag(["--start", "-s"], "0");
const dur = flag(["--dur", "-t"], null);
const end = flag(["--end", "-e"], null);
const crf = flag(["--crf"], "18");

// "1:02:03" / "1:30" / "90" -> seconds
const toSeconds = (t) =>
  String(t)
    .split(":")
    .reduce((acc, n) => acc * 60 + Number(n), 0);

// Resolve a -t duration. --end wins if given.
let durArg = dur;
if (end != null) durArg = String(toSeconds(end) - toSeconds(start));
if (durArg != null && toSeconds(durArg) > 180)
  console.warn(`note: ${durArg}s is over the 3-minute Shorts limit.`);

const outPath =
  flag(["--out", "-o"], null) ??
  join(dirname(input), "shorts", `${basename(input, extname(input))}-short.mp4`);
mkdirSync(dirname(outPath), { recursive: true });

// Blurred fill: bg = source scaled to cover 1080x1920 then blurred; fg = source
// fit inside 1080x1920; fg centered over bg.
const filter = [
  "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,boxblur=22:2,crop=1080:1920,setsar=1[bg]",
  "[0:v]scale=1080:1920:force_original_aspect_ratio=decrease:flags=lanczos[fg]",
  "[bg][fg]overlay=(W-w)/2:(H-h)/2[v]",
].join(";");

const ff = [
  "-hide_banner",
  "-y",
  ...(start !== "0" ? ["-ss", start] : []),
  "-i", input,
  ...(durArg != null ? ["-t", durArg] : []),
  "-filter_complex", filter,
  "-map", "[v]",
  "-map", "0:a?", // optional: don't fail on silent sources
  "-c:v", "libx264", "-preset", "medium", "-crf", crf, "-pix_fmt", "yuv420p", "-r", "30",
  "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-ac", "2",
  "-movflags", "+faststart",
  outPath,
];

if (DRY) {
  console.log("ffmpeg " + ff.map((a) => (/\s/.test(a) ? `'${a}'` : a)).join(" "));
  process.exit(0);
}

console.log(`Short: ${input}  ->  ${outPath}`);
console.log(`  start ${start}${durArg != null ? `, ${durArg}s` : ", to end"}\n`);
const res = spawnSync("ffmpeg", ff, { stdio: "inherit" });
if (res.status !== 0) {
  console.error("\nffmpeg failed.");
  process.exit(res.status ?? 1);
}
console.log(`\nwrote ${outPath}`);
