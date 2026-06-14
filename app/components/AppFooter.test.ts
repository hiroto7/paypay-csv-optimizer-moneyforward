import { describe, expect, it, vi } from "vitest";

vi.mock("lucide-react", () => ({
  Code2: () => null,
  ExternalLink: () => null,
}));

vi.mock("react-router", () => ({
  Link: () => null,
}));

const { default: AppFooter } = await import("./AppFooter");

describe("AppFooter", () => {
  it("デフォルトエクスポートが関数であること", () => {
    expect(typeof AppFooter).toBe("function");
  });

  it("コンポーネントの関数名がAppFooterであること", () => {
    expect(AppFooter.name).toBe("AppFooter");
  });
});