// @ts-check
import { defineConfig } from "astro/config";
import admin from "./integrations/admin.mjs";

// https://astro.build/config
export default defineConfig({
  site: "https://www.ifyoumakeit.com",
  // Permanent redirects from legacy ifyoumakeit.com URL shapes to the current
  // structure, so old bookmarks and inbound SEO links don't 404. The old site
  // used singular /album/, /author/ for artists, and /category/ for sections.
  // (/video/{artist}/{slug}/ already matches the current route, so it's omitted.)
  // In this static build these emit redirect pages (meta-refresh + canonical);
  // a host adapter would turn them into true 301 responses.
  redirects: {
    "/album/[artist]/[slug]": "/albums/[artist]/[slug]",
    "/author/[slug]": "/artists/[slug]",
    "/category/albums": "/albums/",
    "/category/sessions": "/sessions/",
    "/category/live": "/live/",
    "/category/series": "/series/",
  },
  // Local-only admin/dashboard. Self-disables unless `astro dev` (command ===
  // "dev"); ships ZERO code to the static prod build. See integrations/admin.mjs.
  integrations: [admin()],
});
