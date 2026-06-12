// @ts-check
import { defineConfig } from "astro/config";
import admin from "./integrations/admin.mjs";

// https://astro.build/config
export default defineConfig({
  site: "https://www.ifyoumakeit.com",
  // Local-only admin/dashboard. Self-disables unless `astro dev` (command ===
  // "dev"); ships ZERO code to the static prod build. See integrations/admin.mjs.
  integrations: [admin()],
});
