/**
 * Dev-only write API for the local admin tool.
 *
 * Registered as Connect middleware on `/admin/api` by integrations/admin.mjs,
 * which only happens inside `astro dev` — this file is never bundled into the
 * static production build. It reads/writes the same source-of-truth files the
 * site is built from:
 *   - db/data/videos.json          (PUT /admin/api/video/:id)
 *   - db/data/albums.json          (PUT /admin/api/album/:id)
 *   - src/data/video-notes.ts      (PUT /admin/api/notes)
 *
 * Writes match the byte format the other scripts use (1-space indent + trailing
 * newline for JSON) so git diffs stay minimal. After a successful write the
 * dev server is restarted so the in-memory libSQL singleton in src/lib/db.ts
 * re-seeds and the admin pages reflect the new data.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

// The source-of-truth files the admin edits — the only paths "Publish" commits.
const DATA_FILES = [
  "db/data/series.json",
  "db/data/artists.json",
  "db/data/videos.json",
  "db/data/albums.json",
  "src/data/video-notes.ts",
];

// Fields a video row may have edited through the admin. Anything else in the
// request body is ignored, so the archive can't be corrupted with junk keys.
const VIDEO_FIELDS = [
  "title",
  "slug",
  "artist_id",
  "series_id",
  "description",
  "recorded_at",
  "location",
  "provider",
  "provider_id",
  "featured",
  "publish",
];
const PROVIDERS = new Set(["youtube", "vimeo", "dailymotion", "flash"]);

// Album fields editable through the admin. Identity columns (slug, artist_slug)
// are intentionally omitted — they key the URL and cover art, so they stay put.
const ALBUM_FIELDS = [
  "title",
  "members",
  "description",
  "songlink_url",
  "purchase_url",
  "publish",
];
const NULLABLE_ALBUM_FIELDS = new Set([
  "members",
  "description",
  "songlink_url",
  "purchase_url",
]);

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

/**
 * Build the Connect middleware. `root` is the project root URL from the Astro
 * config; `server` is the Vite dev server (for restart-after-write).
 */
export function makeApiHandler(root, server) {
  const rootDir = fileURLToPath(root);
  const videosPath = fileURLToPath(new URL("db/data/videos.json", root));
  const albumsPath = fileURLToPath(new URL("db/data/albums.json", root));
  const notesPath = fileURLToPath(new URL("src/data/video-notes.ts", root));

  return async function adminApi(req, res, next) {
    // Connect strips the `/admin/api` mount prefix from req.url, but fall back
    // to originalUrl just in case. Normalize to a path under the mount.
    const raw = req.originalUrl || req.url || "";
    const path = raw.replace(/^\/admin\/api/, "").split("?")[0].replace(/\/$/, "");

    try {
      if (req.method === "PUT" && /^\/video\/\d+$/.test(path)) {
        return await putVideo(req, res, videosPath, server, Number(path.split("/")[2]));
      }
      if (req.method === "PUT" && /^\/album\/\d+$/.test(path)) {
        return await putAlbum(req, res, albumsPath, server, Number(path.split("/")[2]));
      }
      if (req.method === "PUT" && path === "/notes") {
        return await putNotes(req, res, notesPath, server);
      }
      if (req.method === "GET" && path === "/publish") {
        return await publishStatus(res, rootDir);
      }
      if (req.method === "POST" && path === "/publish") {
        return await publish(req, res, rootDir);
      }
    } catch (err) {
      return json(res, 400, { ok: false, error: String(err?.message ?? err) });
    }

    // Not an admin-api route we handle — hand back to Astro/Vite.
    return next();
  };
}

async function putVideo(req, res, videosPath, server, id) {
  const patch = await readBody(req);
  const videos = JSON.parse(readFileSync(videosPath, "utf8"));
  const row = videos.find((v) => v.id === id);
  if (!row) return json(res, 404, { ok: false, error: `no video id ${id}` });

  for (const key of VIDEO_FIELDS) {
    if (!(key in patch)) continue;
    let val = patch[key];

    if (key === "featured" || key === "publish") {
      row[key] = val ? 1 : 0;
    } else if (key === "artist_id" || key === "series_id") {
      const n = Number(val);
      if (!Number.isInteger(n)) return json(res, 400, { ok: false, error: `${key} must be an integer` });
      row[key] = n;
    } else if (key === "provider") {
      if (!PROVIDERS.has(val)) return json(res, 400, { ok: false, error: `bad provider ${val}` });
      row[key] = val;
    } else if (key === "location") {
      // Nullable column: omit the key when empty, matching the imported rows.
      val = String(val ?? "").trim();
      if (val) row.location = val;
      else delete row.location;
    } else {
      row[key] = typeof val === "string" ? val : String(val ?? "");
    }
  }

  // Only one featured video at a time: featuring this one un-features the rest.
  if (row.featured === 1) {
    for (const v of videos) if (v !== row && v.featured) v.featured = 0;
  }

  writeFileSync(videosPath, JSON.stringify(videos, null, 1) + "\n");
  json(res, 200, { ok: true, id });
  void server.restart();
}

async function putAlbum(req, res, albumsPath, server, id) {
  const patch = await readBody(req);
  const albums = JSON.parse(readFileSync(albumsPath, "utf8"));
  const row = albums.find((a) => a.id === id);
  if (!row) return json(res, 404, { ok: false, error: `no album id ${id}` });

  for (const key of ALBUM_FIELDS) {
    if (!(key in patch)) continue;
    if (key === "publish") {
      row.publish = patch.publish ? 1 : 0;
    } else if (NULLABLE_ALBUM_FIELDS.has(key)) {
      const val = String(patch[key] ?? "").trim();
      row[key] = val || null; // keep the key (matches importer), null when empty
    } else {
      row[key] = String(patch[key] ?? "");
    }
  }

  writeFileSync(albumsPath, JSON.stringify(albums, null, 1) + "\n");
  json(res, 200, { ok: true, id });
  void server.restart();
}

// Verbatim header for src/data/video-notes.ts — kept here so the file is
// regenerated deterministically (and stays prettier-clean) on every save.
const NOTES_HEADER = `// Editorial timeline notes, keyed by video slug. The note renders pinned
// above its video on /years — use it to mark a milestone or introduce the
// recording that follows it. Curator commentary, not archive data, so it
// lives here rather than in the DB. Slugs are globally unique; a key with
// no matching video simply renders nothing.
`;

async function putNotes(req, res, notesPath, server) {
  const body = await readBody(req);
  const record = body && typeof body === "object" ? body.notes ?? body : {};
  if (typeof record !== "object" || Array.isArray(record)) {
    return json(res, 400, { ok: false, error: "notes must be an object of slug -> string" });
  }

  // Normalize: trim keys, drop empty slugs/values, coerce values to strings.
  const clean = {};
  for (const [slug, note] of Object.entries(record)) {
    const k = String(slug).trim();
    const v = String(note ?? "").trim();
    if (k && v) clean[k] = v;
  }

  const out =
    NOTES_HEADER +
    "export const videoNotes: Record<string, string> = " +
    JSON.stringify(clean, null, 2) +
    ";\n";
  writeFileSync(notesPath, out);
  json(res, 200, { ok: true, count: Object.keys(clean).length });
  void server.restart();
}

// ---- Publish: commit the data files and push to main -----------------------
//
// Guarded to the `main` branch so it can never push unmerged feature work to
// main (a `git push origin HEAD:main` from a feature branch would drag every
// ancestor commit with it). Run the admin on `main` to publish.

const git = (rootDir, args) => exec("git", args, { cwd: rootDir });

async function currentBranch(rootDir) {
  const { stdout } = await git(rootDir, ["rev-parse", "--abbrev-ref", "HEAD"]);
  return stdout.trim();
}

// GET — how many data files are dirty + which branch, so the UI can label the
// button ("Publish 3 changes") and warn when off main.
async function publishStatus(res, rootDir) {
  try {
    const branch = await currentBranch(rootDir);
    const { stdout } = await git(rootDir, ["status", "--porcelain", "--", ...DATA_FILES]);
    const changed = stdout.split("\n").filter((l) => l.trim()).length;
    json(res, 200, { ok: true, branch, changed, onMain: branch === "main" });
  } catch (e) {
    json(res, 200, { ok: false, error: String(e?.stderr || e?.message || e) });
  }
}

async function publish(req, res, rootDir) {
  const { message } = await readBody(req);
  const msg = String(message ?? "").trim() || "admin: update content";

  const branch = await currentBranch(rootDir);
  if (branch !== "main") {
    return json(res, 409, {
      ok: false,
      error: `On branch "${branch}". Switch to main to publish (refusing to push unmerged work to main).`,
    });
  }

  const { stdout: status } = await git(rootDir, ["status", "--porcelain", "--", ...DATA_FILES]);
  if (!status.trim()) return json(res, 200, { ok: true, nothing: true });

  // Pathspec-scoped commit: only the data files, regardless of anything else in
  // the working tree or index.
  await git(rootDir, ["commit", "-m", msg, "--", ...DATA_FILES]);
  const { stdout: push } = await git(rootDir, ["push", "origin", "main"]);
  json(res, 200, { ok: true, committed: true, push: push.trim() });
}
