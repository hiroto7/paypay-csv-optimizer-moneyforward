import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addCounts,
  countExclusions,
  createCountsFromKeys,
  createEmptyLocalExclusionState,
  createStatsFromTransactionCounts,
  loadLocalExclusionState,
  saveLocalExclusionState,
} from "./local-exclusion-store";

type MockStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

function createMockStorage(): MockStorage {
  const store = new Map<string, string>();
  return {
    getItem(key) {
      return store.get(key) ?? null;
    },
    setItem(key, value) {
      store.set(key, value);
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

describe("local exclusion store", () => {
  beforeEach(() => {
    const fakeWindow = { localStorage: createMockStorage() };
    vi.stubGlobal("window", fakeWindow);
  });

  it("取り込み確認記録を保存して復元できる", () => {
    const initialState = {
      localImportedCounts: new Map([
        ["2025/10/25_-100_PayPay残高_ダミーストアB", 1],
      ]),
      updatedAt: 1234567890,
    };

    saveLocalExclusionState(initialState);
    const restoredState = loadLocalExclusionState();

    expect(
      restoredState.localImportedCounts.get(
        "2025/10/25_-100_PayPay残高_ダミーストアB",
      ),
    ).toBe(1);
    expect(restoredState.updatedAt).toBe(1234567890);
  });

  it("破損した保存値から非有限カウントを復元しない", () => {
    const storage = createMockStorage();
    storage.setItem(
      "paypay-csv-optimizer:local-exclusion-state:v1",
      '{"localImportedCounts":[["valid",2],["infinite",1e400]],"updatedAt":1}',
    );
    vi.stubGlobal("window", { localStorage: storage });

    expect(loadLocalExclusionState().localImportedCounts).toEqual(
      new Map([["valid", 2]]),
    );
  });
});

describe("createCountsFromKeys", () => {
  it("同じ除外キーの件数を保持できること", () => {
    const counts = createCountsFromKeys(["a", "b", "a"]);

    expect(counts.get("a")).toBe(2);
    expect(counts.get("b")).toBe(1);
  });
});

describe("countExclusions", () => {
  it("除外キーの種類数ではなく明細件数を合計する", () => {
    expect(
      countExclusions(
        new Map([
          ["same-key", 2],
          ["another-key", 1],
        ]),
      ),
    ).toBe(3);
  });
});

describe("createStatsFromTransactionCounts", () => {
  it("重複件数を維持しながら取引キーの日付範囲を集計する", () => {
    const stats = createStatsFromTransactionCounts(
      new Map([
        ["2026/06/16_-100_PayPay残高_ダミーストアA", 2],
        ["2026/06/13_-200_PayPay残高_ダミーストアB", 1],
      ]),
    );

    expect(stats.count).toBe(3);
    expect(stats.startDate?.toISOString()).toBe("2026-06-12T15:00:00.000Z");
    expect(stats.endDate?.toISOString()).toBe("2026-06-15T15:00:00.000Z");
  });

  it("日付を取得できない記録も件数には含める", () => {
    const stats = createStatsFromTransactionCounts(new Map([["invalid", 2]]));

    expect(stats).toEqual({ count: 2, startDate: null, endDate: null });
  });
});

describe("addCounts", () => {
  it("既存のローカル取り込み記録へ保存済みチャンクの件数を追加できること", () => {
    const nextCounts = addCounts(
      new Map([["2025/10/24_-190_PayPay残高_ダミーストアA", 1]]),
      createCountsFromKeys([
        "2025/10/24_-190_PayPay残高_ダミーストアA",
        "2025/10/25_-100_PayPay残高_ダミーストアB",
      ]),
    );

    expect(nextCounts.get("2025/10/24_-190_PayPay残高_ダミーストアA")).toBe(2);
    expect(nextCounts.get("2025/10/25_-100_PayPay残高_ダミーストアB")).toBe(1);
  });
});

describe("createEmptyLocalExclusionState", () => {
  it("初期状態を作成できること", () => {
    const state = createEmptyLocalExclusionState();

    expect(state.localImportedCounts.size).toBe(0);
    expect(state.updatedAt).toBeNull();
  });
});
