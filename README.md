# If You Make It

[ifyoumakeit.com](https://ifyoumakeit.com) — a DIY punk video archive. Pink Couch
Sessions, Live and Direct recordings, and full shows, mostly hosted on YouTube.

Built with [Astro 5](https://astro.build) + [Astro DB](https://docs.astro.build/en/guides/astro-db/).
The whole site is statically generated at build time — no server, no client-side
framework. The only JavaScript shipped to the browser is a tiny click-to-play
shim for the video embeds (no YouTube iframe loads until you hit play).

## Commands

| Command           | Action                                       |
| ----------------- | -------------------------------------------- |
| `npm install`     | Install dependencies                         |
| `npm run dev`     | Dev server at `localhost:4321`               |
| `npm run build`   | Type-check + static build to `./dist/`       |
| `npm run preview` | Preview the production build locally         |

## Data model

Defined in `db/config.ts`:

- **series** — Sessions, Live, Series, Music Videos. Each has an accent color
  that themes its pages and cards.
- **artist** — bands/performers, with hometown and website.
- **video** — the core table. Links an artist + series, holds the recorded
  date, location, lifetime view count, and the embed source (`provider`:
  `youtube` | `vimeo` | `dailymotion` | `flash`, plus `provider_id`).
- **song** — setlist entries per video (empty for imported data: the video
  title is the song title).
- **tag** / **videoTag** — content/vibe tags for the "Similar vibes"
  related-video sections (empty for imported data; sections hide themselves).

### The data

`db/data/*.json` is the **real archive** — 441 videos by 249 artists
(2007–2014), imported from the legacy production database with
`node scripts/import-legacy.mjs path/to/iymi_db.sql`. `db/seed.ts` just loads
those files. The raw SQL dump is not committed (it contains user emails in
unrelated tables); re-run the importer against the dump to regenerate.

## How videos are cross-linked

Every video page computes three related sections at build time: more from the
same artist, videos recorded around the same time (any artist), and videos
sharing tags. Plus prev/next within the series, artist pages, per-year timeline
pages, and tag pages. `/api/videos.json` is a prerendered index of the whole
archive (future client-side search).
