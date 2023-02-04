/**
 * @param {{ entry?: string; handler?: import('@hattip/compose').RequestHandler }} options
 * @returns {import('vite').Plugin}
 */
export function winter(options?: {
  entry?: string;
  adapter?: {
    name: string;
    dev?(
      vite: import("vite").ViteDevServer,
      handler: import("@hattip/compose").RequestHandler
    );
    preview?(
      vite: import("vite").ViteDevServer,
      handler: import("@hattip/compose").RequestHandler
    );
    adapt?(vite: import("vite").ResolvedConfig);
  };
  handler?: import("@hattip/compose").RequestHandler;
}): import("vite").Plugin;
/**
 *
 * @param {import('vite').ViteDevServer} vite
 * @param {import('@hattip/compose').RequestContext} handler
 */
export function createViteMiddleware(
  vite: import("vite").ViteDevServer,
  handler: import("@hattip/compose").RequestContext
): import("@hattip/adapter-node/common-3eeb2b59").b;
/**
 *
 * @param {import('vite').ViteDevServer} vite
 * @param {import('@hattip/compose').RequestContext} handler
 */
export function createViteHandler(
  vite: import("vite").ViteDevServer,
  handler: import("@hattip/compose").RequestContext
): import("@hattip/core").HattipHandler;
export default winter;
