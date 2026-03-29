import type { APIRoute } from "astro";
import { db, post, category, eq } from "astro:db";

export const GET: APIRoute = async () => {
  const posts = await db
    .select()
    .from(post)
    .innerJoin(category, eq(post.category_id, category.id))
    .where(eq(post.publish, 1));

  return Response.json(posts);
};
