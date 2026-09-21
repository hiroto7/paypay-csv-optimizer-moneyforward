import { describe, expect, it } from "vitest";
import { loader } from "./manifest.webmanifest";

describe("manifest.webmanifest loader", () => {
  it("デスクトップChromeが照合できる絶対URLを関連PWAのIDに設定する", async () => {
    const response = loader({
      request: new Request("https://preview.example.com/manifest.webmanifest"),
    });
    const manifest = await response.json();

    expect(manifest.related_applications).toEqual([
      {
        platform: "webapp",
        url: "/manifest.webmanifest",
        id: "https://preview.example.com/",
      },
    ]);
  });

  it("別のMIMEタイプと文字列で共有されたCSVも受け付ける", async () => {
    const response = loader({
      request: new Request("https://preview.example.com/manifest.webmanifest"),
    });
    const manifest = await response.json();

    expect(manifest.share_target.params.text).toBe("shared-text");
    expect(manifest.share_target.params.files[0].accept).toEqual(
      expect.arrayContaining([
        ".csv",
        "text/csv",
        "text/plain",
        "application/octet-stream",
        "application/vnd.ms-excel",
      ]),
    );
  });
});
