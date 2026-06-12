import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

// Drizzle schema mirroring the former astro:db schema in db/config.ts.
// Column names, defaults, nullability and references are kept identical so the
// query code in src/pages/** and src/layouts/Layout.astro is unchanged.

export const series = sqliteTable("series", {
  id: integer("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  color: text("color").notNull(), // hex accent
  sort: integer("sort").notNull().default(0),
  publish: integer("publish").notNull().default(1),
});

export const artist = sqliteTable("artist", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  hometown: text("hometown"),
  website: text("website"),
});

export const video = sqliteTable("video", {
  id: integer("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  artist_id: integer("artist_id")
    .notNull()
    .references(() => artist.id),
  series_id: integer("series_id")
    .notNull()
    .references(() => series.id),
  description: text("description"),
  recorded_at: integer("recorded_at", { mode: "timestamp" }).notNull(),
  location: text("location"),
  provider: text("provider").notNull().default("youtube"), // "youtube" | "vimeo" | "dailymotion" | "flash"
  provider_id: text("provider_id").notNull(),
  featured: integer("featured").notNull().default(0),
  publish: integer("publish").notNull().default(1),
  views: integer("views").notNull().default(0),
  likes: integer("likes").notNull().default(0),
  comments: integer("comments").notNull().default(0),
});

export const song = sqliteTable("song", {
  id: integer("id").primaryKey(),
  video_id: integer("video_id")
    .notNull()
    .references(() => video.id),
  title: text("title").notNull(),
  position: integer("position").notNull().default(1),
});

export const tag = sqliteTable("tag", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});

export const videoTag = sqliteTable("videoTag", {
  id: integer("id").primaryKey(),
  video_id: integer("video_id")
    .notNull()
    .references(() => video.id),
  tag_id: integer("tag_id")
    .notNull()
    .references(() => tag.id),
});

// Free/donation album-download archive from the legacy site. No FK to artist:
// some "artists" are labels or compilations that have no video; pages resolve
// `artist_slug` against the artist table at build time to cross-link when a
// match exists. `tracklist` is a JSON array of track-title strings.
// `songlink_url` is a single song.link / album.link (Odesli) smart link that
// fans out to every stream/buy destination — not in the legacy dump, filled in
// via the local admin. `purchase_url` is the legacy "where to buy" fallback.
export const album = sqliteTable("album", {
  id: integer("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  artist_name: text("artist_name").notNull(),
  artist_slug: text("artist_slug").notNull(),
  description: text("description"),
  members: text("members"),
  tracklist: text("tracklist"), // JSON: string[]
  released_at: integer("released_at", { mode: "timestamp" }).notNull(),
  downloads: integer("downloads").notNull().default(0),
  donation_amount: text("donation_amount"),
  songlink_url: text("songlink_url"),
  purchase_url: text("purchase_url"),
  publish: integer("publish").notNull().default(1),
});
