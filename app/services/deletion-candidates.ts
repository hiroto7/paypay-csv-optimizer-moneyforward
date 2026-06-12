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
  category: string;
  subCategory: string;
  memo: string;
  id: string;
};

const createMfmeCandidateKey = (
  record: CsvRecord,
  fallbackIndex: number,
): string =>
  record[MFME_COLUMNS.id] ??
  `${record[MFME_COLUMNS.date] ?? ""}_${record[MFME_COLUMNS.amount] ?? ""}_${record[MFME_COLUMNS.institution] ?? ""}_${record[MFME_COLUMNS.content] ?? ""}_${fallbackIndex}`;

export function findMfmeDeletionCandidates(
  transactions: PayPayTransaction[],
  mfmeRecords: CsvRecord[],
): DeletionCandidate[] {
  const transactionsByBaseKey = new Map<string, PayPayTransaction[]>();
  const mfmeRecordsByBaseKey = new Map<string, CsvRecord[]>();

  for (const transaction of transactions) {
    const key = createBaseMatchKey(
      transaction.dateKey,
      transaction.amountKey,
      transaction.contentKey,
    );
    const existingTransactions = transactionsByBaseKey.get(key);
    if (existingTransactions) {
      existingTransactions.push(transaction);
    } else {
      transactionsByBaseKey.set(key, [transaction]);
    }
  }

  for (const record of mfmeRecords) {
    if (record[MFME_COLUMNS.included] === "0") {
      continue;
    }

    const key = createBaseMatchKey(
      record[MFME_COLUMNS.date],
      record[MFME_COLUMNS.amount],
      record[MFME_COLUMNS.content],
    );
    const existingRecords = mfmeRecordsByBaseKey.get(key);
    if (existingRecords) {
      existingRecords.push(record);
    } else {
      mfmeRecordsByBaseKey.set(key, [record]);
    }
  }

  const candidates: DeletionCandidate[] = [];

  for (const [baseKey, matchingTransactions] of transactionsByBaseKey) {
    const matchingRecords = mfmeRecordsByBaseKey.get(baseKey);
    if (!matchingRecords) {
      continue;
    }

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
        return;
      }

      unmatchedRecords.push({ record, index });
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
      const reason: DeletionCandidateReason =
        expectedInstitution === undefined ? "duplicate" : "wrong-account";

      candidates.push({
        key: createMfmeCandidateKey(record, index),
        reason,
        date: record[MFME_COLUMNS.date] ?? "",
        amount: normalizeAmount(record[MFME_COLUMNS.amount]),
        content: record[MFME_COLUMNS.content] ?? "",
        expectedInstitution:
          expectedInstitution ?? record[MFME_COLUMNS.institution] ?? "",
        actualInstitution: record[MFME_COLUMNS.institution] ?? "",
        category: record[MFME_COLUMNS.category] ?? "",
        subCategory: record[MFME_COLUMNS.subCategory] ?? "",
        memo: record[MFME_COLUMNS.memo] ?? "",
        id: record[MFME_COLUMNS.id] ?? "",
      });
    });
  }

  return candidates;
}
