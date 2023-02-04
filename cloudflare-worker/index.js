export { createViteMiniflareMiddleware } from "./miniflare.js";
export { default as bundle } from "@hattip/bundler-cloudflare-workers";

import { rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createViteMiniflareMiddleware } from "./miniflare.js";
import bundle from "@hattip/bundler-cloudflare-workers";

export default function cloudflareWorker() {
  return {
    name: "cloudflare-worker",
    dev: (vite, handler) => createViteMiniflareMiddleware(vite, handler, {}),
    preview: (vite, handler) =>
      createViteMiniflareMiddleware(vite, handler, {}),
    adapt: async (config) => {
      await mkdir(join(config.root, "worker"), { recursive: true });
      await bundle({
        output: join(config.root, "worker", "index.js"),
        cfwEntry: join(
          fileURLToPath(new URL(import.meta.url)),
          "..",
          "entry.js"
        ),
      });
      await rm(join(config.root, config.build.outDir, "server.js"));
    },
  };
}
