/**
 * Dev-only write API for the local admin tool.
 *
 * Registered as Connect middleware on `/admin/api` by integrations/admin.mjs,
 * which only happens inside `astro dev` — this file is never bundled into the
 * static production build. It reads/writes the same source-of-truth files the
 * site is built from:
 *   - db/data/videos.json          (PUT /admin/api/video/:id)
 *   - src/data/video-notes.ts      (PUT /admin/api/notes)
 *
 * Writes match the byte format the other scripts use (1-space indent + trailing
 * newline for JSON) so git diffs stay minimal. After a successful write the
 * dev server is restarted so the in-memory libSQL singleton in src/lib/db.ts
 * re-seeds and the admin pages reflect the new data.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

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
  const videosPath = fileURLToPath(new URL("db/data/videos.json", root));
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
      if (req.method === "PUT" && path === "/notes") {
        return await putNotes(req, res, notesPath, server);
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

  writeFileSync(videosPath, JSON.stringify(videos, null, 1) + "\n");
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
