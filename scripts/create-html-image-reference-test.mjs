import { readFile, writeFile } from "node:fs/promises";
import { basename, extname } from "node:path";

const [imagePath, artifactUrl, outputPath] = process.argv.slice(2);

if (!imagePath || !artifactUrl || !outputPath) {
  throw new Error(
    "Usage: node scripts/create-html-image-reference-test.mjs <image> <artifact-url> <output>",
  );
}

const mediaTypes = new Map([
  [".gif", "image/gif"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);
const mediaType = mediaTypes.get(extname(imagePath).toLowerCase());

if (!mediaType) {
  throw new Error(`Unsupported image type: ${extname(imagePath)}`);
}

const image = await readFile(imagePath);
const dataUrl = `data:${mediaType};base64,${image.toString("base64")}`;
const escapedArtifactUrl = artifactUrl
  .replaceAll("&", "&amp;")
  .replaceAll('"', "&quot;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");
const escapedImageName = basename(imagePath)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

const html = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>HTML image reference test</title>
    <style>
      :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
      body { margin: 0 auto; max-width: 1200px; padding: 24px; }
      main { display: grid; gap: 24px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
      section { border: 1px solid #8888; border-radius: 12px; padding: 16px; }
      img { display: block; height: auto; max-width: 100%; }
      code { overflow-wrap: anywhere; }
    </style>
  </head>
  <body>
    <h1>HTML image reference test</h1>
    <p>同じ <code>${escapedImageName}</code> を2方式で表示しています。</p>
    <main>
      <section>
        <h2>Data URL</h2>
        <p>PNGをHTML内のBase64に埋め込み。</p>
        <img src="${dataUrl}" alt="Data URLで埋め込んだテスト画像">
      </section>
      <section>
        <h2>GitHub Artifact URL</h2>
        <p><code>archive: false</code> で個別ArtifactにしたPNGを参照。</p>
        <img src="${escapedArtifactUrl}" alt="Artifact URLで参照したテスト画像">
        <p><a href="${escapedArtifactUrl}">画像Artifactを直接開く</a></p>
      </section>
    </main>
  </body>
</html>
`;

await writeFile(outputPath, html);
