import { type FileStats, parseDate, updateDateRange } from "./csv-date";

const STORE_KEY = "paypay-csv-optimizer:local-exclusion-state:v1";

export type LocalExclusionState = {
  localImportedCounts: Map<string, number>;
  accountBalances: Map<string, AccountBalance>;
  updatedAt: number | null;
};

export type AccountBalance = {
  amount: number;
  updatedAt: number;
};

type SerializedLocalExclusionState = {
  localImportedCounts: [string, number][];
  accountBalances?: [string, AccountBalance][];
  updatedAt: number | null;
};

export const createEmptyLocalExclusionState = (): LocalExclusionState => ({
  localImportedCounts: new Map(),
  accountBalances: new Map(),
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

const normalizeAccountBalanceEntries = (
  entries: unknown,
): [string, AccountBalance][] => {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries.flatMap((entry): [string, AccountBalance][] => {
    if (!Array.isArray(entry) || entry.length !== 2) {
      return [];
    }

    const [name, balance] = entry;
    if (
      typeof name !== "string" ||
      name.length === 0 ||
      typeof balance !== "object" ||
      balance === null
    ) {
      return [];
    }

    const { amount, updatedAt } = balance as Partial<AccountBalance>;
    if (
      typeof amount !== "number" ||
      !Number.isSafeInteger(amount) ||
      typeof updatedAt !== "number" ||
      !Number.isFinite(updatedAt)
    ) {
      return [];
    }

    return [[name, { amount, updatedAt }]];
  });
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
    const parsed = JSON.parse(
      rawValue,
    ) as Partial<SerializedLocalExclusionState>;
    return {
      localImportedCounts: new Map(
        normalizeCountEntries(parsed.localImportedCounts),
      ),
      accountBalances: new Map(
        normalizeAccountBalanceEntries(parsed.accountBalances),
      ),
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : null,
    };
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
    accountBalances: [...state.accountBalances],
    updatedAt: state.updatedAt,
  };

  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(serializedState));
  } catch (error) {
    console.warn("Failed to persist local exclusion state:", error);
  }
};

export const clearLocalExclusionState = (): void => {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.removeItem(STORE_KEY);
  } catch (error) {
    console.warn("Failed to clear local exclusion state:", error);
  }
};
