import { defineDb, defineTable, column } from "astro:db";

const series = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    title: column.text(),
    slug: column.text({ unique: true }),
    description: column.text(),
    color: column.text(), // hex accent
    sort: column.number({ default: 0 }),
    publish: column.number({ default: 1 }),
  },
});

const artist = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    name: column.text(),
    slug: column.text({ unique: true }),
    hometown: column.text({ optional: true }),
    website: column.text({ optional: true }),
  },
});

const video = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    title: column.text(),
    slug: column.text(),
    artist_id: column.number({ references: () => artist.columns.id }),
    series_id: column.number({ references: () => series.columns.id }),
    description: column.text({ optional: true }),
    recorded_at: column.date(),
    location: column.text({ optional: true }),
    provider: column.text({ default: "youtube" }), // "youtube" | "vimeo" | "flash"
    provider_id: column.text(),
    featured: column.number({ default: 0 }),
    publish: column.number({ default: 1 }),
    views: column.number({ default: 0 }),
  },
});

const song = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    video_id: column.number({ references: () => video.columns.id }),
    title: column.text(),
    position: column.number({ default: 1 }),
  },
});

const tag = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    name: column.text(),
    slug: column.text({ unique: true }),
  },
});

const videoTag = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    video_id: column.number({ references: () => video.columns.id }),
    tag_id: column.number({ references: () => tag.columns.id }),
  },
});

export default defineDb({
  tables: { series, artist, video, song, tag, videoTag },
});
