import { execFileSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const reportDirectory = resolve(process.argv[2] ?? "playwright-report");
const reportPath = join(reportDirectory, "index.html");
const reportHtml = await readFile(reportPath, "utf8");
const embeddedReportPattern =
  /(<template id="playwrightReportBase64">data:application\/zip;base64,)([^<]+)(<\/template>)/;
const embeddedReport = reportHtml.match(embeddedReportPattern);

if (!embeddedReport) {
  throw new Error(`Embedded Playwright report not found: ${reportPath}`);
}

const workingDirectory = await mkdtemp(
  join(tmpdir(), "playwright-report-images-"),
);
const sourceArchive = join(workingDirectory, "report.zip");
const outputArchive = join(workingDirectory, "report-with-data-urls.zip");
const extractedDirectory = join(workingDirectory, "report");
const embeddedImagePaths = new Set();

try {
  await writeFile(sourceArchive, Buffer.from(embeddedReport[2], "base64"));
  execFileSync("unzip", ["-q", sourceArchive, "-d", extractedDirectory]);

  for (const fileName of await readdir(extractedDirectory)) {
    if (!fileName.endsWith(".json")) {
      continue;
    }

    const filePath = join(extractedDirectory, fileName);
    const report = JSON.parse(await readFile(filePath, "utf8"));

    await replaceImagePaths(report);
    await writeFile(filePath, JSON.stringify(report));
  }

  execFileSync("zip", ["-q", "-r", outputArchive, "."], {
    cwd: extractedDirectory,
  });

  const outputBase64 = (await readFile(outputArchive)).toString("base64");
  const outputHtml = reportHtml.replace(
    embeddedReportPattern,
    `$1${outputBase64}$3`,
  );

  await writeFile(reportPath, outputHtml);

  for (const imagePath of embeddedImagePaths) {
    await rm(join(reportDirectory, imagePath));
  }

  console.log(
    `Embedded ${embeddedImagePaths.size} Playwright report image(s) as Data URLs.`,
  );
} finally {
  await rm(workingDirectory, { recursive: true, force: true });
}

async function replaceImagePaths(value) {
  if (!value || typeof value !== "object") {
    return;
  }

  if (
    typeof value.contentType === "string" &&
    value.contentType.startsWith("image/") &&
    typeof value.path === "string" &&
    value.path.startsWith("data/")
  ) {
    const imagePath = join(reportDirectory, value.path);
    const image = await readFile(imagePath);

    embeddedImagePaths.add(value.path);
    value.path = `data:${value.contentType};base64,${image.toString("base64")}`;
    return;
  }

  for (const child of Object.values(value)) {
    await replaceImagePaths(child);
  }
}
