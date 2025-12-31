import { describe, it, expect } from "vitest";
import {
  extractTransactionsFromPayPayCsv,
  createMfmeExclusionSet,
  filterTransactions,
  createChunksFromGroupedRecords,
  parseDate,
  updateDateRange,
} from "./csv-processor";

const PAYPAY_CSV_HEADER = `取引日,出金金額（円）,入金金額（円）,海外出金金額,通貨,変換レート（円）,利用国,取引内容,取引先,取引方法,支払い区分,利用者,取引番号`;
const MFME_CSV_HEADER = `計算対象,日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替,ID`;

const SINGLE_PAYMENT_ROW = `2025/10/24 10:59:25,190,-,-,-,-,-,支払い,ダミーストアA,PayPay残高,-,-,00000000000000000001`;
const COMBINED_PAYMENT_ROW = `2025/09/29 14:54:12,410,-,-,-,-,-,支払い,ダミーストアB,"PayPayポイント (93円), PayPay残高 (317円)",-,-,00000000000000000002`;
const COMBINED_WITH_COMMA_AMOUNT_ROW = `2025/03/23 13:03:03,"2,600",-,-,-,-,-,支払い,ダミーストアC,"PayPayポイント (1円), PayPay残高 (2,599円)",-,-,00000000000000000003`;
const VISA_PAYMENT_ROW = `2025/10/24 13:17:35,72,-,-,-,-,-,支払い,ダミーストアD,VISA 1234,-,-,00000000000000000004`;

describe("parseDate", () => {
  it("PayPay形式の日時（YYYY/MM/DD HH:mm:ss）をJSTとして正しく解析できること", () => {
    const date = parseDate("2025/10/24 10:59:25");
    expect(date?.toISOString()).toBe("2025-10-24T01:59:25.000Z");
  });

  it("MFME形式の日付（YYYY/MM/DD）をJST 00:00:00として正しく解析できること", () => {
    const date = parseDate("2025/10/24");
    expect(date?.toISOString()).toBe("2025-10-23T15:00:00.000Z");
  });

  it("undefinedが渡された場合にnullを返すこと", () => {
    const date = parseDate(undefined);
    expect(date).toBeNull();
  });

  it("不正な日付形式の場合にnullを返すこと", () => {
    const date = parseDate("invalid-date");
    expect(date).toBeNull();
  });
});

describe("updateDateRange", () => {
  it("初回の日付でminDateとmaxDateを設定できること", () => {
    const date = new Date("2025-10-24T01:59:25.000Z");
    const [minDate, maxDate] = updateDateRange(date, null, null);
    expect(minDate).toEqual(date);
    expect(maxDate).toEqual(date);
  });

  it("より古い日付でminDateを更新できること", () => {
    const oldDate = new Date("2025-09-01T00:00:00.000Z");
    const currentMin = new Date("2025-10-01T00:00:00.000Z");
    const currentMax = new Date("2025-10-24T00:00:00.000Z");
    const [minDate, maxDate] = updateDateRange(oldDate, currentMin, currentMax);
    expect(minDate).toEqual(oldDate);
    expect(maxDate).toEqual(currentMax);
  });

  it("より新しい日付でmaxDateを更新できること", () => {
    const newDate = new Date("2025-11-01T00:00:00.000Z");
    const currentMin = new Date("2025-09-01T00:00:00.000Z");
    const currentMax = new Date("2025-10-24T00:00:00.000Z");
    const [minDate, maxDate] = updateDateRange(newDate, currentMin, currentMax);
    expect(minDate).toEqual(currentMin);
    expect(maxDate).toEqual(newDate);
  });
});

describe("extractTransactionsFromPayPayCsv", () => {
  it("単一支払いのレコードを正しく抽出できること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}`;
    const { transactions, stats, headers } = extractTransactionsFromPayPayCsv(csvContent);

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

    const pointTransaction = transactions.find(t => t.paymentMethod === "PayPayポイント");
    expect(pointTransaction).toBeDefined();
    expect(pointTransaction?.record["出金金額（円）"]).toBe("93");

    const balanceTransaction = transactions.find(t => t.paymentMethod === "PayPay残高");
    expect(balanceTransaction).toBeDefined();
    expect(balanceTransaction?.record["出金金額（円）"]).toBe("317");
  });

  it("金額にカンマが含まれる併用払いを正しく処理できること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${COMBINED_WITH_COMMA_AMOUNT_ROW}`;
    const { transactions } = extractTransactionsFromPayPayCsv(csvContent);

    const pointTransaction = transactions.find(t => t.paymentMethod === "PayPayポイント");
    expect(pointTransaction?.record["出金金額（円）"]).toBe("1");

    const balanceTransaction = transactions.find(t => t.paymentMethod === "PayPay残高");
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

describe("createMfmeExclusionSet", () => {
  it("MFMEのCSVから除外キーのセットを作成できること", () => {
    const mfmeCsv = `${MFME_CSV_HEADER}\n1,2025/10/24,ダミーストアA,-190,PayPay残高,食費,食費,メモ,,id01`;
    const { exclusionSet, stats } = createMfmeExclusionSet([mfmeCsv]);

    expect(exclusionSet.size).toBe(1);
    expect(exclusionSet.has("2025/10/24_-190_PayPay残高_ダミーストアA")).toBe(true);
    expect(stats.count).toBe(1);
  });

  it("計算対象が0の行を除外できること", () => {
    const mfmeCsv = `${MFME_CSV_HEADER}\n0,2025/10/24,ダミーストアA,-190,PayPay残高,食費,食費,メモ,,id01\n1,2025/10/25,ダミーストアB,-100,PayPay残高,食費,食費,メモ,,id02`;
    const { exclusionSet, stats } = createMfmeExclusionSet([mfmeCsv]);

    expect(exclusionSet.size).toBe(1);
    expect(exclusionSet.has("2025/10/25_-100_PayPay残高_ダミーストアB")).toBe(true);
    expect(stats.count).toBe(2); // countは計算対象外も含む
  });

  it("複数のMFME CSVファイルを統合できること", () => {
    const mfmeCsv1 = `${MFME_CSV_HEADER}\n1,2025/10/24,ダミーストアA,-190,PayPay残高,食費,食費,メモ,,id01`;
    const mfmeCsv2 = `${MFME_CSV_HEADER}\n1,2025/10/25,ダミーストアB,-100,PayPay残高,食費,食費,メモ,,id02`;
    const { exclusionSet, stats } = createMfmeExclusionSet([mfmeCsv1, mfmeCsv2]);

    expect(exclusionSet.size).toBe(2);
    expect(stats.count).toBe(2);
  });

  it("統計情報を正しく計算できること", () => {
    const mfmeCsv = `${MFME_CSV_HEADER}\n1,2025/10/24,ダミーストアA,-190,PayPay残高,食費,食費,メモ,,id01\n1,2025/11/01,ダミーストアB,-100,PayPay残高,食費,食費,メモ,,id02`;
    const { stats } = createMfmeExclusionSet([mfmeCsv]);

    expect(stats.startDate?.toISOString()).toBe("2025-10-23T15:00:00.000Z");
    expect(stats.endDate?.toISOString()).toBe("2025-10-31T15:00:00.000Z");
  });

  it("空の配列の場合に空のセットを返すこと", () => {
    const { exclusionSet, stats } = createMfmeExclusionSet([]);

    expect(exclusionSet.size).toBe(0);
    expect(stats.count).toBe(0);
  });
});

describe("filterTransactions", () => {
  it("除外キーに一致するトランザクションをフィルタリングできること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}\n${VISA_PAYMENT_ROW}`;
    const { transactions } = extractTransactionsFromPayPayCsv(csvContent);

    const exclusionSet = new Set(["2025/10/24_-190_PayPay残高_ダミーストアA"]);
    const { groupedRecords, duplicates } = filterTransactions(transactions, exclusionSet);

    expect(duplicates).toBe(1);
    expect(groupedRecords["PayPay残高"]).toBeUndefined();
    expect(groupedRecords["VISA 1234"]).toHaveLength(1);
  });

  it("併用払いの片方のみを除外できること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${COMBINED_PAYMENT_ROW}`;
    const { transactions } = extractTransactionsFromPayPayCsv(csvContent);

    const exclusionSet = new Set(["2025/09/29_-317_PayPay残高_ダミーストアB"]);
    const { groupedRecords, duplicates } = filterTransactions(transactions, exclusionSet);

    expect(duplicates).toBe(1);
    expect(groupedRecords["PayPayポイント"]).toHaveLength(1);
    expect(groupedRecords["PayPay残高"]).toBeUndefined();
  });

  it("除外キーが空の場合にすべてのトランザクションを通過させること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}\n${VISA_PAYMENT_ROW}`;
    const { transactions } = extractTransactionsFromPayPayCsv(csvContent);

    const exclusionSet = new Set<string>();
    const { groupedRecords, duplicates } = filterTransactions(transactions, exclusionSet);

    expect(duplicates).toBe(0);
    expect(groupedRecords["PayPay残高"]).toHaveLength(1);
    expect(groupedRecords["VISA 1234"]).toHaveLength(1);
  });

  it("支払い方法ごとにグループ化できること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}\n${COMBINED_PAYMENT_ROW}`;
    const { transactions } = extractTransactionsFromPayPayCsv(csvContent);

    const exclusionSet = new Set<string>();
    const { groupedRecords } = filterTransactions(transactions, exclusionSet);

    expect(groupedRecords["PayPay残高"]).toHaveLength(2); // 2つのレコード
    expect(groupedRecords["PayPayポイント"]).toHaveLength(1);
  });
});

describe("createChunksFromGroupedRecords", () => {
  it("100件ごとにレコードをチャンキングできること", () => {
    let manyRows = "";
    for (let i = 0; i < 105; i++) {
      const uniqueId = `00000000000000000${String(i).padStart(4, "0")}`;
      manyRows += `2025/10/24 10:59:25,190,-,-,-,-,-,支払い,ダミーストアA,PayPay残高,-,-,${uniqueId}\n`;
    }
    const csvContent = `${PAYPAY_CSV_HEADER}\n${manyRows}`;
    const { transactions, headers } = extractTransactionsFromPayPayCsv(csvContent);

    const { groupedRecords } = filterTransactions(transactions, new Set());
    const chunks = createChunksFromGroupedRecords(groupedRecords, headers);

    expect(chunks["PayPay残高"]).toHaveLength(2);
    expect(chunks["PayPay残高"]?.[0]?.count).toBe(100);
    expect(chunks["PayPay残高"]?.[1]?.count).toBe(5);
  });

  it("チャンクの期間を正しく計算できること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}\n${COMBINED_PAYMENT_ROW}`;
    const { transactions, headers } = extractTransactionsFromPayPayCsv(csvContent);

    const { groupedRecords } = filterTransactions(transactions, new Set());
    const chunks = createChunksFromGroupedRecords(groupedRecords, headers);

    const balanceChunk = chunks["PayPay残高"]?.[0];
    expect(balanceChunk?.startDate?.toISOString()).toBe("2025-09-29T05:54:12.000Z");
    expect(balanceChunk?.endDate?.toISOString()).toBe("2025-10-24T01:59:25.000Z");

    const pointChunk = chunks["PayPayポイント"]?.[0];
    expect(pointChunk?.startDate?.toISOString()).toBe("2025-09-29T05:54:12.000Z");
    expect(pointChunk?.endDate?.toISOString()).toBe("2025-09-29T05:54:12.000Z");
  });

  it("CSV文字列を正しく生成できること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}`;
    const { transactions, headers } = extractTransactionsFromPayPayCsv(csvContent);

    const { groupedRecords } = filterTransactions(transactions, new Set());
    const chunks = createChunksFromGroupedRecords(groupedRecords, headers);

    const data = chunks["PayPay残高"]?.[0]?.data;
    expect(data).toContain("PayPay残高");
    expect(data).toContain("00000000000000000001");
  });

  it("imported フラグがfalseで初期化されること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}`;
    const { transactions, headers } = extractTransactionsFromPayPayCsv(csvContent);

    const { groupedRecords } = filterTransactions(transactions, new Set());
    const chunks = createChunksFromGroupedRecords(groupedRecords, headers);

    expect(chunks["PayPay残高"]?.[0]?.imported).toBe(false);
  });

  it("空のgroupedRecordsの場合に空のオブジェクトを返すこと", () => {
    const chunks = createChunksFromGroupedRecords({}, []);
    expect(Object.keys(chunks)).toHaveLength(0);
  });
});
