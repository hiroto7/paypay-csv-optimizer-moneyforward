import { describe, expect, it } from "vitest";
import {
  COMBINED_PAYMENT_ROW,
  COMBINED_WITH_COMMA_AMOUNT_ROW,
  createSecondSinglePaymentRow,
  PAYPAY_CSV_HEADER,
  SINGLE_PAYMENT_ROW,
  VISA_PAYMENT_ROW,
} from "./csv-test-fixtures";
import {
  createChunksFromGroupedTransactions,
  extractTransactionsFromPayPayCsv,
  filterTransactions,
  filterTransactionsBySources,
} from "./paypay-csv";

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

describe("filterTransactions", () => {
  it("除外キーに一致するトランザクションをフィルタリングできること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}\n${VISA_PAYMENT_ROW}`;
    const { transactions } = extractTransactionsFromPayPayCsv(csvContent);
    const exclusionCounts = new Map([
      ["2025/10/24_-190_PayPay残高_ダミーストアA", 1],
    ]);

    const { groupedTransactions, duplicates } = filterTransactions(
      transactions,
      exclusionCounts,
    );

    expect(duplicates).toBe(1);
    expect(groupedTransactions["PayPay残高"]).toBeUndefined();
    expect(groupedTransactions["VISA 1234"]).toHaveLength(1);
  });

  it("併用払いの片方のみを除外できること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${COMBINED_PAYMENT_ROW}`;
    const { transactions } = extractTransactionsFromPayPayCsv(csvContent);
    const exclusionCounts = new Map([
      ["2025/09/29_-317_PayPay残高_ダミーストアB", 1],
    ]);

    const { groupedTransactions, duplicates } = filterTransactions(
      transactions,
      exclusionCounts,
    );

    expect(duplicates).toBe(1);
    expect(groupedTransactions["PayPayポイント"]).toHaveLength(1);
    expect(groupedTransactions["PayPay残高"]).toBeUndefined();
  });

  it("除外キーが空の場合にすべてのトランザクションを通過させること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}\n${VISA_PAYMENT_ROW}`;
    const { transactions } = extractTransactionsFromPayPayCsv(csvContent);

    const { groupedTransactions, duplicates } = filterTransactions(
      transactions,
      new Map(),
    );

    expect(duplicates).toBe(0);
    expect(groupedTransactions["PayPay残高"]).toHaveLength(1);
    expect(groupedTransactions["VISA 1234"]).toHaveLength(1);
  });

  it("支払い方法ごとにグループ化できること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}\n${COMBINED_PAYMENT_ROW}`;
    const { transactions } = extractTransactionsFromPayPayCsv(csvContent);

    const { groupedTransactions } = filterTransactions(transactions, new Map());

    expect(groupedTransactions["PayPay残高"]).toHaveLength(2);
    expect(groupedTransactions["PayPayポイント"]).toHaveLength(1);
  });

  it("同じキーのPayPay取引をMoneyForward MEの件数分だけ除外すること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}\n${createSecondSinglePaymentRow()}`;
    const { transactions } = extractTransactionsFromPayPayCsv(csvContent);
    const exclusionCounts = new Map([
      ["2025/10/24_-190_PayPay残高_ダミーストアA", 1],
    ]);

    const { groupedTransactions, duplicates } = filterTransactions(
      transactions,
      exclusionCounts,
    );

    expect(duplicates).toBe(1);
    expect(groupedTransactions["PayPay残高"]).toHaveLength(1);
  });
});

describe("filterTransactionsBySources", () => {
  it("MFME CSVと前回の取り込み記録ごとの除外件数を集計すること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}\n${createSecondSinglePaymentRow()}\n${VISA_PAYMENT_ROW}`;
    const { transactions } = extractTransactionsFromPayPayCsv(csvContent);
    const result = filterTransactionsBySources(
      transactions,
      new Map([["2025/10/24_-190_PayPay残高_ダミーストアA", 1]]),
      new Map([["2025/10/24_-190_PayPay残高_ダミーストアA", 1]]),
    );

    expect(result.duplicates).toBe(2);
    expect(result.mfmeDuplicates).toBe(1);
    expect(result.importedDuplicates).toBe(1);
    expect(result.groupedTransactions["VISA 1234"]).toHaveLength(1);
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
    const { groupedTransactions } = filterTransactions(transactions, new Map());

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
    const { groupedTransactions } = filterTransactions(transactions, new Map());

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
    const { groupedTransactions } = filterTransactions(transactions, new Map());

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
    const { groupedTransactions } = filterTransactions(transactions, new Map());

    const chunks = createChunksFromGroupedTransactions(
      groupedTransactions,
      headers,
    );

    expect(chunks["PayPay残高"]?.[0]?.transactionKeys).toEqual([
      "2025/10/24_-190_PayPay残高_ダミーストアA",
    ]);
  });

  it("imported フラグがfalseで初期化されること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}`;
    const { transactions, headers } =
      extractTransactionsFromPayPayCsv(csvContent);
    const { groupedTransactions } = filterTransactions(transactions, new Map());

    const chunks = createChunksFromGroupedTransactions(
      groupedTransactions,
      headers,
    );

    expect(chunks["PayPay残高"]?.[0]?.imported).toBe(false);
  });

  it("空のgroupedTransactionsの場合に空のオブジェクトを返すこと", () => {
    const chunks = createChunksFromGroupedTransactions({}, []);
    expect(Object.keys(chunks)).toHaveLength(0);
  });
});
