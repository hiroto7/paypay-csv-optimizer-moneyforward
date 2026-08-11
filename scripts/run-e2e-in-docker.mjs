import { spawnSync } from "node:child_process";
import process from "node:process";
import packageJson from "../package.json" with { type: "json" };

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
    "CI",
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
