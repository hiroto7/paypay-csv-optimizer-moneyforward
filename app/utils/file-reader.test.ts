import { describe, expect, it } from "vitest";
import { readFileAsTextAuto } from "./file-reader";

describe("readFileAsTextAuto", () => {
  it("UTF-8のファイルを読み込む", async () => {
    const file = new File([new TextEncoder().encode("取引履歴")], "utf8.csv");

    await expect(readFileAsTextAuto(file)).resolves.toBe("取引履歴");
  });

  it("UTF-8として読めないファイルをShift_JISで読み込む", async () => {
    const file = new File(
      [new Uint8Array([0x82, 0xa0, 0x82, 0xa2])],
      "shift-jis.csv",
    );

    await expect(readFileAsTextAuto(file)).resolves.toBe("あい");
  });
});
