import { describe, expect, it } from "vitest";
import { PAYPAY_CSV_HEADER, SINGLE_PAYMENT_ROW } from "./csv-test-fixtures";
import { markSavedChunks } from "./import-progress";
import { createCountsFromKeys } from "./local-exclusion-store";
import {
  createChunksFromGroupedTransactions,
  extractTransactionsFromPayPayCsv,
  filterTransactionsBySources,
  type ProcessedResult,
} from "./paypay-csv";

const createRow = (day: number, amount: number, merchant: string) =>
  `2025/10/${String(day).padStart(2, "0")} 10:00:00,${amount},-,-,-,-,-,支払い,${merchant},PayPay残高,-,-,${String(day * 1000 + amount).padStart(20, "0")}`;

const createChunks = (rows: readonly string[]): ProcessedResult => {
  const { transactions, headers } = extractTransactionsFromPayPayCsv(
    `${PAYPAY_CSV_HEADER}\n${rows.join("\n")}`,
  );
  return createChunksFromGroupedTransactions(
    filterTransactionsBySources(transactions, [], new Map())
      .groupedTransactions,
    headers,
  );
};

const keysOf = (chunks: ProcessedResult, account: string, index: number) =>
  chunks[account]?.[index]?.transactions.map(({ key }) => key) ?? [];

describe("markSavedChunks", () => {
  it("保存した明細がなければ、どのチャンクも保存済みにしない", () => {
    const progress = markSavedChunks(
      createChunks([SINGLE_PAYMENT_ROW]),
      new Map(),
    );

    expect(progress.accounts).toHaveLength(1);
    expect(progress.accounts[0]?.saved).toBe(false);
    expect(progress.savedAccountCount).toBe(0);
    expect(progress.importedCount).toBe(0);
    expect(progress.isComplete).toBe(false);
  });

  it("257件のうち1番目と3番目のチャンクだけを保存済みにする", () => {
    const rows = Array.from({ length: 257 }, (_, index) =>
      createRow((index % 28) + 1, index + 1, `ダミーストア${index}`),
    );
    const chunks = createChunks(rows);
    const saved = createCountsFromKeys([
      ...keysOf(chunks, "PayPay残高", 0),
      ...keysOf(chunks, "PayPay残高", 2),
    ]);

    const progress = markSavedChunks(chunks, saved);

    expect(progress.accounts[0]?.chunks.map(({ saved }) => saved)).toEqual([
      true,
      false,
      true,
    ]);
    expect(progress.importedCount).toBe(157);
    expect(progress.accounts[0]?.saved).toBe(false);
  });

  it("同じ明細キーがチャンクの境目をまたいでも、後のチャンクだけを保存済みにできる", () => {
    // 100件目と101件目に同じ日付・金額・内容の明細を置く。
    const rows = [
      ...Array.from({ length: 99 }, (_, index) =>
        createRow(1, index + 1, `ダミーストア${index}`),
      ),
      createRow(2, 500, "同じ店"),
      createRow(2, 500, "同じ店"),
      createRow(3, 600, "別の店"),
    ];
    const chunks = createChunks(rows);
    expect(chunks["PayPay残高"]).toHaveLength(2);

    const progress = markSavedChunks(
      chunks,
      createCountsFromKeys(keysOf(chunks, "PayPay残高", 1)),
    );

    expect(progress.accounts[0]?.chunks.map(({ saved }) => saved)).toEqual([
      false,
      true,
    ]);
  });

  it("すべての口座を保存したら完了にする", () => {
    const chunks = createChunks([SINGLE_PAYMENT_ROW]);
    const progress = markSavedChunks(
      chunks,
      createCountsFromKeys(keysOf(chunks, "PayPay残高", 0)),
    );

    expect(progress.savedAccountCount).toBe(1);
    expect(progress.importedCount).toBe(1);
    expect(progress.isComplete).toBe(true);
  });

  it("作成対象がなければ完了にしない", () => {
    expect(markSavedChunks({}, new Map()).isComplete).toBe(false);
  });
});
