/// <reference path="../.astro/db-types.d.ts" />
/// <reference types="astro/client" />

// @fontsource* packages ship CSS-only entrypoints (no type declarations).
// Declare them so TypeScript 6 allows the side-effect imports in Layout.astro.
declare module "@fontsource-variable/archivo";
declare module "@fontsource/archivo-black";
declare module "@fontsource/space-mono";
