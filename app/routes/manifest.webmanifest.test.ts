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
});
