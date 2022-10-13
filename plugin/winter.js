import { createMiddleware } from "@hattip/adapter-node/native-fetch";
import { compose } from "@hattip/compose";
import { join } from "node:path";

/**
 * @param {{ entry?: string; handler?: import('@hattip/compose').RequestHandler }} options
 * @returns {import('vite').Plugin}
 */
export function winter(options = {}) {
  let config;
  return {
    name: "winter-server",
    configResolved(c) {
      config = c;
    },
    configureServer(vite) {
      return () => {
        console.log(config.root);
        removeHTMLMiddlewares(vite.middlewares);
        let handler = options.handler
          ? options.handler
          : config.winter?.handler
          ? config.winter.handler
          : async (ctx) => {
              const handler = await vite.ssrLoadModule(
                join(config.root, options.entry ?? config.winter.entry)
              );
              if (!handler.default) {
                throw new Error("No handler exported");
              }
              return await handler.default(ctx);
            };
        let adapter = config.winter?.adapter;
        console.log(adapter);
        if (adapter && adapter.dev) {
          let viteHandler = createViteHandler(vite, handler);
          let adapterDevHandler = adapter.dev(vite, viteHandler);
          vite.middlewares.use(adapterDevHandler);
        } else vite.middlewares.use(createViteMiddleware(vite, handler));
      };
    },
  };
}

/**
 *
 * @param {import('vite').ViteDevServer} vite
 * @param {import('@hattip/compose').RequestContext} handler
 */
function createViteMiddleware(vite, handler) {
  return createMiddleware(createViteHandler(vite, handler));
}

/**
 *
 * @param {import('vite').ViteDevServer} vite
 * @param {import('@hattip/compose').RequestContext} handler
 */
function createViteHandler(vite, handler) {
  /** @type {import('@hattip/compose').RequestHandler} */
  let viteHandler = async (ctx) => {
    ctx.vite = vite;
    ctx.handleError = (error) => {
      vite.ssrFixStacktrace(error);
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
