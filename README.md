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

- **series** — Pink Couch Sessions, Live and Direct, Shows. Each has an accent
  color that themes its pages and cards.
- **artist** — bands/performers, with hometown and website.
- **video** — the core table. Links an artist + series, holds the recorded
  date, location, and the embed source (`provider`: `youtube` | `vimeo` |
  `flash`, plus `provider_id`).
- **song** — setlist entries per video.
- **tag** / **videoTag** — content/vibe tags ("acoustic", "the-fest",
  "basement"…) used for the "Similar vibes" related-video sections.

### Seed vs. production data

`db/seed.ts` is a **development seed** — realistic data (including a number of
real Pink Couch Sessions YouTube IDs) so the site looks right in dev, but not
the real archive. Production data is imported from the legacy database; the
mapping is roughly `category` → `series`, `post` → `video`, `postmeta` →
provider/embed IDs.

## How videos are cross-linked

Every video page computes three related sections at build time: more from the
same artist, videos recorded around the same time (any artist), and videos
sharing tags. Plus prev/next within the series, artist pages, per-year timeline
pages, and tag pages. `/api/videos.json` is a prerendered index of the whole
archive (future client-side search).
