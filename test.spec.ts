/// <reference lib="dom" />
import { test, expect } from "vitest";

function expectHeaders(response: Response, headers: Record<string, string>) {
  Object.entries(headers).forEach(([key, value]) => {
    expect(
      response.headers.get(key),
      response.headers.get(key) === null
        ? `Missing header ${key}`
        : `Incorrect header ${key}: ${response.headers.get(key)}`
    ).toEqual(value);
  });
}

async function expectResponse(url: string, expectedText, expectedHeaders) {
  const res = await fetch(
    new URL(url, process.env.URL ?? "http://localhost:4173")
  );
  const text = await res.text();
  expect(text).toContain(expectedText);
  expectHeaders(res, expectedHeaders);
}

test("fetch /", async () => {
  await expectResponse("/", "<div>Hello from /index.html</div>", {
    "content-type": "text/html; charset=utf-8",
  });
}, 1000);

test("fetch /index.html", async () => {
  await expectResponse("/index.html", "<div>Hello from /index.html</div>", {
    "content-type": "text/html; charset=utf-8",
  });
}, 1000);

test("fetch /other.html", async () => {
  await expectResponse("/other.html", "<div>Hello from /other.html</div>", {
    "content-type": "text/html; charset=utf-8",
  });
}, 1000);
