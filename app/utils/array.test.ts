import { describe, expect, it } from "vitest";
import { sum } from "./array";

describe("sum", () => {
  it("各要素から取得した数値を合計すること", () => {
    const items = [{ count: 2 }, { count: 3 }, { count: 5 }] as const;

    expect(sum(items, (item) => item.count)).toBe(10);
  });

  it("空の配列では0を返すこと", () => {
    expect(sum([], () => 1)).toBe(0);
  });
});
