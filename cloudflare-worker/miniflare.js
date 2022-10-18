/*!
 * Original code by MrBBot
 * MIT Licensedm Copyright (c) 2021 MrBBot, see LICENSE.miniflare.md for details
 */

import { createRequestListener } from "@miniflare/http-server";
import { coupleWebSocket } from "@miniflare/web-sockets";
import { Miniflare } from "miniflare";
import assert from "node:assert";
import http from "node:http";
import net from "node:net";
import { URL } from "url";
import ws from "ws";

async function writeResponse(response, res) {
  var e_1, _a;
  const headers = {};
  // eslint-disable-next-line prefer-const
  for (let [key, value] of response.headers) {
    key = key.toLowerCase();
    if (key === "set-cookie") {
      // Multiple Set-Cookie headers should be treated as separate headers
      // importing @miniflare/core
      headers["set-cookie"] = response.headers.getAll("set-cookie");
    } else {
      headers[key] = value;
    }
  }
  // Use body's actual length instead of the Content-Length header if set,
  // see https://github.com/cloudflare/miniflare/issues/148. We also might
  // need to adjust this later for live reloading so hold onto it.
  const contentLengthHeader = response.headers.get("Content-Length");
  const contentLength =
    contentLengthHeader === null ? null : parseInt(contentLengthHeader);
  if (contentLength !== null) headers["content-length"] = contentLength;
  res.writeHead(response.status, headers);
  // `initialStream` is the stream we'll write the response to. It
  // should end up as the first encoder, piping to the next encoder,
  // and finally piping to the response:
  //
  // encoders[0] (initialStream) -> encoders[1] -> res
  //
  // Not using `pipeline(passThrough, ...encoders, res)` here as that
  // gives a premature close error with server sent events. This also
  // avoids creating an extra stream even when we're not encoding.
  let initialStream = res;
  // Response body may be null if empty
  if (response.body) {
    try {
      for (
        var _b = __asyncValues(response.body), _c;
        (_c = await _b.next()), !_c.done;

      ) {
        const chunk = _c.value;
        if (chunk) initialStream.write(chunk);
      }
    } catch (e_1_1) {
      e_1 = { error: e_1_1 };
    } finally {
      try {
        if (_c && !_c.done && (_a = _b.return)) await _a.call(_b);
      } finally {
        if (e_1) throw e_1.error;
      }
    }
  }
  initialStream.end();
}

export const DEFAULT_PORT = 8787;

const restrictedWebSocketUpgradeHeaders = [
  "upgrade",
  "connection",
  "sec-websocket-accept",
];

/**
 *
 * @param {import('node:http').Server} httpServer
 * @param {import('node:http').RequestListener} listener
 */
function attachWebsocketServer(httpServer, listener) {
  const { WebSocketServer } = ws;
  // Setup WebSocket servers
  const webSocketServer = new WebSocketServer({ noServer: true });
  // Add custom headers included in response to WebSocket upgrade requests
  const extraHeaders = new WeakMap();
  webSocketServer.on("headers", (headers, req) => {
    const extra = extraHeaders.get(req);
    extraHeaders.delete(req);
    if (extra) {
      for (const [key, value] of extra) {
        if (!restrictedWebSocketUpgradeHeaders.includes(key.toLowerCase())) {
          headers.push(`${key}: ${value}`);
        }
      }
    }
  });

  httpServer.on("upgrade", async (request, socket, head) => {
    var _a;
    // Only interested in pathname so base URL doesn't matter
    const { pathname } = new URL(request.url, "http://localhost");
    if (
      pathname === "/cdn-cgi/mf/reload" ||
      request.headers["sec-websocket-protocol"] === "vite-hmr"
    ) {
      // If this is the for live-reload, handle the request ourselves
      return;
    } else {
      // Otherwise, handle the request in the worker
      const response = await listener(request);
      // Check web socket response was returned
      const webSocket = response?.webSocket;

      if (response?.status === 101 && webSocket) {
        // Accept and couple the Web Socket
        extraHeaders.set(request, response?.headers);
        webSocketServer.handleUpgrade(request, socket, head, (ws) => {
          void coupleWebSocket(ws, webSocket);
          webSocketServer.emit("connection", ws, request);
        });
        return;
      }
      // Otherwise, we'll be returning a regular HTTP response
      const res = new http.ServerResponse(request);
      // `socket` is guaranteed to be an instance of `net.Socket`:
      // https://nodejs.org/api/http.html#event-upgrade_1
      assert(socket instanceof net.Socket);
      res.assignSocket(socket);
      // If no response was provided, or it was an "ok" response, log an error
      if (!response || (200 <= response.status && response.status < 300)) {
        res.writeHead(500);
        res.end();
        console.error(
          new TypeError(
            "Web Socket request did not return status 101 Switching Protocols response with Web Socket"
          )
        );
        return;
      }
      // Otherwise, send the response as is (e.g. unauthorised),
      // always disabling live-reload as this is a WebSocket upgrade
      await writeResponse(response, res);
    }
  });
}

export function createViteMiniflareMiddleware(vite, dev, miniflareOptions) {
  const mf = new Miniflare({
    script: `
        export default {
          fetch: async (request, env) => {
            return await handleFetch(request, env, globalThis);
          }
        }

        export const WebSocketDurableObject = WebSocketDurableObject1;
      `,
    globals: {
      WebSocketDurableObject1: class DO {
        state;
        env;
        promise;
        constructor(state, env) {
          this.state = state;
          this.env = env;
          this.promise = this.createProxy(state, env);
        }

        async createProxy(state, env) {
          const { WebSocketDurableObject } = await vite.ssrLoadModule(
            "~start/entry-server"
          );
          return new WebSocketDurableObject(state, env);
        }

        async fetch(request) {
          console.log("DURABLE_OBJECT", request.url);

          try {
            let dObject = await this.promise;
            return await dObject.fetch(request);
          } catch (e) {
            console.log("error", e);
          }
        }
      },
      handleFetch: async (req, env, mfGLobal) => {
        const {
          Request,
          Response,
          fetch,
          crypto,
          Headers,
          ReadableStream,
          WritableStream,
          WebSocketPair,
          TransformStream,
        } = mfGLobal;
        Object.assign(globalThis, {
          Request,
          Response,
          fetch,
          crypto,
          Headers,
          ReadableStream,
          WritableStream,
          TransformStream,
          WebSocketPair,
        });

        console.log(
          "🔥",
          req.headers.get("Upgrade") === "websocket" ? "WEBSOCKET" : req.method,
          req.url
        );

        if (req.headers.get("Upgrade") === "websocket") {
          const url = new URL(req.url);
          console.log(url.search);
          const durableObjectId = env.DO_WEBSOCKET.idFromName(
            url.pathname + url.search
          );
          const durableObjectStub = env.DO_WEBSOCKET.get(durableObjectId);
          const response = await durableObjectStub.fetch(req);
          return response;
        }

        try {
          return await dev({ request: req, platform: { env } });
        } catch (e) {
          console.log("error", e);
          return new Response(e.toString(), { status: 500 });
        }
      },
    },
    modules: true,
    kvPersist: true,
    compatibilityFlags: ["streams_enable_constructors"],
    ...miniflareOptions,
  });

  console.log("🔥", "starting miniflare");

  const listener = createRequestListener(mf);

  // Setup Websocket server
  attachWebsocketServer(vite.httpServer, listener);

  return listener;
}
