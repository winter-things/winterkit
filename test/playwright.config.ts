import type { PlaywrightTestConfig } from "@playwright/test";
import { devices } from "@playwright/test";

const config: PlaywrightTestConfig = {
  testDir: ".",
  testMatch: ["**/*-test.ts"],
  timeout: 300_000,
  expect: {
    timeout: 5_000,
  },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 3 : undefined,
  reporter: process.env.CI
    ? "github"
    : [["html", { open: process.env.TEST_REPORT ? "always" : "none" }]],
  use: { actionTimeout: 0 },
  projects: [
    {
      name: "node preview",
      metadata: {
        build: {
          command: "npx",
          args: ["--node-options=--experimental-vm-modules", "vite", "build"],
        },
        serve: {
          command: "npx",
          args: (port) => [
            "--node-options=--experimental-vm-modules",
            "vite",
            "preview",
            "--port",
            `${port}`,
          ],
        },
      },
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "node dev",
      metadata: {
        build: {
          command: "echo",
          args: ["done"],
        },
        serve: {
          command: "npx",
          args: (port) => [
            "--node-options=--experimental-vm-modules",
            "vite",
            "--port",
            `${port}`,
          ],
        },
      },
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "cloudflare pages",
      metadata: {
        ip: "127.0.0.1",
        build: {
          command: "npx",
          args: ["--node-options='--experimental-vm-modules'", "vite", "build"],
        },
        serve: {
          command: "npx",
          args: (port) => [
            "wrangler",
            "pages",
            "dev",
            "dist",
            "--port",
            `${port}`,
          ],
        },
      },
    },
    {
      name: "cloudflare worker",
      metadata: {
        ip: "127.0.0.1",
        build: {
          command: "npx",
          args: ["--node-options='--experimental-vm-modules'", "vite", "build"],
        },
        serve: {
          command: "npx",
          args: (port) => [
            "wrangler",
            "dev",
            "worker/index.js",
            "--site",
            "dist",
            "--port",
            `${port}`,
          ],
        },
      },
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
};

export default config;
