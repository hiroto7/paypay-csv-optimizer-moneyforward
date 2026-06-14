import { describe, expect, it, vi } from "vitest";

vi.mock("@react-router/dev/routes", () => ({
  index: (file: string) => ({ file, index: true }),
  route: (path: string, file: string) => ({ path, file }),
}));

const routes = (await import("./routes")).default;

describe("routes", () => {
  it("2つのルートを定義すること", () => {
    expect(routes).toHaveLength(2);
  });

  it("最初のエントリがホームページのインデックスルートであること", () => {
    expect(routes[0]).toMatchObject({
      file: "routes/home.tsx",
      index: true,
    });
  });

  it("最初のエントリのファイルパスがhome.tsxを指すこと", () => {
    const [homeRoute] = routes;
    expect((homeRoute as { file: string }).file).toBe("routes/home.tsx");
  });

  it("2番目のエントリがprivacyパスのルートであること", () => {
    expect(routes[1]).toMatchObject({
      path: "privacy",
      file: "routes/privacy.tsx",
    });
  });

  it("2番目のエントリのファイルパスがprivacy.tsxを指すこと", () => {
    const privacyRoute = routes[1];
    expect((privacyRoute as { file: string }).file).toBe("routes/privacy.tsx");
  });

  it("インデックスルートはpathを持たないこと", () => {
    const [homeRoute] = routes;
    expect(homeRoute).not.toHaveProperty("path");
  });

  it("privacyルートはindex: trueを持たないこと", () => {
    const privacyRoute = routes[1];
    expect(privacyRoute).not.toMatchObject({ index: true });
  });
});