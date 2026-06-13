import { describe, expect, it } from "vitest";
import { mergeUniqueFiles } from "./shared-file-store";

const createFile = (
  name: string,
  content: string,
  lastModified: number,
): File => new File([content], name, { lastModified, type: "text/csv" });

describe("mergeUniqueFiles", () => {
  it("別のCSVを共有順に蓄積する", async () => {
    const first = createFile("mfme-1.csv", "first", 1);
    const second = createFile("mfme-2.csv", "second", 2);

    await expect(mergeUniqueFiles([first], [second])).resolves.toEqual([
      first,
      second,
    ]);
  });

  it("同じ内容のファイルは名前や更新日時が違っても重複追加しない", async () => {
    const original = createFile("mfme.csv", "content", 1);
    const reshared = createFile("mfme-copy.csv", "content", 2);

    await expect(mergeUniqueFiles([original], [reshared])).resolves.toEqual([
      reshared,
    ]);
  });
});
