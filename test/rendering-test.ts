import { expect, test } from "@playwright/test";

import type { AppFixture, Fixture } from "./helpers/create-fixture.js";
import { createFixture, js } from "./helpers/create-fixture.js";
import {
  PlaywrightFixture,
  prettyHtml,
  selectHtml,
} from "./helpers/playwright-fixture.js";

test.describe("rendering", () => {
  let fixture: Fixture;
  let appFixture: AppFixture;

  test.beforeAll(async () => {
    fixture = await createFixture({
      build: {
        command: "node",
        args: [
          "--experimental-vm-modules",
          "node_modules/vite/dist/node/cli.js",
          "build",
        ],
      },
      serve: {
        command: "node",
        args: (port) => [
          "--experimental-vm-modules",
          "node_modules/vite/dist/node/cli.js",
          "preview",
          "--port",
          port,
        ],
      },
      files: {
        "index.html": `<div>Hello from /index.html</div>`,
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

  test("server renders matching routes", async () => {
    let res = await fixture.requestDocument("/");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/html;charset=utf-8");

    res = await fixture.requestDocument("/about");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/html;charset=utf-8");
  });
});
