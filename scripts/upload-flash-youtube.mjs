#!/usr/bin/env node
/**
 * Migrate the legacy Flash-era recordings to YouTube.
 *
 * For each provider === "flash" video in db/data/videos.json it: finds the
 * matching source file by provider_id (filename) in --dir, transcodes it to
 * MP4 with ffmpeg, uploads it to the channel via the YouTube Data API v3
 * (title + description carrying the recording date + recordingDate metadata),
 * then flips that row to provider "youtube" with the new video id.
 *
 *   node scripts/upload-flash-youtube.mjs --dir /path/to/flv [--limit 6] [--dry]
 *
 * Dependency-free: OAuth uses the installed-app loopback flow and uploads use
 * the resumable protocol over fetch — no googleapis package.
 *
 * ── One-time setup ────────────────────────────────────────────────────────
 * Uploading writes to your channel, so it needs OAuth (not the read-only API
 * key). In Google Cloud Console (same project as the stats key):
 *   1. APIs & Services → Enable "YouTube Data API v3" (already on).
 *   2. OAuth consent screen → External; add yourself as a Test user; add the
 *      scope .../auth/youtube.upload.
 *   3. Credentials → Create credentials → OAuth client ID → Desktop app →
 *      download the JSON to scripts/.yt-oauth/client_secret.json
 * First run opens a browser to grant access; the refresh token is cached in
 * scripts/.yt-oauth/token.json. Both files are gitignored.
 *
 * ── Quota ─────────────────────────────────────────────────────────────────
 * videos.insert costs 1600 units; the default daily quota is 10,000 (~6
 * uploads/day). The script is resumable: migrated rows are now "youtube" and
 * are skipped next run, so just run it again the next day. --limit caps a run.
 */
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  statSync,
  createReadStream,
} from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OAUTH_DIR = join(root, "scripts", ".yt-oauth");
const TMP_DIR = join(root, "scripts", ".yt-tmp");
const CLIENT_SECRET = join(OAUTH_DIR, "client_secret.json");
const TOKEN_PATH = join(OAUTH_DIR, "token.json");
const DATA = join(root, "db", "data", "videos.json");
const SCOPE = "https://www.googleapis.com/auth/youtube.upload";

// ── args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : undefined;
};
const DIR = flag("--dir");
const LIMIT = Number(flag("--limit") ?? 6);
const DRY = args.includes("--dry");

if (!DIR) {
  console.error("usage: node scripts/upload-flash-youtube.mjs --dir /path/to/flv [--limit 6] [--dry]");
  process.exit(1);
}
if (!existsSync(DIR)) {
  console.error(`error: --dir not found: ${DIR}`);
  process.exit(1);
}

// ── small helpers ───────────────────────────────────────────────────────────
const sh = (cmd, argv) =>
  new Promise((res, rej) => {
    const p = spawn(cmd, argv, { stdio: ["ignore", "ignore", "inherit"] });
    p.on("error", rej);
    p.on("close", (code) => (code === 0 ? res() : rej(new Error(`${cmd} exited ${code}`))));
  });

const ask = (q) =>
  new Promise((res) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(q, (a) => {
      rl.close();
      res(a.trim());
    });
  });

function stripHtml(s) {
  return (s ?? "")
    .replace(/<\/(p|div|br)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const fmtDate = (iso) =>
  new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));

// ── OAuth (installed-app loopback) ──────────────────────────────────────────
function loadClientSecret() {
  if (!existsSync(CLIENT_SECRET)) {
    console.error(
      `error: missing ${CLIENT_SECRET}\nCreate an OAuth client (Desktop app) and download it there. See the header of this file.`
    );
    process.exit(1);
  }
  const j = JSON.parse(readFileSync(CLIENT_SECRET, "utf8"));
  const c = j.installed ?? j.web;
  if (!c) throw new Error("client_secret.json: expected an 'installed' app client");
  return { id: c.client_id, secret: c.client_secret };
}

async function exchange(body) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`token endpoint: ${JSON.stringify(j)}`);
  return j;
}

async function authorize() {
  const { id, secret } = loadClientSecret();

  // Cached refresh token → just mint an access token.
  if (existsSync(TOKEN_PATH)) {
    const t = JSON.parse(readFileSync(TOKEN_PATH, "utf8"));
    if (t.refresh_token) {
      const j = await exchange({
        client_id: id,
        client_secret: secret,
        refresh_token: t.refresh_token,
        grant_type: "refresh_token",
      });
      return j.access_token;
    }
  }

  // Loopback consent flow.
  const code = await new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const u = new URL(req.url, "http://127.0.0.1");
      if (!u.searchParams.has("code") && !u.searchParams.has("error")) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<h2>Authorized. You can close this tab and return to the terminal.</h2>");
      const err = u.searchParams.get("error");
      server.close();
      err ? reject(new Error(err)) : resolve(u.searchParams.get("code"));
    });
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      const redirect = `http://127.0.0.1:${port}`;
      const authUrl =
        "https://accounts.google.com/o/oauth2/v2/auth?" +
        new URLSearchParams({
          client_id: id,
          redirect_uri: redirect,
          response_type: "code",
          scope: SCOPE,
          access_type: "offline",
          prompt: "consent",
        });
      server._redirect = redirect;
      console.log("\nOpen this URL to authorize the upload:\n\n" + authUrl + "\n");
      spawn("open", [authUrl]).on("error", () => {}); // macOS convenience
    });
    server.on("error", reject);
    authorize._server = server;
  });

  const redirect = authorize._server._redirect;
  const tok = await exchange({
    client_id: id,
    client_secret: secret,
    code,
    redirect_uri: redirect,
    grant_type: "authorization_code",
  });
  mkdirSync(OAUTH_DIR, { recursive: true });
  writeFileSync(TOKEN_PATH, JSON.stringify(tok, null, 2));
  console.log("Saved refresh token to scripts/.yt-oauth/token.json\n");
  return tok.access_token;
}

// ── resumable upload ────────────────────────────────────────────────────────
async function uploadVideo(accessToken, filePath, meta) {
  const size = statSync(filePath).size;
  const init = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status,recordingDetails",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(size),
        "X-Upload-Content-Type": "video/mp4",
      },
      body: JSON.stringify(meta),
    }
  );
  if (!init.ok) {
    const body = await init.text();
    const e = new Error(`insert init ${init.status}: ${body}`);
    e.status = init.status;
    e.body = body;
    throw e;
  }
  const location = init.headers.get("location");
  if (!location) throw new Error("no resumable upload URL returned");

  const put = await fetch(location, {
    method: "PUT",
    headers: { "Content-Length": String(size), "Content-Type": "video/mp4" },
    body: createReadStream(filePath),
    duplex: "half",
  });
  const j = await put.json();
  if (!put.ok) throw new Error(`upload ${put.status}: ${JSON.stringify(j)}`);
  return j.id;
}

// ── main ────────────────────────────────────────────────────────────────────
const videos = JSON.parse(readFileSync(DATA, "utf8"));
const artists = JSON.parse(readFileSync(join(root, "db", "data", "artists.json"), "utf8"));
const aById = new Map(artists.map((a) => [a.id, a]));

const flash = videos.filter((v) => v.provider === "flash");
const pending = flash.filter((v) => existsSync(join(DIR, v.provider_id)));
const missing = flash.filter((v) => !existsSync(join(DIR, v.provider_id)));

console.log(
  `flash rows: ${flash.length} · source file found: ${pending.length} · missing: ${missing.length}`
);
if (missing.length) {
  console.log("missing files (skipped):");
  for (const v of missing) console.log(`  ${v.provider_id}  (${v.slug})`);
}
if (!pending.length) {
  console.log("nothing to upload.");
  process.exit(0);
}

mkdirSync(TMP_DIR, { recursive: true });

function buildMeta(v) {
  const artist = aById.get(v.artist_id)?.name ?? "";
  const date = fmtDate(v.recorded_at);
  const where = v.location ? ` · ${v.location}` : "";
  const blurb = stripHtml(v.description);
  const description =
    `${artist} — "${v.title}"\n` +
    `Recorded ${date}${where} for If You Make It.\n` +
    (blurb ? `\n${blurb}\n` : "") +
    `\nFrom the If You Make It DIY punk video archive — ifyoumakeit.com`;
  return {
    snippet: {
      title: `${artist} - "${v.title}"`,
      description,
      categoryId: "10", // Music
      tags: [artist, "If You Make It", "Pink Couch Sessions", "DIY", "punk"],
    },
    status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
    recordingDetails: { recordingDate: new Date(v.recorded_at).toISOString() },
  };
}

const accessToken = DRY ? null : await authorize();

let done = 0;
const fileToId = new Map(); // dedupe identical source files (e.g. ta.flv)
const batch = pending.slice(0, LIMIT);
console.log(`\nprocessing ${batch.length} of ${pending.length} (limit ${LIMIT})${DRY ? " — DRY RUN" : ""}\n`);

for (const v of batch) {
  const artist = aById.get(v.artist_id)?.name ?? "";
  const label = `${artist} — ${v.title}`;
  const src = join(DIR, v.provider_id);

  // Same physical file already uploaded this run? Reuse its id.
  if (fileToId.has(v.provider_id)) {
    const id = fileToId.get(v.provider_id);
    v.provider = "youtube";
    v.provider_id = id;
    v.views = 0;
    writeFileSync(DATA, JSON.stringify(videos, null, 1) + "\n");
    console.log(`reuse  ${label} → ${id} (duplicate source)`);
    continue;
  }

  const meta = buildMeta(v);
  if (DRY) {
    console.log(`would upload  ${label}`);
    console.log(`   title: ${meta.snippet.title}`);
    console.log(`   recordingDate: ${meta.recordingDetails.recordingDate}`);
    continue;
  }

  try {
    const mp4 = join(TMP_DIR, basename(v.provider_id).replace(/\.[^.]+$/, "") + ".mp4");
    process.stdout.write(`transcode  ${label} … `);
    await sh("ffmpeg", [
      "-y", "-i", src,
      "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "192k",
      "-movflags", "+faststart",
      mp4,
    ]);
    process.stdout.write("upload … ");
    const id = await uploadVideo(accessToken, mp4, meta);
    fileToId.set(basename(src), id);

    // Persist immediately so a mid-run failure never loses progress.
    v.provider = "youtube";
    v.provider_id = id;
    v.views = 0;
    writeFileSync(DATA, JSON.stringify(videos, null, 1) + "\n");
    done++;
    console.log(`done → https://youtu.be/${id}`);
  } catch (e) {
    console.log("FAILED");
    if (e.status === 403 && /quota/i.test(e.body ?? "")) {
      console.error(`\nDaily quota exhausted after ${done} upload(s). Re-run tomorrow to continue.`);
      break;
    }
    console.error(`  ${label}: ${e.message}`);
    console.error("  stopping so you can inspect. Already-uploaded rows are saved.");
    break;
  }
}

console.log(
  `\n${DRY ? "dry run complete" : `uploaded ${done} video(s)`} · remaining flash: ${videos.filter((v) => v.provider === "flash").length}`
);
if (!DRY && done) console.log("db/data/videos.json updated. Rebuild + commit when ready.");
