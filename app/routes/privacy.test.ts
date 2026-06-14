import { describe, expect, it, vi } from "vitest";

vi.mock("lucide-react", () => ({
  ArrowLeft: () => null,
  Database: () => null,
  ExternalLink: () => null,
  HardDrive: () => null,
  ShieldCheck: () => null,
}));

vi.mock("react-router", () => ({
  Link: () => null,
}));

vi.mock("~/components/AppFooter", () => ({
  default: () => null,
}));

const { meta } = await import("./privacy");

describe("meta", () => {
  it("2つのメタデータオブジェクトを返すこと", () => {
    const result = meta({} as Parameters<typeof meta>[0]);
    expect(result).toHaveLength(2);
  });

  it("titleタグに正しいページタイトルを設定すること", () => {
    const result = meta({} as Parameters<typeof meta>[0]);
    expect(result[0]).toEqual({
      title: "プライバシーについて | PayPay CSV Optimizer",
    });
  });

  it("descriptionメタタグを含むこと", () => {
    const result = meta({} as Parameters<typeof meta>[0]);
    expect(result[1]).toMatchObject({ name: "description" });
  });

  it("descriptionメタタグに正しい説明文を設定すること", () => {
    const result = meta({} as Parameters<typeof meta>[0]);
    expect(result[1]).toEqual({
      name: "description",
      content:
        "PayPay CSV Optimizerが扱うCSV、端末内保存、外部通信について説明します。",
    });
  });

  it("titleオブジェクトにnameプロパティがないこと", () => {
    const result = meta({} as Parameters<typeof meta>[0]);
    expect(result[0]).not.toHaveProperty("name");
  });

  it("descriptionオブジェクトにtitleプロパティがないこと", () => {
    const result = meta({} as Parameters<typeof meta>[0]);
    expect(result[1]).not.toHaveProperty("title");
  });

  it("引数に関わらず同じメタデータを返すこと（純粋関数）", () => {
    const result1 = meta({} as Parameters<typeof meta>[0]);
    const result2 = meta({} as Parameters<typeof meta>[0]);
    expect(result1).toEqual(result2);
  });
});
