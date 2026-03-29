import type { APIRoute } from "astro";
import { db, category, eq } from "astro:db";

export const GET: APIRoute = async () => {
  const categories = await db
    .select()
    .from(category)
    .where(eq(category.publish, 1));

  return Response.json(categories);
};
