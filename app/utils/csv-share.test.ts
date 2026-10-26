import { afterEach, describe, expect, it, vi } from "vitest";
import { shareCsv, shareFile } from "./csv-share";

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

describe("shareFile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("受け取ったファイルをそのまま共有し、BOMを付け足さない", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { canShare: () => true, share });
    const file = new File(["﻿日付,内容\n"], "pp2mf-paypay残高.csv", {
      type: "text/csv",
    });

    await expect(shareFile(file)).resolves.toBe(true);

    expect(share.mock.calls[0]?.[0]?.files[0]).toBe(file);
  });

  it("共有シートを閉じたときはfalseを返す", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    vi.stubGlobal("navigator", {
      canShare: () => true,
      share: vi.fn().mockRejectedValue(abortError),
    });

    await expect(shareFile(new File([""], "a.csv"))).resolves.toBe(false);
  });
});
