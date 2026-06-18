import { describe, expect, it } from "vitest";
import { mergeUniqueFiles } from "./shared-file-store";

describe("input file persistence", () => {
  it("同じ内容のCSVを重複保存しない", async () => {
    const original = new File(["same-content"], "2025.csv");
    const duplicate = new File(["same-content"], "renamed.csv");
    const another = new File(["another-content"], "2026.csv");

    await expect(
      mergeUniqueFiles([original], [duplicate, another]),
    ).resolves.toEqual([duplicate, another]);
  });
});
