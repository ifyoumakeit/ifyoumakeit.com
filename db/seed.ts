import { category, db, post, postmeta } from "astro:db";

// https://astro.build/db/seed
export default async function seed() {
  await db.insert(category).values([
    { id: 1, title: "Making", slug: "making", publish: 1 },
    { id: 2, title: "Writing", slug: "writing", publish: 1 },
    { id: 3, title: "Code", slug: "code", publish: 1 },
  ]);

  await db.insert(post).values([
    {
      id: 1,
      body: "First post on the new site.",
      category_id: 1,
      publish: 1,
      date: new Date("2024-01-01"),
      title: "Hello World",
      title_slug: "hello-world",
      subtitle: "Getting started.",
      subtitle_slug: "getting-started",
      comment_count: 0,
      view: 0,
      link: "",
      user: 1,
      bgcolor: "#ffffff",
      excerpt: "First post on the new site.",
    },
  ]);

  await db.insert(postmeta).values([
    { id: 1, name: "featured", value: "true", post_id: 1 },
  ]);
}
