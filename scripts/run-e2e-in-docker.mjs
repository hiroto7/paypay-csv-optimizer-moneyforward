import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import process from "node:process";

const require = createRequire(import.meta.url);
const packageJson = require("../package.json");
const playwrightVersion = packageJson.devDependencies["@playwright/test"];
const playwrightImage = `mcr.microsoft.com/playwright:v${playwrightVersion}-noble`;
const updateSnapshots = process.argv.includes("--update-snapshots");
const testCommand = updateSnapshots
  ? "npm run test:e2e:container -- --update-snapshots"
  : "npm run test:e2e:container";

const result = spawnSync(
  "docker",
  [
    "run",
    "--rm",
    "--init",
    "--ipc=host",
    "--platform",
    "linux/amd64",
    "--env",
    "CI=1",
    "--volume",
    `${process.cwd()}:/work`,
    "--volume",
    "/work/node_modules",
    "--workdir",
    "/work",
    playwrightImage,
    "bash",
    "-lc",
    `npm ci && ${testCommand}`,
  ],
  { stdio: "inherit" },
);

if (result.error) {
  console.error(`DockerでE2Eを実行できませんでした: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
