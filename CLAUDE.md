# CLAUDE.md

Guidance for AI agents working on this repository.

## What this is

[ifyoumakeit.com](https://ifyoumakeit.com) — "If You Make It", a DIY punk video
archive run by Dave Garwacke. Famous for the **Pink Couch Sessions** (bands
playing acoustic on a pink couch, ~2007 onward), plus **Live and Direct**
recordings and full **Shows**. ~99% of videos are YouTube embeds, a few Vimeo,
a couple of unmigrated Flash-era files.

## Hard constraints (do not violate)

1. **Fully static.** No SSR adapter, no server. Every dynamic route MUST export
   `getStaticPaths`. API routes are prerendered JSON only.
2. **Near-zero client JS.** The only JavaScript shipped is the click-to-play
   embed shim inside `VideoEmbed.astro`. No client frameworks, no client-side
   routing, no animation libraries. Interactivity comes from HTML/CSS.
3. **No runtime third-party requests except media.** Fonts are self-hosted via
   `@fontsource` packages. YouTube thumbnails (`i.ytimg.com`) and the
   embed-on-click (`youtube-nocookie.com`) are the only external resources.
4. **No iframes in initial HTML.** YouTube embeds are facades (thumbnail + play
   button) until clicked.

## Commands

- `npm install` — install (lockfile has been out of sync with `npm ci` before;
  prefer `npm install`)
- `npm run dev` — dev server (Drizzle + in-memory libSQL, seeded at startup
  from `db/data/*.json`). Also serves the **local-only admin** at `/admin` (see
  "Local admin + dashboard" below).
- `npm run build` — `astro check && astro build` → `dist/` (this is what CI runs)
- `npx astro check` — type-check only

Always run `npm run build` before committing; it must pass with 0 errors.

- `YOUTUBE_API_KEY=… npm run update:youtube` — refresh YouTube view counts in
  `db/data/videos.json` and set `publish: 0` on any video that went
  private/deleted (or has a malformed id). Add `--` `--dry` to preview. Needs a
  YouTube Data API v3 key; ~6 API calls for the whole archive. A weekly GitHub
  Action (`.github/workflows/update-youtube.yml`) runs this and commits the
  result; it needs the `YOUTUBE_API_KEY` repo secret. The script persists
  `views`, `likes`, and `comments` (all from one `part=statistics` call).

## Local admin + dashboard (dev-only — never deployed)

`npm run dev` exposes an editing UI + analytics dashboard at `/admin` for use on
your own machine. It writes straight to the source-of-truth files
(`db/data/videos.json`, `src/data/video-notes.ts`); you then commit + push and CI
rebuilds the static site. There is **no auth** (localhost only) and **no part of
it ships to production** — `npm run build` emits zero admin code to `dist/`.

How the dev-only guarantee works (`integrations/admin.mjs` + `admin-api.mjs`):

1. The integration's `astro:config:setup` hook **returns early unless
   `command === "dev"`**, so `astro build` injects no admin routes.
2. Every injected admin route uses **`prerender: false`**; with no adapter, a
   stray one at build time makes `astro build` fail loudly rather than ship admin
   HTML — a fail-safe, not a silent leak.
3. Admin pages live in **`src/admin/`** (outside `src/pages/`), so Astro never
   auto-routes them; they only exist via the dev-only `injectRoute`.
4. Write endpoints (`/admin/api/*`) are Vite dev-server middleware, not Astro
   routes — they have no build output at all. After each write the dev server
   restarts so the in-memory libSQL singleton re-seeds.

**Do not** remove the `command !== "dev"` gate, remove `prerender: false`, or move
`src/admin/*` into `src/pages/` — each would risk leaking the admin into prod.
Verify prod stays clean with: `npm run build && grep -ri admin dist/` (expect no
matches). The admin tooling is committed to the (public) repo on purpose — it
holds no secrets and never runs in production.

## Architecture

Astro 6 + Drizzle ORM over an in-memory libSQL database. All queries run at
build time. `src/lib/db.ts` creates a `:memory:` libSQL connection, applies the
schema, and seeds it from `db/data/*.json` once per process (a shared ESM
singleton); `src/lib/schema.ts` defines the tables. Pages import `db` plus the
tables and the `eq`/`asc` operators from `src/lib/db.ts`.

### Data model (`src/lib/schema.ts`)

- `series` — the four video series: Sessions (`sessions`), Live (`live`),
  Series (`series`), Music Videos (`music-videos`). `slug` is used in URLs and
  in `data-series` attributes for accent theming. Ordered by `sort`.
- `artist` — bands. `hometown`/`website` nullable.
- `video` — core table: `artist_id`, `series_id`, `recorded_at` (Date),
  `location`, `provider` (`"youtube" | "vimeo" | "dailymotion" | "flash"`),
  `provider_id`, `featured` (0/1), `publish` (0/1), `views` (lifetime view
  count from the legacy site).
- `song` — setlist entries per video, ordered by `position`. **Empty for
  imported data** (the video title is the song title).
- `tag` / `videoTag` — content tags, powering "Similar vibes" related videos.
  **Empty for imported data**; all tag-driven UI hides itself when empty.

Always filter `publish = 1` on `series` and `video`. Convention: fetch whole
tables and join/sort in JS (datasets are small) rather than complex SQL joins.

`db/data/*.json` is the **real production archive** (441 videos, 249 artists,
2007–2014), generated by `node scripts/import-legacy.mjs path/to/iymi_db.sql`
from the legacy MySQL dump (`iymi_posts`/`iymi_postmeta`/`iymi_category`;
post_title = artist, post_subtitle = song). `src/lib/db.ts` loads the JSON.
Never commit the raw SQL dump — unrelated tables in it contain user emails.
To change content, edit the JSON or re-run the importer. The legacy dump also
contains albums (with tracklists), comics, and articles categories — not yet
imported; a potential future section.

Thumbnails: local archive images in `public/thumbs/video/{video.slug}.jpg`
take priority (indexed at build time by `src/lib/thumbs.ts` — no db column;
the slug is the reference, missing files just fall back). Fallbacks: YouTube
via `i.ytimg.com`; everything else gets a styled CSS placeholder. On video
pages the local image is also the player poster, and Flash-era videos show
it behind the archival notice.

### URL structure (stable — don't break links)

- `/{series.slug}/` — series listing
- `/{series.slug}/{video.slug}/` — video page
- `/artists/`, `/artists/{slug}/`
- `/years/`, `/years/{year}/`
- `/tags/`, `/tags/{slug}/`
- `/api/videos.json` — prerendered full-archive index (future search)

### Video pages compute related videos at build time

Same artist → recorded around the same time (date distance, any series) →
similar vibes (shared-tag count), each up to 4 cards, deduped in that order;
plus prev/next within the series by `recorded_at`. Keep this when editing
`src/pages/[series]/[slug].astro`.

## Design system

DIY zine / punk-flyer. The contract lives in `src/styles/global.css`:

- Tokens: `--color-paper` (#FAF3E7), `--color-ink` (#16121A), `--color-pink`
  (#FF4D8D), `--color-pink-deep`, `--color-blue`, `--color-yellow`,
  `--color-muted`, `--font-display` (Archivo Black), `--font-body` (Archivo
  Variable), `--font-mono` (Space Mono), `--border` (3px solid ink),
  `--shadow-hard` (hard offset, no blur), `--radius`.
- Utilities: `.container`, `.grid-videos`, `.btn`, `.tag-chip`, `.meta-line`.
- **Series accent theming**: put `data-series={series.slug}` on an element and
  `--accent` resolves per series (pink-couch-sessions → pink, live-and-direct →
  blue, shows → yellow). Use `var(--accent, var(--color-pink))` in styles.

New UI should use these tokens/utilities plus minimal page-scoped `<style>`.
Don't introduce new global CSS without good reason, and keep the aesthetic:
thick borders, hard shadows, uppercase display headings, sticker-like badges.

### Component contracts (`src/components/`)

- `Layout.astro` — `{ title: string; description?: string }`; full shell with
  header/nav/footer. Use on every page.
- `VideoCard.astro` — `{ title, href, artistName, seriesTitle, seriesSlug,
recordedAt: Date, provider, providerId }`; use inside `.grid-videos`.
- `VideoEmbed.astro` — `{ provider, providerId, title }`; the player facade.
  `flash` renders an archival notice, not a player.
- `SeriesBadge.astro` — `{ title, slug }`.
- `SectionHeading.astro` — `{ title, href?, count? }`.

Change a component's props only if you update every call site in `src/pages/`.

## Conventions

- Dates: format with `Intl.DateTimeFormat("en-US", { timeZone: "UTC", ... })`
  and compute years via UTC getters — keeps builds stable across machines.
- Slugs: kebab-case; video slugs unique within their series.
- Prettier is configured (`.prettierrc`, with `prettier-plugin-astro`).
- CI (`.github/workflows/ci.yml`) runs `npm run build` on pushes/PRs to `main`.
- Deployment is platform-side (no adapter/config in repo); output is plain
  static files in `dist/`.
