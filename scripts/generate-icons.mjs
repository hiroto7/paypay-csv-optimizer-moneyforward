import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Resvg } from "@resvg/resvg-js";

const root = resolve(import.meta.dirname, "..");
const sourcePath = resolve(root, "public/pwa-icon.svg");
const pngTargets = [
  ["public/apple-touch-icon.png", 180],
  ["public/pwa-icon-192.png", 192],
  ["public/pwa-icon-512.png", 512],
];
// タブ用の小さい表示では細部が潰れるため、チェックを省いた専用の絵から作る。
const faviconSourcePath = resolve(root, "public/favicon.svg");
const faviconPath = "public/favicon.ico";
const faviconSizes = [16, 32, 48];
const checkOnly = process.argv.includes("--check");
const source = await readFile(sourcePath);
const faviconSource = await readFile(faviconSourcePath);
const staleTargets = [];

function renderPng(svg, size) {
  return new Resvg(svg, {
    fitTo: { mode: "width", value: size },
  })
    .render()
    .asPng();
}

// 各サイズのPNGをそのまま収めたICOファイルを組み立てる。
function buildIco(sizes) {
  const images = sizes.map((size) => ({
    size,
    data: renderPng(faviconSource, size),
  }));
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = header.length;
  images.forEach(({ size, data }, index) => {
    const entry = 6 + 16 * index;
    header.writeUInt8(size, entry);
    header.writeUInt8(size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });

  return Buffer.concat([header, ...images.map(({ data }) => data)]);
}

const outputs = [
  ...pngTargets.map(([relativePath, size]) => [
    relativePath,
    renderPng(source, size),
  ]),
  [faviconPath, buildIco(faviconSizes)],
];

for (const [relativePath, rendered] of outputs) {
  const outputPath = resolve(root, relativePath);

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
