/**
 * iymi-admin — a LOCAL, DEV-ONLY admin + dashboard for the archive.
 *
 * The production site is 100% static (see CLAUDE.md hard constraints): no
 * adapter, no server. This integration adds an editing UI and a dashboard that
 * exist ONLY while `astro dev` is running and are PROVABLY absent from the
 * static `dist/` build. Three independent safeguards make that true:
 *
 *   1. COMMAND GATE — `astro:config:setup` returns early unless command==='dev'.
 *      On `astro build` nothing is injected, so no admin route enters the
 *      manifest and nothing is emitted to dist/.
 *   2. prerender:false — every injected admin route is on-demand. With no
 *      adapter, a stray one at build time makes `astro build` FAIL LOUDLY
 *      rather than silently ship admin HTML. Fail-safe, not fail-open.
 *   3. SOURCE OUTSIDE src/pages/ — admin pages live in src/admin/, which Astro
 *      never auto-routes. They only become routes via the dev-only injectRoute.
 *
 * DO NOT remove the `command !== "dev"` gate or the `prerender: false` flags,
 * and DO NOT move src/admin/* into src/pages/. Any of those would risk leaking
 * the admin into production. The write API lives in ./admin-api.mjs.
 */
import { makeApiHandler } from "./admin-api.mjs";

export default function admin() {
  let root;
  return {
    name: "iymi-admin",
    hooks: {
      "astro:config:setup": ({ command, config, injectRoute, logger }) => {
        if (command !== "dev") return; // SAFEGUARD 1 — never inject at build
        root = config.root;
        logger.warn("admin enabled (dev only) — never deploy a dev build");
        const page = (pattern, entrypoint) =>
          injectRoute({ pattern, entrypoint, prerender: false }); // SAFEGUARD 2
        page("/admin", "./src/admin/index.astro");
        page("/admin/videos", "./src/admin/videos.astro");
        page("/admin/videos/[id]", "./src/admin/edit.astro");
        page("/admin/albums", "./src/admin/albums.astro");
        page("/admin/albums/[id]", "./src/admin/album-edit.astro");
        page("/admin/notes", "./src/admin/notes.astro");
        page("/admin/dashboard", "./src/admin/dashboard.astro");
      },
      "astro:server:setup": ({ server }) => {
        // Dev-server middleware only — no file representation in any build.
        server.middlewares.use("/admin/api", makeApiHandler(root, server));
      },
    },
  };
}
