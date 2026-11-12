import { type FileStats, parseDate, updateDateRange } from "./csv-date";
import type { ChunkTransaction } from "./paypay-csv";

const STORE_KEY = "paypay-csv-optimizer:local-exclusion-state:v1";

// 今のPayPayの取引履歴で「MoneyForward MEで保存した」明細。取り込み記録の一部で、
// 作成対象の区切りをリロード後も変えずに、口座ごとの保存済みを求めるために使う。
type CurrentWork = {
  payPayFingerprint: string;
  savedCounts: Map<string, number>;
};

export type LocalExclusionState = {
  localImportedCounts: Map<string, number>;
  pendingImport: PendingImport | null;
  currentWork: CurrentWork | null;
  // 手順2で「MoneyForward MEにPayPayの明細を登録したことはない」と答えたか。
  hasNoMfmeHistory: boolean;
  updatedAt: number | null;
};

// 共有したが、MoneyForward MEで保存したかをまだ確認していない取り込み用CSV。
export type PendingImport = {
  accountName: string;
  sharedAt: number;
  // 共有したときのPayPayの取引履歴。以前の形式で保存された保存待ちではnull。
  payPayFingerprint: string | null;
  transactions: ChunkTransaction[];
};

type SerializedCurrentWork = {
  payPayFingerprint: string;
  savedCounts: [string, number][];
};

type SerializedLocalExclusionState = {
  localImportedCounts: [string, number][];
  pendingImport?: PendingImport | null;
  currentWork?: SerializedCurrentWork | null;
  hasNoMfmeHistory?: boolean;
  updatedAt: number | null;
};

export const createEmptyLocalExclusionState = (): LocalExclusionState => ({
  localImportedCounts: new Map(),
  pendingImport: null,
  currentWork: null,
  hasNoMfmeHistory: false,
  updatedAt: null,
});

const isBrowser = (): boolean => {
  try {
    return (
      typeof window !== "undefined" &&
      typeof window.localStorage !== "undefined"
    );
  } catch {
    return false;
  }
};

const normalizeCountEntries = (entries: unknown): [string, number][] => {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries.flatMap((entry): [string, number][] => {
    if (!Array.isArray(entry) || entry.length !== 2) {
      return [];
    }

    const [key, count] = entry;
    if (
      typeof key !== "string" ||
      typeof count !== "number" ||
      !Number.isFinite(count) ||
      count <= 0
    ) {
      return [];
    }

    return [[key, count]];
  });
};

const isChunkTransaction = (value: unknown): value is ChunkTransaction => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const { key, date, content, amount } = value as Partial<ChunkTransaction>;
  return (
    typeof key === "string" &&
    typeof date === "string" &&
    typeof content === "string" &&
    typeof amount === "number" &&
    Number.isSafeInteger(amount)
  );
};

const normalizePendingImport = (value: unknown): PendingImport | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const { accountName, sharedAt, payPayFingerprint, transactions } =
    value as Partial<PendingImport>;
  if (
    typeof accountName !== "string" ||
    accountName.length === 0 ||
    typeof sharedAt !== "number" ||
    !Number.isFinite(sharedAt) ||
    !Array.isArray(transactions) ||
    transactions.length === 0 ||
    !transactions.every(isChunkTransaction)
  ) {
    return null;
  }

  return {
    accountName,
    sharedAt,
    payPayFingerprint:
      typeof payPayFingerprint === "string" && payPayFingerprint.length > 0
        ? payPayFingerprint
        : null,
    // 以前の形式に含まれる口座残高の増減額などは引き継がない。
    transactions: transactions.map(({ key, date, content, amount }) => ({
      key,
      date,
      content,
      amount,
    })),
  };
};

const normalizeCurrentWork = (
  value: unknown,
  importedCounts: ReadonlyMap<string, number>,
): CurrentWork | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const { payPayFingerprint, savedCounts } =
    value as Partial<SerializedCurrentWork>;
  if (typeof payPayFingerprint !== "string" || payPayFingerprint.length === 0) {
    return null;
  }

  // 保存状況は取り込み記録の一部なので、記録にない件数は持たない。
  const clippedCounts = clipCounts(
    new Map(normalizeCountEntries(savedCounts)),
    importedCounts,
  );
  return clippedCounts.size > 0
    ? { payPayFingerprint, savedCounts: clippedCounts }
    : null;
};

export const createCountsFromKeys = (
  keys: readonly string[],
): Map<string, number> => {
  const counts = new Map<string, number>();

  for (const key of keys) {
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
};

export const addCounts = (
  currentCounts: ReadonlyMap<string, number>,
  countsToAdd: ReadonlyMap<string, number>,
): Map<string, number> => {
  const combinedCounts = new Map(currentCounts);

  for (const [key, count] of countsToAdd) {
    combinedCounts.set(key, (combinedCounts.get(key) ?? 0) + count);
  }

  return combinedCounts;
};

export const subtractCounts = (
  currentCounts: ReadonlyMap<string, number>,
  countsToSubtract: ReadonlyMap<string, number>,
): Map<string, number> => {
  const remainingCounts = new Map<string, number>();

  for (const [key, count] of currentCounts) {
    const remaining = count - (countsToSubtract.get(key) ?? 0);
    if (remaining > 0) remainingCounts.set(key, remaining);
  }

  return remainingCounts;
};

export const clipCounts = (
  counts: ReadonlyMap<string, number>,
  limits: ReadonlyMap<string, number>,
): Map<string, number> => {
  const clippedCounts = new Map<string, number>();

  for (const [key, count] of counts) {
    const clipped = Math.min(count, limits.get(key) ?? 0);
    if (clipped > 0) clippedCounts.set(key, clipped);
  }

  return clippedCounts;
};

export const countExclusions = (
  counts: ReadonlyMap<string, number>,
): number => {
  let total = 0;

  for (const count of counts.values()) {
    total += count;
  }

  return total;
};

export const createStatsFromTransactionCounts = (
  counts: ReadonlyMap<string, number>,
): FileStats => {
  let count = 0;
  let startDate: Date | null = null;
  let endDate: Date | null = null;

  for (const [key, entryCount] of counts) {
    count += entryCount;
    const separatorIndex = key.indexOf("_");
    const date = parseDate(
      separatorIndex >= 0 ? key.slice(0, separatorIndex) : undefined,
    );
    if (date) {
      [startDate, endDate] = updateDateRange(date, startDate, endDate);
    }
  }

  return { count, startDate, endDate };
};

// 今のPayPayの取引履歴で保存した明細。別のファイルの保存状況は使わない。
export const getSavedCountsForFile = (
  state: LocalExclusionState,
  payPayFingerprint: string | null,
): ReadonlyMap<string, number> =>
  payPayFingerprint !== null &&
  state.currentWork?.payPayFingerprint === payPayFingerprint
    ? state.currentWork.savedCounts
    : new Map();

// 作成対象から除外する、今のPayPayの取引履歴より前に保存した明細。
// 今のファイルで保存した明細を含めないことで、保存してもチャンクの区切りが変わらない。
export const createBaselineCounts = (
  state: LocalExclusionState,
  payPayFingerprint: string | null,
): Map<string, number> =>
  subtractCounts(
    state.localImportedCounts,
    getSavedCountsForFile(state, payPayFingerprint),
  );

export const applyConfirmedImport = (
  state: LocalExclusionState,
  now: number,
): LocalExclusionState => {
  const { pendingImport } = state;
  if (!pendingImport) return state;

  const savedCounts = createCountsFromKeys(
    pendingImport.transactions.map(({ key }) => key),
  );
  const { payPayFingerprint } = pendingImport;
  const currentWork =
    payPayFingerprint === null
      ? state.currentWork
      : {
          payPayFingerprint,
          savedCounts: addCounts(
            getSavedCountsForFile(state, payPayFingerprint),
            savedCounts,
          ),
        };

  return {
    ...state,
    localImportedCounts: addCounts(state.localImportedCounts, savedCounts),
    pendingImport: null,
    currentWork,
    updatedAt: now,
  };
};

// 保存待ちはMoneyForward MEの入出金履歴からは確定できないため、記録と保存状況だけをリセットする。
export const resetImportedRecords = (
  state: LocalExclusionState,
  now: number,
): LocalExclusionState => ({
  ...state,
  localImportedCounts: new Map(),
  currentWork: null,
  updatedAt: now,
});

// 別のPayPayの取引履歴に替えたら、前のファイルの保存状況は使わない（記録には残る）。
export const forgetOtherFileWork = (
  state: LocalExclusionState,
  payPayFingerprint: string | null,
  now: number,
): LocalExclusionState =>
  state.currentWork === null ||
  state.currentWork.payPayFingerprint === payPayFingerprint
    ? state
    : { ...state, currentWork: null, updatedAt: now };

export const loadLocalExclusionState = (): LocalExclusionState => {
  if (!isBrowser()) {
    return createEmptyLocalExclusionState();
  }

  let rawValue: string | null;
  try {
    rawValue = window.localStorage.getItem(STORE_KEY);
  } catch {
    return createEmptyLocalExclusionState();
  }
  if (!rawValue) {
    return createEmptyLocalExclusionState();
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<
      SerializedLocalExclusionState & { accountBalances: unknown }
    >;
    const localImportedCounts = new Map(
      normalizeCountEntries(parsed.localImportedCounts),
    );
    const state: LocalExclusionState = {
      localImportedCounts,
      pendingImport: normalizePendingImport(parsed.pendingImport),
      currentWork: normalizeCurrentWork(
        parsed.currentWork,
        localImportedCounts,
      ),
      hasNoMfmeHistory: parsed.hasNoMfmeHistory === true,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : null,
    };
    // 廃止した口座残高などが残っていれば、読み込んだ値だけで保存し直す。
    if (
      "accountBalances" in parsed ||
      (typeof parsed.pendingImport === "object" &&
        parsed.pendingImport !== null &&
        "balanceDelta" in parsed.pendingImport)
    ) {
      persistLocalExclusionState(state);
    }
    return state;
  } catch {
    return createEmptyLocalExclusionState();
  }
};

export const saveLocalExclusionState = (state: LocalExclusionState): void => {
  if (!isBrowser()) {
    return;
  }

  const serializedState: SerializedLocalExclusionState = {
    localImportedCounts: [...state.localImportedCounts],
    pendingImport: state.pendingImport,
    currentWork: state.currentWork && {
      payPayFingerprint: state.currentWork.payPayFingerprint,
      savedCounts: [...state.currentWork.savedCounts],
    },
    hasNoMfmeHistory: state.hasNoMfmeHistory,
    updatedAt: state.updatedAt,
  };

  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(serializedState));
  } catch (error) {
    console.warn("Failed to persist local exclusion state:", error);
  }
};

const clearLocalExclusionState = (): void => {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.removeItem(STORE_KEY);
  } catch (error) {
    console.warn("Failed to clear local exclusion state:", error);
  }
};

// 記録・保存待ち・手順2の回答のどれも残っていなければ、保存値ごと削除する。
export const persistLocalExclusionState = (
  state: LocalExclusionState,
): void => {
  if (
    state.localImportedCounts.size === 0 &&
    state.pendingImport === null &&
    state.currentWork === null &&
    !state.hasNoMfmeHistory
  ) {
    clearLocalExclusionState();
  } else {
    saveLocalExclusionState(state);
  }
};
