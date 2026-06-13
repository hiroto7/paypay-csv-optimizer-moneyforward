import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Resvg } from "@resvg/resvg-js";

const root = resolve(import.meta.dirname, "..");
const sourcePath = resolve(root, "public/pwa-icon.svg");
const targets = [
  ["public/apple-touch-icon.png", 180],
  ["public/pwa-icon-192.png", 192],
  ["public/pwa-icon-512.png", 512],
];
const checkOnly = process.argv.includes("--check");
const source = await readFile(sourcePath);
const staleTargets = [];

for (const [relativePath, size] of targets) {
  const outputPath = resolve(root, relativePath);
  const rendered = new Resvg(source, {
    fitTo: { mode: "width", value: size },
  })
    .render()
    .asPng();

  if (checkOnly) {
    const current = await readFile(outputPath).catch(() => null);
    if (!current?.equals(rendered)) {
      staleTargets.push(relativePath);
    }
  } else {
    await writeFile(outputPath, rendered);
    console.log(`Generated ${relativePath}`);
  }
}

if (staleTargets.length > 0) {
  console.error(
    `Generated icons are out of date: ${staleTargets.join(", ")}\nRun npm run icons:generate.`,
  );
  process.exitCode = 1;
}
