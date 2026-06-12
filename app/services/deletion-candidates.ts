import { stringify } from "csv-stringify/browser/esm/sync";
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
  const mfmeRecordsByBaseKey = new Map<string, CsvRecord[]>();

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

  const candidates = new Map<string, DeletionCandidate>();

  for (const transaction of transactions) {
    const matches = mfmeRecordsByBaseKey.get(
      createBaseMatchKey(
        transaction.dateKey,
        transaction.amountKey,
        transaction.contentKey,
      ),
    );

    if (!matches) {
      continue;
    }

    const expectedMatches = matches.filter(
      (record) =>
        record[MFME_COLUMNS.institution] === transaction.paymentMethod,
    );
    const duplicateExpectedRecords = new Set(expectedMatches.slice(1));

    matches.forEach((record, index) => {
      const actualInstitution = record[MFME_COLUMNS.institution] ?? "";
      const candidateKey = createMfmeCandidateKey(record, index);
      const isWrongAccount = actualInstitution !== transaction.paymentMethod;
      const isDuplicate = duplicateExpectedRecords.has(record);

      if (!isWrongAccount && !isDuplicate) {
        return;
      }

      candidates.set(candidateKey, {
        key: candidateKey,
        reason: isWrongAccount ? "wrong-account" : "duplicate",
        date: record[MFME_COLUMNS.date] ?? "",
        amount: normalizeAmount(record[MFME_COLUMNS.amount]),
        content: record[MFME_COLUMNS.content] ?? "",
        expectedInstitution: transaction.paymentMethod,
        actualInstitution,
        category: record[MFME_COLUMNS.category] ?? "",
        subCategory: record[MFME_COLUMNS.subCategory] ?? "",
        memo: record[MFME_COLUMNS.memo] ?? "",
        id: record[MFME_COLUMNS.id] ?? "",
      });
    });
  }

  return [...candidates.values()];
}

export function createDeletionCandidatesCsv(
  candidates: DeletionCandidate[],
): string {
  const rows = candidates.map((candidate) => ({
    削除候補理由:
      candidate.reason === "wrong-account" ? "別口座取り込み" : "重複取り込み",
    日付: candidate.date,
    内容: candidate.content,
    金額: candidate.amount,
    期待される口座: candidate.expectedInstitution,
    実際の口座: candidate.actualInstitution,
    大項目: candidate.category,
    中項目: candidate.subCategory,
    メモ: candidate.memo,
    MFME_ID: candidate.id,
  }));

  return stringify(rows, { header: true });
}
