import { describe, expect, it } from "vitest";
import {
  COMBINED_PAYMENT_ROW,
  COMBINED_WITH_COMMA_AMOUNT_ROW,
  createSecondSinglePaymentRow,
  MFME_CSV_HEADER,
  PAYPAY_CSV_HEADER,
  SINGLE_PAYMENT_ROW,
  VISA_PAYMENT_ROW,
} from "./csv-test-fixtures";
import { createMfmeExclusionSet } from "./mfme-csv";
import {
  createChunksFromGroupedTransactions,
  extractTransactionsFromPayPayCsv,
  filterTransactionsBySources,
} from "./paypay-csv";

const groupWithoutExclusions = (
  transactions: ReturnType<
    typeof extractTransactionsFromPayPayCsv
  >["transactions"],
) =>
  filterTransactionsBySources(transactions, new Map(), new Map())
    .groupedTransactions;

describe("extractTransactionsFromPayPayCsv", () => {
  it("単一支払いのレコードを正しく抽出できること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}`;
    const { transactions, stats, headers } =
      extractTransactionsFromPayPayCsv(csvContent);

    expect(transactions).toHaveLength(1);
    expect(transactions[0]?.paymentMethod).toBe("PayPay残高");
    expect(transactions[0]?.record["出金金額（円）"]).toBe("190");
    expect(stats.count).toBe(1);
    expect(headers).toContain("取引日");
  });

  it("PayPay以外の支払い方法を対象外にすること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}\n${VISA_PAYMENT_ROW}`;
    const { transactions, stats } =
      extractTransactionsFromPayPayCsv(csvContent);

    expect(transactions).toHaveLength(1);
    expect(transactions[0]?.paymentMethod).toBe("PayPay残高");
    expect(stats.count).toBe(2);
  });

  it("併用払いのレコードを2つのトランザクションに分割できること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${COMBINED_PAYMENT_ROW}`;
    const { transactions } = extractTransactionsFromPayPayCsv(csvContent);

    expect(transactions).toHaveLength(2);

    const pointTransaction = transactions.find(
      (transaction) => transaction.paymentMethod === "PayPayポイント",
    );
    expect(pointTransaction).toBeDefined();
    expect(pointTransaction?.record["出金金額（円）"]).toBe("93");

    const balanceTransaction = transactions.find(
      (transaction) => transaction.paymentMethod === "PayPay残高",
    );
    expect(balanceTransaction).toBeDefined();
    expect(balanceTransaction?.record["出金金額（円）"]).toBe("317");
  });

  it("金額にカンマが含まれる併用払いを正しく処理できること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${COMBINED_WITH_COMMA_AMOUNT_ROW}`;
    const { transactions } = extractTransactionsFromPayPayCsv(csvContent);

    const pointTransaction = transactions.find(
      (transaction) => transaction.paymentMethod === "PayPayポイント",
    );
    expect(pointTransaction?.record["出金金額（円）"]).toBe("1");

    const balanceTransaction = transactions.find(
      (transaction) => transaction.paymentMethod === "PayPay残高",
    );
    expect(balanceTransaction?.record["出金金額（円）"]).toBe("2599");
  });

  it("照合用の引用符を正規化しても元の店舗名を維持すること", () => {
    const merchant = "ダミー＇店舗 - ダミー'店舗";
    const row = `2025/10/24 10:59:25,190,-,-,-,-,-,支払い,${merchant},PayPay残高,-,-,00000000000000000005`;
    const { transactions, headers } = extractTransactionsFromPayPayCsv(
      `${PAYPAY_CSV_HEADER}\n${row}`,
    );
    const { groupedTransactions } = filterTransactionsBySources(
      transactions,
      new Map(),
      new Map(),
    );
    const chunks = createChunksFromGroupedTransactions(
      groupedTransactions,
      headers,
    );

    expect(transactions[0]?.key).toBe(
      "2025/10/24_-190_PayPay残高_ダミー'店舗 - ダミー'店舗",
    );
    expect(chunks["PayPay残高"]?.[0]?.data).toContain(merchant);
  });

  it("統計情報を正しく計算できること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}\n${COMBINED_PAYMENT_ROW}`;
    const { stats } = extractTransactionsFromPayPayCsv(csvContent);

    expect(stats.count).toBe(2);
    expect(stats.startDate?.toISOString()).toBe("2025-09-29T05:54:12.000Z");
    expect(stats.endDate?.toISOString()).toBe("2025-10-24T01:59:25.000Z");
  });

  it("空のCSVの場合に空の配列を返すこと", () => {
    const { transactions, stats } = extractTransactionsFromPayPayCsv("");

    expect(transactions).toEqual([]);
    expect(stats.count).toBe(0);
  });
});

describe("filterTransactionsBySources", () => {
  it("除外キーに一致するトランザクションをフィルタリングできること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}\n${VISA_PAYMENT_ROW}`;
    const { transactions } = extractTransactionsFromPayPayCsv(csvContent);
    const exclusionCounts = new Map([
      ["2025/10/24_-190_PayPay残高_ダミーストアA", 1],
    ]);

    const { groupedTransactions, mfmeDuplicates } = filterTransactionsBySources(
      transactions,
      exclusionCounts,
      new Map(),
    );

    expect(mfmeDuplicates).toBe(1);
    expect(groupedTransactions["PayPay残高"]).toBeUndefined();
    expect(groupedTransactions["VISA 1234"]).toBeUndefined();
  });

  it("併用払いの片方のみを除外できること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${COMBINED_PAYMENT_ROW}`;
    const { transactions } = extractTransactionsFromPayPayCsv(csvContent);
    const exclusionCounts = new Map([
      ["2025/09/29_-317_PayPay残高_ダミーストアB", 1],
    ]);

    const { groupedTransactions, mfmeDuplicates } = filterTransactionsBySources(
      transactions,
      exclusionCounts,
      new Map(),
    );

    expect(mfmeDuplicates).toBe(1);
    expect(groupedTransactions["PayPayポイント"]).toHaveLength(1);
    expect(groupedTransactions["PayPay残高"]).toBeUndefined();
  });

  it("除外キーが空の場合にすべてのトランザクションを通過させること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}\n${VISA_PAYMENT_ROW}`;
    const { transactions } = extractTransactionsFromPayPayCsv(csvContent);

    const { groupedTransactions, mfmeDuplicates } = filterTransactionsBySources(
      transactions,
      new Map(),
      new Map(),
    );

    expect(mfmeDuplicates).toBe(0);
    expect(groupedTransactions["PayPay残高"]).toHaveLength(1);
    expect(groupedTransactions["VISA 1234"]).toBeUndefined();
  });

  it("支払い方法ごとにグループ化できること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}\n${COMBINED_PAYMENT_ROW}`;
    const { transactions } = extractTransactionsFromPayPayCsv(csvContent);

    const { groupedTransactions } = filterTransactionsBySources(
      transactions,
      new Map(),
      new Map(),
    );

    expect(groupedTransactions["PayPay残高"]).toHaveLength(2);
    expect(groupedTransactions["PayPayポイント"]).toHaveLength(1);
  });

  it("同じキーのPayPay取引をMoneyForward MEの件数分だけ除外すること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}\n${createSecondSinglePaymentRow()}`;
    const { transactions } = extractTransactionsFromPayPayCsv(csvContent);
    const exclusionCounts = new Map([
      ["2025/10/24_-190_PayPay残高_ダミーストアA", 1],
    ]);

    const { groupedTransactions, mfmeDuplicates } = filterTransactionsBySources(
      transactions,
      exclusionCounts,
      new Map(),
    );

    expect(mfmeDuplicates).toBe(1);
    expect(groupedTransactions["PayPay残高"]).toHaveLength(1);
  });
});

describe("filterTransactionsBySources by sources", () => {
  it("MFME CSVと前回の取り込み記録ごとの除外件数を集計すること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}\n${createSecondSinglePaymentRow()}\n${VISA_PAYMENT_ROW}`;
    const { transactions } = extractTransactionsFromPayPayCsv(csvContent);
    const result = filterTransactionsBySources(
      transactions,
      new Map([["2025/10/24_-190_PayPay残高_ダミーストアA", 1]]),
      new Map([["2025/10/24_-190_PayPay残高_ダミーストアA", 1]]),
    );

    expect(result.mfmeDuplicates).toBe(1);
    expect(result.importedDuplicates).toBe(1);
    expect(result.groupedTransactions["VISA 1234"]).toBeUndefined();
  });

  it("引用符の表記ゆれがあるMFME明細を除外すること", () => {
    const payPayRow = SINGLE_PAYMENT_ROW.replace(
      "ダミーストアA",
      "ダミー＇店舗 - ダミー'店舗",
    );
    const { transactions } = extractTransactionsFromPayPayCsv(
      `${PAYPAY_CSV_HEADER}\n${payPayRow}`,
    );
    const { exclusionCounts } = createMfmeExclusionSet([
      `${MFME_CSV_HEADER}\n1,2025/10/24,ダミー＇店舗 - ダミー’店舗,-190,PayPay残高,食費,食費,メモ,,id01`,
    ]);

    const result = filterTransactionsBySources(
      transactions,
      exclusionCounts,
      new Map(),
    );

    expect(result.mfmeDuplicates).toBe(1);
    expect(result.groupedTransactions["PayPay残高"]).toBeUndefined();
  });
});

describe("createChunksFromGroupedTransactions", () => {
  it("100件ごとにレコードをチャンキングできること", () => {
    const rows = Array.from({ length: 105 }, (_, index) => {
      const uniqueId = `00000000000000000${String(index).padStart(4, "0")}`;
      return `2025/10/24 10:59:25,190,-,-,-,-,-,支払い,ダミーストアA,PayPay残高,-,-,${uniqueId}`;
    });
    const csvContent = `${PAYPAY_CSV_HEADER}\n${rows.join("\n")}`;
    const { transactions, headers } =
      extractTransactionsFromPayPayCsv(csvContent);
    const { groupedTransactions } = filterTransactionsBySources(
      transactions,
      new Map(),
      new Map(),
    );

    const chunks = createChunksFromGroupedTransactions(
      groupedTransactions,
      headers,
    );

    expect(chunks["PayPay残高"]).toHaveLength(2);
    expect(chunks["PayPay残高"]?.[0]?.count).toBe(100);
    expect(chunks["PayPay残高"]?.[1]?.count).toBe(5);
  });

  it("チャンクの期間を正しく計算できること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}\n${COMBINED_PAYMENT_ROW}`;
    const { transactions, headers } =
      extractTransactionsFromPayPayCsv(csvContent);
    const groupedTransactions = groupWithoutExclusions(transactions);

    const chunks = createChunksFromGroupedTransactions(
      groupedTransactions,
      headers,
    );

    const balanceChunk = chunks["PayPay残高"]?.[0];
    expect(balanceChunk?.startDate?.toISOString()).toBe(
      "2025-09-29T05:54:12.000Z",
    );
    expect(balanceChunk?.endDate?.toISOString()).toBe(
      "2025-10-24T01:59:25.000Z",
    );

    const pointChunk = chunks["PayPayポイント"]?.[0];
    expect(pointChunk?.startDate?.toISOString()).toBe(
      "2025-09-29T05:54:12.000Z",
    );
    expect(pointChunk?.endDate?.toISOString()).toBe("2025-09-29T05:54:12.000Z");
  });

  it("CSV文字列を正しく生成できること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}`;
    const { transactions, headers } =
      extractTransactionsFromPayPayCsv(csvContent);
    const groupedTransactions = groupWithoutExclusions(transactions);

    const chunks = createChunksFromGroupedTransactions(
      groupedTransactions,
      headers,
    );
    const data = chunks["PayPay残高"]?.[0]?.data;

    expect(data).toContain("PayPay残高");
    expect(data).toContain("00000000000000000001");
  });

  it("トランザクションから作ったチャンクに除外保存用の取引キーを保持すること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}`;
    const { transactions, headers } =
      extractTransactionsFromPayPayCsv(csvContent);
    const groupedTransactions = groupWithoutExclusions(transactions);

    const chunks = createChunksFromGroupedTransactions(
      groupedTransactions,
      headers,
    );

    expect(chunks["PayPay残高"]?.[0]?.transactionKeys).toEqual([
      "2025/10/24_-190_PayPay残高_ダミーストアA",
    ]);
  });

  it("支出・入金・併用払いから口座別の残高増減を計算すること", () => {
    const incomeRow =
      "2025/10/25 10:00:00,-,500,-,-,-,-,受取,ダミー送金元,PayPay残高,-,-,00000000000000000005";
    const csvContent = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}\n${COMBINED_PAYMENT_ROW}\n${incomeRow}`;
    const { transactions, headers } =
      extractTransactionsFromPayPayCsv(csvContent);
    const groupedTransactions = groupWithoutExclusions(transactions);

    const chunks = createChunksFromGroupedTransactions(
      groupedTransactions,
      headers,
    );

    expect(chunks["PayPay残高"]?.[0]?.balanceDelta).toBe(-7);
    expect(chunks["PayPayポイント"]?.[0]?.balanceDelta).toBe(-93);
  });

  it("空のgroupedTransactionsの場合に空のオブジェクトを返すこと", () => {
    const chunks = createChunksFromGroupedTransactions({}, []);
    expect(Object.keys(chunks)).toHaveLength(0);
  });
});
