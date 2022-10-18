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
    (() => {
      let viteConfig, vite_config_env;
      let completedBuild;
      return {
        name: "winter-build",
        /** Build the SvelteKit-provided Vite config to be merged with the user's vite.config.js file.
         * @see https://vitejs.dev/guide/api-plugin.html#config
         */
        async config(config, config_env) {
          vite_config_env = config_env;
        },
        // The config is created in build_server for SSR mode and passed inline
        //  if (config.build?.ssr) return;

        /**
         * Stores the final config.
         */
        configResolved(config) {
          viteConfig = config;
        },
        buildStart() {
          // Reset for new build. Goes here because `build --watch` calls buildStart but not config
          completedBuild = false;

          if (vite_config_env.command === "build") {
            // rimraf(paths.build_dir);
            // mkdirp(paths.build_dir);
            // rimraf(paths.output_dir);
            // mkdirp(paths.output_dir);
          }
          // this.emitFile;
        },
      };
    })(),
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
