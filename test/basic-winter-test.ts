import { expect, test } from "@playwright/test";

import type { AppFixture, Fixture } from "./helpers/create-fixture.js";
import {
  createFixture,
  createViteFixture,
  js,
} from "./helpers/create-fixture.js";
import {
  PlaywrightFixture,
  prettyHtml,
  selectHtml,
} from "./helpers/playwright-fixture.js";

test.describe("basic winter", () => {
  let fixture: Fixture;
  let appFixture: AppFixture;

  test.beforeAll(async () => {
    fixture = await createFixture({
      files: {
        "server.js": js`export default (event) => {
          const response = new Response(
            '<div>Hello from /index.html</div>',
            {
              headers: {
                "content-type": "text/html",
              },
            }
          );
          return response;
        };
        `,

        "vite.config.ts": js`
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
        `,
      },
    });

    appFixture = await fixture.createServer();
  });

  test.afterAll(async () => {
    await appFixture.close();
  });

  let logs: string[] = [];

  test.beforeEach(({ page }) => {
    page.on("console", (msg) => {
      logs.push(msg.text());
    });
  });

  test("returns index.html for all routes", async () => {
    let res = await fixture.requestDocument("/");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/html");
    expect(prettyHtml(await res.text())).toContain(
      prettyHtml(`<div>Hello from /index.html</div>`)
    );

    res = await fixture.requestDocument("/about");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/html");
    expect(prettyHtml(await res.text())).toContain(
      prettyHtml(`<div>Hello from /index.html</div>`)
    );
  });
});
