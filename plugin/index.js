import { createMiddleware } from "@hattip/adapter-node/native-fetch";
import { compose } from "@hattip/compose";
import { join } from "node:path";
import * as fs from "node:fs";
import sirv from "sirv";
import { pathToFileURL } from "node:url";
import * as vite from "vite";
/**
 * @param {string} dir
 * @returns {Handler}
 */
const mutable = (dir) =>
  fs.existsSync(dir) ? sirv(dir) : (_req, _res, next) => next();

/**
 * @param {{ entry?: string; handler?: import('@hattip/compose').RequestHandler }} options
 * @returns {import('vite').Plugin}
 */
export function winter(options = {}) {
  let vite_config;
  /** @type {import('vite').Plugin} */
  return {
    name: "winter-server",
    config: () => {
      return {
        build: {
          rollupOptions: {
            input: {
              index: "index.html",
              other: "other.html",
            },
          },
          outDir: "dist/public",
        },
      };
    },
    configResolved(c) {
      vite_config = c;
    },
    writeBundle: {
      sequential: true,
      async handler(_options, bundle) {
        if (vite_config.build.ssr) {
          return;
        }

        const bund = await vite.build({
          build: {
            outDir: "dist",
            ssr: true,
            rollupOptions: {
              input: "./server.js",
            },
            emptyOutDir: false,
          },
          configFile: false,
        });
        // const options = {
        //   cwd,
        //   config: svelte_config,
        //   vite_config,
        //   vite_config_env,
        //   build_dir: paths.build_dir, // TODO just pass `paths`
        //   manifest_data,
        //   output_dir: paths.output_dir,
        //   service_worker_entry_file: resolve_entry(
        //     svelte_config.kit.files.serviceWorker
        //   ),
        // };

        // const client = client_build_info(assets, chunks);
        // const server = await build_server(options, client);

        /** @type {import('types').BuildData} */
        // build_data = {
        //   app_dir: svelte_config.kit.appDir,
        //   manifest_data,
        //   service_worker: options.service_worker_entry_file
        //     ? "service-worker.js"
        //     : null, // TODO make file configurable?
        //   client,
        //   server,
        // };

        // const manifest_path = `${paths.output_dir}/server/manifest.js`;
        // fs.writeFileSync(
        //   manifest_path,
        //   `export const manifest = ${generate_manifest({
        //     build_data,
        //     relative_path: ".",
        //     routes: manifest_data.routes,
        //   })};\n`
        // );

        // completed_build = true;
      },
    },
    configurePreviewServer(vite) {
      return () => {
        console.log(vite_config.root);
        removeHTMLMiddlewares(vite.middlewares);

        let handler = options.handler
          ? options.handler
          : vite_config.winter?.handler
          ? vite_config.winter.handler
          : async (ctx) => {
              const handler = await import(
                pathToFileURL(join(vite_config.root, "dist", "server.js")).href
              );
              if (!handler.default) {
                throw new Error("No handler exported");
              }
              return await handler.default(ctx);
            };
        let adapter = options.adapter ?? vite_config.winter?.adapter;

        if (adapter && adapter.preview) {
          let viteHandler = createViteHandler(vite, handler);
          let adapterDevHandler = adapter.preview(vite, viteHandler);
          vite.middlewares.use(adapterDevHandler);
        }
      };
    },
    configureServer(devServer) {
      return () => {
        removeHTMLMiddlewares(devServer.middlewares);

        let handler = options.handler
          ? options.handler
          : vite_config.winter?.handler
          ? vite_config.winter.handler
          : async (ctx) => {
              const handler = await devServer.ssrLoadModule(
                join(
                  vite_config.root,
                  options.entry ?? vite_config.winter.entry
                )
              );
              if (!handler.default) {
                throw new Error("No handler exported");
              }
              return await handler.default(ctx);
            };
        let adapter = options.adapter ?? vite_config.winter?.adapter;

        if (adapter && adapter.dev) {
          let viteHandler = createViteHandler(devServer, handler);
          let adapterDevHandler = adapter.dev(devServer, viteHandler);
          devServer.middlewares.use(adapterDevHandler);
        } else
          devServer.middlewares.use(createViteMiddleware(devServer, handler));
      };
    },
  };
}

export default winter;

/**
 *
 * @param {import('vite').ViteDevServer} vite
 * @param {import('@hattip/compose').RequestContext} handler
 */
export function createViteMiddleware(vite, handler) {
  return createMiddleware(createViteHandler(vite, handler));
}

/** @param {import('rollup').OutputBundle} bundle */
function collect_output(bundle) {
  /** @type {import('rollup').OutputChunk[]} */
  const chunks = [];
  /** @type {import('rollup').OutputAsset[]} */
  const assets = [];
  for (const value of Object.values(bundle)) {
    // collect asset and output chunks
    if (value.type === "asset") {
      assets.push(value);
    } else {
      chunks.push(value);
    }
  }
  return { assets, chunks };
}

/**
 *
 * @param {import('vite').ViteDevServer} vite
 * @param {import('@hattip/compose').RequestContext} handler
 * @returns {import('@hattip/core').HattipHandler}
 */
export function createViteHandler(devServer, handler, { clientOut } = {}) {
  /** @type {import('@hattip/compose').RequestHandler} */
  let viteHandler = async (ctx) => {
    ctx.vite = devServer;
    ctx.handleError = (error) => {
      devServer.ssrFixStacktrace(error);
      return new Response(
        `
            <!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="UTF-8" />
                <title>Error</title>
                <script type="module">
                  import { ErrorOverlay } from '/@vite/client'
                  document.body.appendChild(new ErrorOverlay(${JSON.stringify({
                    message: error.message,
                    stack: error.stack,
                  }).replace(/</g, "\\u003c")}))
                </script>
              </head>
              <body>
              </body>
            </html>
          `,
        { status: 500, headers: { "Content-Type": "text/html" } }
      );
    };

    console.log(ctx.request.url);
    debugger;
    if (ctx.request.url.endsWith(".html")) {
      let html = await devServer.transformIndexHtml(
        ctx.request.url,
        fs.readFileSync(new URL(ctx.request.url).pathname.slice(1)).toString()
      );
      return new Response(html, {
        headers: {
          "Content-Type": "text/html",
        },
      });
    }

    const response = await ctx.next();

    if (!response) {
      throw new Error("No response");
    }

    return response;
  };

  return compose(viteHandler, handler);
}

/**
 * @param {import('vite').ViteDevServer['middlewares']} server
 */
function removeHTMLMiddlewares(server) {
  const html_middlewares = [
    "viteIndexHtmlMiddleware",
    "vite404Middleware",
    "viteSpaFallbackMiddleware",
  ];
  for (let i = server.stack.length - 1; i > 0; i--) {
    // @ts-ignore
    if (html_middlewares.includes(server.stack[i].handle.name)) {
      server.stack.splice(i, 1);
    }
  }
}
