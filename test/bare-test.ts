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

test.describe("bare", () => {
  let fixture: Fixture;
  let appFixture: AppFixture;

  test.beforeAll(async () => {
    fixture = await createFixture({
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
