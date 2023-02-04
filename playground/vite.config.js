import { winter } from "@winterkit/vite";
import cloudflareWorker from "@winterkit/cloudflare-worker";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    winter({
      entry: "./server.js",
      adapter: cloudflareWorker(),
    }),
  ],
});
