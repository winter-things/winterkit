import { winter } from "@winterkit/vite";
import { createViteMiniflareMiddleware } from "@winterkit/cloudflare-worker";
import { defineConfig } from "vite";

/** @returns {import('vite').Plugin}  */
// function winterBuild() {
//   /** @type {import('vite').Plugin} */
//   let t = {
//     name: "winter-build",
//     build,
//   };
// }

export default defineConfig({
  plugins: [
    winter({
      entry: "./server.js",
      adapter: {
        name: "cloudflare-worker",
        dev: (vite, handler) =>
          createViteMiniflareMiddleware(vite, handler, {}),
        preview: (vite, handler) =>
          createViteMiniflareMiddleware(vite, handler, {}),
      },
    }),
  ],
});
