import {
  type CsvRecord,
  createBaseMatchKey,
  MFME_COLUMNS,
  normalizeAmount,
} from "./csv-schema";
import type { PayPayTransaction } from "./paypay-csv";

export type DeletionCandidateReason = "wrong-account" | "duplicate";

export type DeletionCandidate = {
  key: string;
  reason: DeletionCandidateReason;
  date: string;
  amount: string;
  content: string;
  expectedInstitution: string;
  actualInstitution: string;
};

export type ReconciliationResult = {
  groupedTransactions: Record<string, PayPayTransaction[]>;
  mfmeDuplicates: number;
  importedDuplicates: number;
  candidates: DeletionCandidate[];
};

const groupRemainingTransactions = (
  transactions: readonly PayPayTransaction[],
  exclusionCounts: ReadonlyMap<string, number>,
): {
  groupedTransactions: Record<string, PayPayTransaction[]>;
  duplicates: number;
} => {
  let duplicates = 0;
  const groupedTransactions: Record<string, PayPayTransaction[]> = {};
  const remainingExclusionCounts = new Map(exclusionCounts);

  for (const transaction of transactions) {
    const remainingCount = remainingExclusionCounts.get(transaction.key) ?? 0;
    if (remainingCount > 0) {
      duplicates++;
      if (remainingCount === 1) {
        remainingExclusionCounts.delete(transaction.key);
      } else {
        remainingExclusionCounts.set(transaction.key, remainingCount - 1);
      }
      continue;
    }

    const matchingTransactions =
      groupedTransactions[transaction.paymentMethod] ?? [];
    matchingTransactions.push(transaction);
    groupedTransactions[transaction.paymentMethod] = matchingTransactions;
  }

  return { groupedTransactions, duplicates };
};

const createMfmeCandidateKey = (
  record: CsvRecord,
  fallbackIndex: number,
): string =>
  record[MFME_COLUMNS.id] ??
  `${record[MFME_COLUMNS.date] ?? ""}_${record[MFME_COLUMNS.amount] ?? ""}_${record[MFME_COLUMNS.institution] ?? ""}_${record[MFME_COLUMNS.content] ?? ""}_${fallbackIndex}`;

const findMfmeDeletionCandidates = (
  transactions: readonly PayPayTransaction[],
  mfmeRecords: readonly CsvRecord[],
): DeletionCandidate[] => {
  const transactionsByBaseKey = new Map<string, PayPayTransaction[]>();
  const mfmeRecordsByBaseKey = new Map<string, CsvRecord[]>();

  for (const transaction of transactions) {
    const key = createBaseMatchKey(
      transaction.dateKey,
      transaction.amountKey,
      transaction.contentKey,
    );
    const matchingTransactions = transactionsByBaseKey.get(key) ?? [];
    matchingTransactions.push(transaction);
    transactionsByBaseKey.set(key, matchingTransactions);
  }

  for (const record of mfmeRecords) {
    const key = createBaseMatchKey(
      record[MFME_COLUMNS.date],
      record[MFME_COLUMNS.amount],
      record[MFME_COLUMNS.content],
    );
    const matchingRecords = mfmeRecordsByBaseKey.get(key) ?? [];
    matchingRecords.push(record);
    mfmeRecordsByBaseKey.set(key, matchingRecords);
  }

  const candidates: DeletionCandidate[] = [];

  for (const [baseKey, matchingTransactions] of transactionsByBaseKey) {
    const matchingRecords = mfmeRecordsByBaseKey.get(baseKey);
    if (!matchingRecords) continue;

    const expectedCounts = new Map<string, number>();
    for (const transaction of matchingTransactions) {
      expectedCounts.set(
        transaction.paymentMethod,
        (expectedCounts.get(transaction.paymentMethod) ?? 0) + 1,
      );
    }

    const matchedCounts = new Map<string, number>();
    const unmatchedRecords: Array<{ record: CsvRecord; index: number }> = [];

    matchingRecords.forEach((record, index) => {
      const actualInstitution = record[MFME_COLUMNS.institution] ?? "";
      const expectedCount = expectedCounts.get(actualInstitution) ?? 0;
      const matchedCount = matchedCounts.get(actualInstitution) ?? 0;

      if (matchedCount < expectedCount) {
        matchedCounts.set(actualInstitution, matchedCount + 1);
      } else {
        unmatchedRecords.push({ record, index });
      }
    });

    const missingInstitutions = [...expectedCounts].flatMap(
      ([institution, expectedCount]) =>
        Array.from(
          {
            length: expectedCount - (matchedCounts.get(institution) ?? 0),
          },
          () => institution,
        ),
    );

    unmatchedRecords.forEach(({ record, index }, unmatchedIndex) => {
      const expectedInstitution = missingInstitutions[unmatchedIndex];
      candidates.push({
        key: createMfmeCandidateKey(record, index),
        reason:
          expectedInstitution === undefined ? "duplicate" : "wrong-account",
        date: record[MFME_COLUMNS.date] ?? "",
        amount: normalizeAmount(record[MFME_COLUMNS.amount]),
        content: record[MFME_COLUMNS.content] ?? "",
        expectedInstitution:
          expectedInstitution ?? record[MFME_COLUMNS.institution] ?? "",
        actualInstitution: record[MFME_COLUMNS.institution] ?? "",
      });
    });
  }

  return candidates;
};

export function reconcileTransactions(
  transactions: readonly PayPayTransaction[],
  mfmeCounts: ReadonlyMap<string, number>,
  mfmeRecords: readonly CsvRecord[],
  importedCounts: ReadonlyMap<string, number>,
): ReconciliationResult {
  const mfmeResult = groupRemainingTransactions(transactions, mfmeCounts);
  const transactionsAfterMfme = Object.values(
    mfmeResult.groupedTransactions,
  ).flat();
  const importedResult = groupRemainingTransactions(
    transactionsAfterMfme,
    importedCounts,
  );

  return {
    groupedTransactions: importedResult.groupedTransactions,
    mfmeDuplicates: mfmeResult.duplicates,
    importedDuplicates: importedResult.duplicates,
    candidates: findMfmeDeletionCandidates(transactions, mfmeRecords),
  };
}
