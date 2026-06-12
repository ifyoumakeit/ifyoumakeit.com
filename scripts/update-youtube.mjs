#!/usr/bin/env node
/**
 * Refresh YouTube view counts and hide videos that have gone private/deleted.
 *
 * Usage:
 *   YOUTUBE_API_KEY=xxxx node scripts/update-youtube.mjs        # update in place
 *   YOUTUBE_API_KEY=xxxx node scripts/update-youtube.mjs --dry  # report only
 *
 * Why a standalone script: it touches the YouTube Data API v3 only (no LLM
 * tokens) and is cheap enough to run on every deploy. It reads/writes
 * db/data/videos.json — the same file src/lib/db.ts loads at build time.
 *
 * What it does for each provider === "youtube" video:
 *   - Looks the id up via videos.list?part=statistics,status (batches of 50,
 *     so ~6 calls / 6 quota units for the whole archive).
 *   - Public/unlisted  -> writes the fresh statistics.viewCount into `views`.
 *   - private          -> sets `publish: 0` (privacyStatus === "private").
 *   - omitted (deleted, made private by owner, or terminated) -> sets
 *     `publish: 0`. A plain API key cannot see a private video, so the API
 *     simply drops it from the response — which is exactly "hide it" for us.
 *
 * It NEVER deletes a row and NEVER flips publish back to 1: hiding is
 * reversible by hand, and we don't want to clobber a manual unpublish. Videos
 * that recover are listed under "restorable" so you can re-publish on purpose.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const API_KEY = process.env.YOUTUBE_API_KEY;
if (!API_KEY) {
  console.error("error: set YOUTUBE_API_KEY (YouTube Data API v3 key)");
  process.exit(1);
}
const DRY = process.argv.includes("--dry");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = join(root, "db", "data", "videos.json");
const videos = JSON.parse(readFileSync(dataPath, "utf8"));

const youtube = videos.filter((v) => v.provider === "youtube");

// Legacy data carries a few malformed ids (stray "/" prefix, junk like "y").
// Normalize before lookup so a fixable id isn't mistaken for a dead video,
// and remember the clean id per row so we can repair it in place.
const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const norm = (raw) => String(raw ?? "").trim().replace(/^\/+|\/+$/g, "");
for (const v of youtube) v._id = norm(v.provider_id);

const ids = [...new Set(youtube.map((v) => v._id).filter((id) => YT_ID.test(id)))];

// ---- fetch statistics + status in batches of 50 -------------------------

/** id -> { viewCount, likeCount, commentCount, privacyStatus }. */
const info = new Map();

for (let i = 0; i < ids.length; i += 50) {
  const batch = ids.slice(i, i + 50);
  const url =
    "https://www.googleapis.com/youtube/v3/videos" +
    `?part=statistics,status&id=${batch.join(",")}&key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    console.error(`error: YouTube API ${res.status}\n${body}`);
    process.exit(1);
  }
  const json = await res.json();
  for (const item of json.items ?? []) {
    info.set(item.id, {
      viewCount: Number(item.statistics?.viewCount ?? 0),
      // likes/comments can be disabled by the owner — absent from the response.
      likeCount: Number(item.statistics?.likeCount ?? 0),
      commentCount: Number(item.statistics?.commentCount ?? 0),
      privacyStatus: item.status?.privacyStatus ?? "unknown",
    });
  }
}

// ---- reconcile ----------------------------------------------------------

let viewUpdates = 0;
let statUpdates = 0; // likes/comments changed
let idRepairs = 0;
const hidden = []; // newly set publish:0
const restorable = []; // available again but still publish:0 (manual call)

for (const v of youtube) {
  const valid = YT_ID.test(v._id);
  const hit = valid ? info.get(v._id) : undefined;
  const available = hit && hit.privacyStatus !== "private";

  if (available) {
    // Repair a normalized id back into the data (e.g. "/abc" -> "abc") so the
    // embed URL is well-formed too.
    if (v._id !== v.provider_id) {
      v.provider_id = v._id;
      idRepairs++;
    }
    if (hit.viewCount !== v.views) {
      v.views = hit.viewCount;
      viewUpdates++;
    }
    if (hit.likeCount !== (v.likes ?? 0)) {
      v.likes = hit.likeCount;
      statUpdates++;
    }
    if (hit.commentCount !== (v.comments ?? 0)) {
      v.comments = hit.commentCount;
      statUpdates++;
    }
    if (v.publish === 0) restorable.push(v);
    continue;
  }

  // Unavailable. Distinguish a malformed id (broken data, can't even be looked
  // up) from a real video that went private or was dropped from the response.
  const reason = !valid
    ? `invalid id ${JSON.stringify(v.provider_id)}`
    : hit
      ? "private"
      : "gone (deleted/private/terminated)";
  if (v.publish !== 0) {
    v.publish = 0;
    hidden.push({ slug: v.slug, id: v.provider_id, reason });
  }
}

for (const v of youtube) delete v._id; // don't serialize the scratch field

// ---- report + write -----------------------------------------------------

console.log(
  `youtube: ${youtube.length} checked, ${info.size} live · ` +
    `${viewUpdates} view counts updated · ${statUpdates} like/comment updates · ` +
    `${idRepairs} ids repaired · ${hidden.length} newly hidden`
);
for (const h of hidden) console.log(`  hide  ${h.slug}  (${h.id}) — ${h.reason}`);
for (const v of restorable)
  console.log(`  note  ${v.slug} (${v.provider_id}) is public again but kept publish:0`);

if (DRY) {
  console.log("dry run — videos.json not written");
} else if (viewUpdates || statUpdates || idRepairs || hidden.length) {
  // 1-space indent + trailing newline matches scripts/import-legacy.mjs output.
  writeFileSync(dataPath, JSON.stringify(videos, null, 1) + "\n");
  console.log("wrote db/data/videos.json");
} else {
  console.log("no changes");
}
