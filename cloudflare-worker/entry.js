import cloudflareWorkersAdapter from "@hattip/adapter-cloudflare-workers";
import handler from "./dist/server.js";

export default {
  fetch: cloudflareWorkersAdapter(handler),
};
