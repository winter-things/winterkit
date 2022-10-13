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

test("simple fetch", async () => {
  const res = await fetch("http://localhost:5173");
  const text = await res.text();
  expect(text).toContain("<div>Hello</div>");
  expectHeaders(res, {
    "content-type": "text/html",
    "content-length": "16",
    // connection: "keep-alive",
    // "keep-alive": "timeout=5",
    // "access-control-allow-origin": "*",
  });

  expect(res.headers.get("content-type")).toBe("text/html");
  console.log(res.headers);
}, 1000);
