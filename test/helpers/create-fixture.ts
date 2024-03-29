import { test } from "@playwright/test";
import spawn, { sync as spawnSync } from "cross-spawn";
import fse from "fs-extra";
import { readFile } from "fs/promises";
import getPort from "get-port";
import path from "path";
import c from "picocolors";
import stripIndent from "strip-indent";
import { fileURLToPath, pathToFileURL } from "url";
import waitOn from "wait-on";
import * as child_process from "child_process";

const TMP_DIR = path.join(
  path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url)))),
  ".fixtures"
);

type BuildArgs = {
  command: string;
  args: ReadonlyArray<string>;
  options?: child_process.SpawnOptions;
};

interface FixtureInit {
  buildStdio?: boolean;
  sourcemap?: boolean;
  files: { [filename: string]: string };
  build: {
    command: string;
    args: ReadonlyArray<string>;
    options?: child_process.SpawnOptions;
  };
  serve: {
    command: string;
    args: (port: number) => ReadonlyArray<string>;
    options?: child_process.SpawnOptions;
    url?: (port: number) => string;
  };
}

interface EntryServer {
  default: (event: { request: Request }) => Promise<Response>;
}

export type Fixture = Awaited<ReturnType<typeof createFixture>>;
export type AppFixture = Awaited<ReturnType<typeof createTestServer>>;

export const js = String.raw;
export const mdx = String.raw;
export const css = String.raw;
export function json(value: object) {
  return JSON.stringify(value, null, 2);
}

export function createViteFixture(args: Partial<FixtureInit>) {
  return createFixture({
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
        `${port}`,
      ],
    },
    files: {},
    ...args,
  });
}

export async function createFixture(_init: Partial<FixtureInit>) {
  let init: FixtureInit = _init as FixtureInit;
  let info = test.info();

  if (!init.build) {
    init.build = info.project.metadata?.build;
  }

  if (!init.serve) {
    init.serve = info.project.metadata?.serve;
  }

  let projectDir = await createFixtureProject(init as FixtureInit);
  // let buildPath = path.resolve(
  //   projectDir,
  //   ".solid",
  //   "server",
  //   "entry-server.js"
  // );
  // if (!fse.existsSync(buildPath)) {
  //   throw new Error(
  //     c.red(
  //       `Expected build directory to exist at ${c.dim(
  //         buildPath
  //       )}. The build probably failed. Did you maybe have a syntax error in your test code strings?`
  //     )
  //   );
  // }

  let ip =
    info.project.metadata?.ip ?? process.env.ADAPTER === "solid-start-deno"
      ? "127.0.0.1"
      : "localhost";
  let port = await getPort();
  console.log(port);

  let proc = spawn(init.serve.command, init.serve.args?.(port), {
    cwd: projectDir,
    ...(init.serve.options ?? {}),
    env: {
      ...process.env,
      PORT: `${port}`,
      IP: ip,
      ...(init.serve.options?.env ?? {}),
    },
  });

  proc.stdout!.pipe(process.stdout);
  proc.stderr!.pipe(process.stderr);

  let url = init.serve.url?.(port) ?? `http://${ip}:${port}`;

  await waitOn({
    resources: [`http://${ip}:${port}/favicon.ico`],
    validateStatus: function (status) {
      return status >= 200 && status < 310; // default if not provided
    },
  });

  let requestDocument = async (href: string, init?: RequestInit) => {
    let url = new URL(href, `http://${ip}:${port}`);
    let request = new Request(url, init);
    return await fetch(request);
  };

  let postDocument = async (href: string, data: URLSearchParams | FormData) => {
    return await requestDocument(href, {
      method: "POST",
      body: data,
      headers: {
        "Content-Type":
          data instanceof URLSearchParams
            ? "application/x-www-form-urlencoded"
            : "multipart/form-data",
      },
    });
  };

  let getBrowserAsset = async (asset: string) => {
    return await fse.readFile(
      path.join(projectDir, "public", asset.replace(/^\//, "")),
      "utf8"
    );
  };

  return {
    projectDir,
    requestDocument,
    postDocument,
    getBrowserAsset,
    createServer: async () => {
      return {
        serverUrl: `http://${ip}:${port}`,
        close: async () => {
          proc.kill();
        },
      };
    },
  };

  // return await createFixtureServer(buildPath, manifest, projectDir);
}

async function createFixtureServer(
  buildPath: string,
  manifest: any,
  projectDir: string
) {
  let app: EntryServer = await import(pathToFileURL(buildPath).toString());

  let handler = async (request: Request) => {
    return await app.default({
      request: request,
      env: {
        manifest,
        getStaticHTML: async (assetPath) => {
          let text = await readFile(
            path.join(projectDir, "dist", "public", assetPath + ".html"),
            "utf8"
          );
          return new Response(text, {
            headers: {
              "content-type": "text/html",
            },
          });
        },
      },
    });
  };

  let requestDocument = async (href: string, init?: RequestInit) => {
    let url = new URL(href, "test://test");
    let request = new Request(url, init);
    return await handler(request);
  };

  let postDocument = async (href: string, data: URLSearchParams | FormData) => {
    return await requestDocument(href, {
      method: "POST",
      body: data,
      headers: {
        "Content-Type":
          data instanceof URLSearchParams
            ? "application/x-www-form-urlencoded"
            : "multipart/form-data",
      },
    });
  };

  let getBrowserAsset = async (asset: string) => {
    return await fse.readFile(
      path.join(projectDir, "public", asset.replace(/^\//, "")),
      "utf8"
    );
  };

  return {
    projectDir,
    build: app,
    requestDocument,
    postDocument,
    getBrowserAsset,
    manifest,
    createServer: () =>
      createTestServer({
        projectDir,
        build: app,
        manifest,
      }),
  };
}

export async function createTestServer(fixture: {
  projectDir: string;
  manifest: any;
  build;
}) {
  let startServer = async (): Promise<{
    port: number;
    stop: () => Promise<void>;
  }> => {
    return new Promise(async (accept, reject) => {
      let port = await getPort();

      const paths = {
        assets: path.join(fixture.projectDir, "dist", "public"),
      };

      let app = createServer({
        paths,
        env: { manifest: fixture.manifest },
        handler: fixture.build.default,
      });

      let stop = (): Promise<void> => {
        return new Promise((res, rej) => {
          app.server.close((err) => {
            if (err) {
              rej(err);
            } else {
              res();
            }
          });
        });
      };

      app.listen(port, () => {
        accept({ stop, port });
      });
    });
  };

  let start = async () => {
    let { stop, port } = await startServer();

    let serverUrl = `http://localhost:${port}`;

    return {
      serverUrl,
      /**
       * Shuts down the fixture app, **you need to call this
       * at the end of a test** or `afterAll` if the fixture is initialized in a
       * `beforeAll` block. Also make sure to `await app.close()` or else you'll
       * have memory leaks.
       */
      close: async () => {
        return await stop();
      },
    };
  };

  return await start();
}

////////////////////////////////////////////////////////////////////////////////
export async function createFixtureProject(init: FixtureInit): Promise<string> {
  let template = "template";
  let dirname = path.dirname(
    path.dirname(path.join(fileURLToPath(import.meta.url)))
  );
  let info = test.info();
  let pName = info.titlePath
    .slice(1, info.titlePath.length - 1)
    .map((s) => s.replace(/ /g, "-"))
    .join("-");
  let integrationTemplateDir = path.join(dirname, template);
  test;
  let projectName = `${pName}-${Math.random().toString(32).slice(2)}`;
  let projectDir = path.join(TMP_DIR, projectName);

  await fse.ensureDir(projectDir);
  await fse.copy(integrationTemplateDir, projectDir);

  // if (init.setup) {
  //   spawnSync("node", ["node_modules/@remix-run/dev/cli.js", "setup", init.setup], {
  //     cwd: projectDir
  //   });
  // }
  await writeTestFiles(init, projectDir);
  await build(init.build, projectDir, init.buildStdio);

  return projectDir;
}

function build(
  buildConfig: BuildArgs,
  projectDir: string,
  buildStdio?: boolean,
  adapter: string | undefined = process.env.START_ADAPTER
) {
  // let buildArgs = ["node_modules/@remix-run/dev/cli.js", "build"];
  // if (sourcemap) {
  //   buildArgs.push("--sourcemap");
  // }
  let proc = spawnSync(buildConfig.command, buildConfig.args, {
    cwd: projectDir,
    ...buildConfig.options,
    env: {
      ...process.env,
      ...buildConfig.options?.env,
    },
  });

  if (proc.error) {
    console.error(proc.error);
  }

  if (buildStdio ?? process.env.DEBUG) {
    console.log(proc.stdout.toString());
  }
  console.error(proc.stderr.toString());
}

async function writeTestFiles(init: FixtureInit, dir: string) {
  await Promise.all(
    Object.keys(init.files).map(async (filename) => {
      let filePath = path.join(dir, filename);
      await fse.ensureDir(path.dirname(filePath));
      await fse.writeFile(filePath, stripIndent(init.files[filename]));
    })
  );
}
