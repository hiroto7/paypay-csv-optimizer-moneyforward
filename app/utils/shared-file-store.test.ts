import { describe, expect, it } from "vitest";
import { mergeUniqueFiles } from "./shared-file-store";

describe("input file persistence", () => {
  it("同名のCSVは新しく受信したファイルで置き換える", () => {
    const original = new File(["old-content"], "2025.csv");
    const replacement = new File(["new-content"], "2025.csv");

    expect(mergeUniqueFiles([original], [replacement])).toEqual([replacement]);
  });

  it("内容が同じでもファイル名が異なるCSVは追加する", () => {
    const original = new File(["same-content"], "2025.csv");
    const another = new File(["same-content"], "2026.csv");

    expect(mergeUniqueFiles([original], [another])).toEqual([
      original,
      another,
    ]);
  });
});
