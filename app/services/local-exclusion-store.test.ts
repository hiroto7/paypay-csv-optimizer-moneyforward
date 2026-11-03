import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addCounts,
  applyConfirmedImport,
  clipCounts,
  countExclusions,
  createBaselineCounts,
  createCountsFromKeys,
  createEmptyLocalExclusionState,
  createStatsFromTransactionCounts,
  forgetOtherFileWork,
  type LocalExclusionState,
  loadLocalExclusionState,
  type PendingImport,
  persistLocalExclusionState,
  resetImportedRecords,
  saveLocalExclusionState,
  subtractCounts,
} from "./local-exclusion-store";

const STORE_KEY = "paypay-csv-optimizer:local-exclusion-state:v1";

const pendingImport: PendingImport = {
  accountName: "PayPay残高",
  sharedAt: 1234567890,
  payPayFingerprint: "sha256:file-a",
  transactions: [
    {
      key: "2025/10/24_-190_PayPay残高_ダミーストアA",
      date: "2025/10/24",
      content: "ダミーストアA",
      amount: -190,
    },
    {
      key: "2025/10/25_-100_PayPay残高_ダミー'ストアB",
      date: "2025/10/25",
      content: "ダミー’ストアB",
      amount: -100,
    },
  ],
};

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

  it("取り込み確認記録と作業中の保存状況を保存して復元できる", () => {
    const initialState: LocalExclusionState = {
      localImportedCounts: new Map([
        ["2025/10/25_-100_PayPay残高_ダミーストアB", 2],
      ]),
      pendingImport: null,
      currentWork: {
        payPayFingerprint: "sha256:file-a",
        savedCounts: new Map([["2025/10/25_-100_PayPay残高_ダミーストアB", 1]]),
      },
      hasNoMfmeHistory: true,
      updatedAt: 1234567890,
    };

    saveLocalExclusionState(initialState);

    expect(loadLocalExclusionState()).toEqual(initialState);
  });

  it("作業中の保存状況を取り込み記録の範囲に切り詰めて復元する", () => {
    const storage = createMockStorage();
    storage.setItem(
      STORE_KEY,
      JSON.stringify({
        localImportedCounts: [["a", 1]],
        currentWork: {
          payPayFingerprint: "sha256:file-a",
          savedCounts: [
            ["a", 3],
            ["b", 1],
          ],
        },
        updatedAt: 1,
      }),
    );
    vi.stubGlobal("window", { localStorage: storage });

    expect(loadLocalExclusionState().currentWork).toEqual({
      payPayFingerprint: "sha256:file-a",
      savedCounts: new Map([["a", 1]]),
    });
  });

  it("廃止した口座残高と残高の増減額を読み込まず、保存し直す", () => {
    const storage = createMockStorage();
    const { payPayFingerprint: _, ...legacyPendingImport } = pendingImport;
    storage.setItem(
      STORE_KEY,
      JSON.stringify({
        localImportedCounts: [["valid", 1]],
        accountBalances: [["PayPay残高", { amount: 1000, updatedAt: 1 }]],
        pendingImport: { ...legacyPendingImport, balanceDelta: -290 },
        updatedAt: 1,
      }),
    );
    vi.stubGlobal("window", { localStorage: storage });

    const state = loadLocalExclusionState();
    expect(state.localImportedCounts).toEqual(new Map([["valid", 1]]));
    expect(state.pendingImport).toEqual({
      ...legacyPendingImport,
      payPayFingerprint: null,
    });
    const rewritten = JSON.parse(storage.getItem(STORE_KEY) ?? "{}");
    expect(rewritten).not.toHaveProperty("accountBalances");
    expect(rewritten.pendingImport).not.toHaveProperty("balanceDelta");
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

  it("保存待ちを表示用の原文ごと保存して復元できる", () => {
    saveLocalExclusionState({
      ...createEmptyLocalExclusionState(),
      pendingImport,
      updatedAt: 1,
    });

    expect(loadLocalExclusionState().pendingImport).toEqual(pendingImport);
  });

  it("保存待ちのない既存形式を保存待ちなしとして復元できる", () => {
    const storage = createMockStorage();
    storage.setItem(
      STORE_KEY,
      '{"localImportedCounts":[["valid",1]],"updatedAt":1}',
    );
    vi.stubGlobal("window", { localStorage: storage });

    expect(loadLocalExclusionState().pendingImport).toBeNull();
  });

  it.each([
    ["口座名が空", { ...pendingImport, accountName: "" }],
    ["明細が空", { ...pendingImport, transactions: [] }],
    [
      "金額が整数でない明細",
      {
        ...pendingImport,
        transactions: [{ ...pendingImport.transactions[0], amount: 1.5 }],
      },
    ],
    [
      "明細キーがない明細",
      {
        ...pendingImport,
        transactions: [{ date: "2025/10/24", content: "A", amount: -1 }],
      },
    ],
  ])("破損した保存待ち（%s）を復元しない", (_, value) => {
    const storage = createMockStorage();
    storage.setItem(
      STORE_KEY,
      JSON.stringify({
        localImportedCounts: [["valid", 1]],
        pendingImport: value,
        updatedAt: 1,
      }),
    );
    vi.stubGlobal("window", { localStorage: storage });

    const state = loadLocalExclusionState();
    expect(state.pendingImport).toBeNull();
    expect(state.localImportedCounts).toEqual(new Map([["valid", 1]]));
  });

  it("記録・保存待ち・手順2の回答のどれかがあれば保存し、すべてなければ削除する", () => {
    const storage = createMockStorage();
    vi.stubGlobal("window", { localStorage: storage });

    persistLocalExclusionState({
      ...createEmptyLocalExclusionState(),
      pendingImport,
    });
    expect(storage.getItem(STORE_KEY)).not.toBeNull();

    persistLocalExclusionState({
      ...createEmptyLocalExclusionState(),
      hasNoMfmeHistory: true,
    });
    expect(storage.getItem(STORE_KEY)).not.toBeNull();

    persistLocalExclusionState(createEmptyLocalExclusionState());
    expect(storage.getItem(STORE_KEY)).toBeNull();
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
    expect(state.pendingImport).toBeNull();
    expect(state.currentWork).toBeNull();
    expect(state.hasNoMfmeHistory).toBe(false);
    expect(state.updatedAt).toBeNull();
  });
});

describe("subtractCounts / clipCounts", () => {
  it("件数を差し引き、0件以下のキーは残さない", () => {
    expect(
      subtractCounts(
        new Map([
          ["a", 3],
          ["b", 1],
        ]),
        new Map([
          ["a", 1],
          ["b", 2],
        ]),
      ),
    ).toEqual(new Map([["a", 2]]));
  });

  it("上限を超える件数を切り詰める", () => {
    expect(
      clipCounts(
        new Map([
          ["a", 3],
          ["b", 1],
        ]),
        new Map([["a", 2]]),
      ),
    ).toEqual(new Map([["a", 2]]));
  });
});

describe("作業中の保存状況", () => {
  const keyA = "2025/10/24_-190_PayPay残高_ダミーストアA";
  const keyB = "2025/10/25_-100_PayPay残高_ダミー'ストアB";

  const withPending = (
    state: LocalExclusionState,
    payPayFingerprint: string | null,
  ): LocalExclusionState => ({
    ...state,
    pendingImport: { ...pendingImport, payPayFingerprint },
  });

  it("保存を確認すると、記録と今のファイルの保存状況の両方に加える", () => {
    const state = applyConfirmedImport(
      withPending(createEmptyLocalExclusionState(), "sha256:file-a"),
      10,
    );

    expect(state.pendingImport).toBeNull();
    expect(state.localImportedCounts).toEqual(
      new Map([
        [keyA, 1],
        [keyB, 1],
      ]),
    );
    expect(state.currentWork).toEqual({
      payPayFingerprint: "sha256:file-a",
      savedCounts: new Map([
        [keyA, 1],
        [keyB, 1],
      ]),
    });
  });

  it("同じファイルで保存しても、作成対象から除外する件数は変わらない", () => {
    const before: LocalExclusionState = {
      ...createEmptyLocalExclusionState(),
      localImportedCounts: new Map([["earlier", 1]]),
    };
    const after = applyConfirmedImport(
      withPending(before, "sha256:file-a"),
      10,
    );

    expect(createBaselineCounts(after, "sha256:file-a")).toEqual(
      createBaselineCounts(before, "sha256:file-a"),
    );
    expect(createBaselineCounts(after, "sha256:file-b")).toEqual(
      after.localImportedCounts,
    );
  });

  it("別のファイルで保存すると、前のファイルの保存状況を置き換える", () => {
    const first = applyConfirmedImport(
      withPending(createEmptyLocalExclusionState(), "sha256:file-a"),
      10,
    );
    const second = applyConfirmedImport(
      {
        ...first,
        pendingImport: {
          ...pendingImport,
          payPayFingerprint: "sha256:file-b",
          transactions: pendingImport.transactions.slice(0, 1),
        },
      },
      20,
    );

    expect(second.currentWork).toEqual({
      payPayFingerprint: "sha256:file-b",
      savedCounts: new Map([[keyA, 1]]),
    });
    expect(second.localImportedCounts.get(keyA)).toBe(2);
  });

  it("以前の形式の保存待ちは記録にだけ加える", () => {
    const state = applyConfirmedImport(
      withPending(createEmptyLocalExclusionState(), null),
      10,
    );

    expect(state.localImportedCounts.size).toBe(2);
    expect(state.currentWork).toBeNull();
  });

  it("PayPayの取引履歴を替えたら保存状況だけを忘れ、同じファイルなら残す", () => {
    const state = applyConfirmedImport(
      withPending(createEmptyLocalExclusionState(), "sha256:file-a"),
      10,
    );

    expect(forgetOtherFileWork(state, "sha256:file-a", 20)).toBe(state);
    const changed = forgetOtherFileWork(state, "sha256:file-b", 20);
    expect(changed.currentWork).toBeNull();
    expect(changed.localImportedCounts).toEqual(state.localImportedCounts);
  });

  it("入出金履歴の変更では記録と保存状況をリセットし、保存待ちと回答は残す", () => {
    const state = resetImportedRecords(
      {
        ...applyConfirmedImport(
          withPending(createEmptyLocalExclusionState(), "sha256:file-a"),
          10,
        ),
        pendingImport,
        hasNoMfmeHistory: true,
      },
      20,
    );

    expect(state.localImportedCounts.size).toBe(0);
    expect(state.currentWork).toBeNull();
    expect(state.pendingImport).toEqual(pendingImport);
    expect(state.hasNoMfmeHistory).toBe(true);
  });
});
