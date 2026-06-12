import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { series, artist, video, song, tag, videoTag, album } from "./schema";
import seriesData from "../../db/data/series.json";
import artistsData from "../../db/data/artists.json";
import videosData from "../../db/data/videos.json";
import albumsData from "../../db/data/albums.json";

// Build-time, in-memory data layer (replaces the deprecated astro:db).
// A single libSQL `:memory:` database is created, schema'd and seeded once per
// process from the production archive in db/data/*.json. ESM module caching
// means every page that imports this shares the one seeded connection.
//
// To change content, edit db/data/*.json (or re-run scripts/import-legacy.mjs),
// not this file. The song/tag/videoTag tables are intentionally empty.

const client = createClient({ url: ":memory:" });

// Schema DDL — mirrors src/lib/schema.ts. recorded_at is stored as a unix
// timestamp (integer) so Drizzle's `timestamp` mode round-trips it as a Date,
// matching the old astro:db `column.date()` behavior.
await client.executeMultiple(`
  CREATE TABLE series (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    color TEXT NOT NULL,
    sort INTEGER NOT NULL DEFAULT 0,
    publish INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE artist (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    hometown TEXT,
    website TEXT
  );
  CREATE TABLE video (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    artist_id INTEGER NOT NULL REFERENCES artist(id),
    series_id INTEGER NOT NULL REFERENCES series(id),
    description TEXT,
    recorded_at INTEGER NOT NULL,
    location TEXT,
    provider TEXT NOT NULL DEFAULT 'youtube',
    provider_id TEXT NOT NULL,
    featured INTEGER NOT NULL DEFAULT 0,
    publish INTEGER NOT NULL DEFAULT 1,
    views INTEGER NOT NULL DEFAULT 0,
    likes INTEGER NOT NULL DEFAULT 0,
    comments INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE song (
    id INTEGER PRIMARY KEY,
    video_id INTEGER NOT NULL REFERENCES video(id),
    title TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE tag (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE
  );
  CREATE TABLE videoTag (
    id INTEGER PRIMARY KEY,
    video_id INTEGER NOT NULL REFERENCES video(id),
    tag_id INTEGER NOT NULL REFERENCES tag(id)
  );
  CREATE TABLE album (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    artist_name TEXT NOT NULL,
    artist_slug TEXT NOT NULL,
    description TEXT,
    members TEXT,
    tracklist TEXT,
    released_at INTEGER NOT NULL,
    downloads INTEGER NOT NULL DEFAULT 0,
    donation_amount TEXT,
    songlink_url TEXT,
    purchase_url TEXT,
    publish INTEGER NOT NULL DEFAULT 1
  );
`);

export const db = drizzle(client, {
  schema: { series, artist, video, song, tag, videoTag },
});

// Seed the archive. db/data/*.json is the source of truth.
await db.insert(series).values(seriesData);
await db.insert(artist).values(artistsData);

// libSQL caps SQL variables per statement; insert videos in chunks.
const videoRows = videosData.map((v) => ({
  ...v,
  recorded_at: new Date(v.recorded_at),
}));
const CHUNK = 50;
for (let i = 0; i < videoRows.length; i += CHUNK) {
  await db.insert(video).values(videoRows.slice(i, i + CHUNK));
}

// Albums: tracklist is stored as a JSON string column; dates round-trip as
// Date like the video table. Empty data file (no import run yet) is fine.
const albumRows = albumsData.map((a) => ({
  ...a,
  tracklist: JSON.stringify(a.tracklist ?? []),
  released_at: new Date(a.released_at),
}));
for (let i = 0; i < albumRows.length; i += CHUNK) {
  await db.insert(album).values(albumRows.slice(i, i + CHUNK));
}

// Re-export the schema tables and the operators used across the pages, so call
// sites import everything from "../lib/db" exactly as they did from "astro:db".
export { series, artist, video, song, tag, videoTag, album };
export { eq, asc } from "drizzle-orm";
