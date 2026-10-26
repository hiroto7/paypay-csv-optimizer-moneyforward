import {
  type CsvRecord,
  createBaseMatchKey,
  createTransactionKey,
  MFME_COLUMNS,
  normalizeAmount,
} from "./csv-schema";
import type { PayPayTransaction } from "./paypay-csv";

export type MfmeReviewCandidate = {
  key: string;
  date: string;
  amount: string;
  content: string;
  actualInstitution: string;
};

type IndexedRecord = {
  record: CsvRecord;
  index: number;
};

type RecordBucket = {
  records: IndexedRecord[];
  consumed: number;
};

const createMfmeCandidateKey = (
  record: CsvRecord,
  fallbackIndex: number,
): string =>
  record[MFME_COLUMNS.id] ||
  `${record[MFME_COLUMNS.date] ?? ""}_${record[MFME_COLUMNS.amount] ?? ""}_${record[MFME_COLUMNS.institution] ?? ""}_${record[MFME_COLUMNS.content] ?? ""}_${fallbackIndex}`;

const createMfmeRecordKey = (record: CsvRecord): string =>
  createTransactionKey(
    record[MFME_COLUMNS.date],
    record[MFME_COLUMNS.amount],
    record[MFME_COLUMNS.institution],
    record[MFME_COLUMNS.content],
  );

// 取り込み記録のうち、MoneyForward MEの入出金履歴に同じ明細がある件数と、ない件数を数える。
export const countRecordsCoveredByMfme = (
  importedCounts: ReadonlyMap<string, number>,
  mfmeRecords: readonly CsvRecord[],
): { covered: number; uncoveredCounts: Map<string, number> } => {
  const mfmeCounts = new Map<string, number>();
  for (const record of mfmeRecords) {
    const key = createMfmeRecordKey(record);
    mfmeCounts.set(key, (mfmeCounts.get(key) ?? 0) + 1);
  }

  let covered = 0;
  const uncoveredCounts = new Map<string, number>();
  for (const [key, count] of importedCounts) {
    const coveredCount = Math.min(count, mfmeCounts.get(key) ?? 0);
    covered += coveredCount;
    if (count > coveredCount) uncoveredCounts.set(key, count - coveredCount);
  }

  return { covered, uncoveredCounts };
};

export const reconcileMfmeTransactions = (
  transactions: readonly PayPayTransaction[],
  mfmeRecords: readonly CsvRecord[],
): {
  remainingTransactions: PayPayTransaction[];
  matchedCount: number;
  candidates: MfmeReviewCandidate[];
} => {
  const payPayBaseKeys = new Set(
    transactions.map((transaction) =>
      createBaseMatchKey(
        transaction.dateKey,
        transaction.amountKey,
        transaction.contentKey,
      ),
    ),
  );
  const recordsByKey = new Map<string, RecordBucket>();

  mfmeRecords.forEach((record, index) => {
    const key = createMfmeRecordKey(record);
    const bucket = recordsByKey.get(key) ?? { records: [], consumed: 0 };
    bucket.records.push({ record, index });
    recordsByKey.set(key, bucket);
  });

  const remainingTransactions: PayPayTransaction[] = [];
  let matchedCount = 0;

  for (const transaction of transactions) {
    const bucket = recordsByKey.get(transaction.key);
    if (bucket && bucket.consumed < bucket.records.length) {
      bucket.consumed++;
      matchedCount++;
    } else {
      remainingTransactions.push(transaction);
    }
  }

  const candidates = [...recordsByKey.values()].flatMap(
    ({ records, consumed }) =>
      records.slice(consumed).flatMap(({ record, index }) => {
        const baseKey = createBaseMatchKey(
          record[MFME_COLUMNS.date],
          record[MFME_COLUMNS.amount],
          record[MFME_COLUMNS.content],
        );
        if (!payPayBaseKeys.has(baseKey)) return [];

        return [
          {
            key: createMfmeCandidateKey(record, index),
            date: record[MFME_COLUMNS.date] ?? "",
            amount: normalizeAmount(record[MFME_COLUMNS.amount]),
            content: record[MFME_COLUMNS.content] ?? "",
            actualInstitution: record[MFME_COLUMNS.institution] ?? "",
          },
        ];
      }),
  );

  return { remainingTransactions, matchedCount, candidates };
};
