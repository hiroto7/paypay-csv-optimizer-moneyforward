import { afterEach, describe, expect, it, vi } from "vitest";
import { shareCsv } from "./csv-share";

describe("shareCsv", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("BOM付きUTF-8のCSVファイルを共有する", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      canShare: () => true,
      share,
    });

    await expect(shareCsv("output.csv", "日付,内容\n")).resolves.toBe(true);

    const sharedFile = share.mock.calls[0]?.[0]?.files[0] as File;
    expect(sharedFile.name).toBe("output.csv");
    expect(new Uint8Array(await sharedFile.arrayBuffer()).slice(0, 3)).toEqual(
      new Uint8Array([0xef, 0xbb, 0xbf]),
    );
  });
});
