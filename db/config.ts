import { defineDb, defineTable, column } from "astro:db";

const category = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    title: column.text(),
    slug: column.text(),
    publish: column.number(),
  },
});

const post = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    body: column.text(),
    category_id: column.number({ references: () => category.columns.id }),
    publish: column.number(),
    date: column.date(),
    title: column.text(),
    title_slug: column.text(),
    subtitle: column.text(),
    subtitle_slug: column.text(),
    comment_count: column.number(),
    view: column.number(),
    link: column.text(),
    user: column.number(),
    bgcolor: column.text(),
    excerpt: column.text(),
  },
});

const postmeta = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    name: column.text(),
    value: column.text(),
    post_id: column.number({ references: () => post.columns.id }),
  },
});

// https://astro.build/db/config
export default defineDb({
  tables: { category, post, postmeta },
});
