import { describe, it, expect } from "vitest";
import { processPayPayCsv } from "./csv-processor";

const PAYPAY_CSV_HEADER = `取引日,出金金額（円）,入金金額（円）,海外出金金額,通貨,変換レート（円）,利用国,取引内容,取引先,取引方法,支払い区分,利用者,取引番号`;
const MFME_CSV_HEADER = `計算対象,日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替,ID`;

const SINGLE_PAYMENT_ROW = `2025/10/24 10:59:25,190,-,-,-,-,-,支払い,ダミーストアA,PayPay残高,-,-,00000000000000000001`;
const COMBINED_PAYMENT_ROW = `2025/09/29 14:54:12,410,-,-,-,-,-,支払い,ダミーストアB,"PayPayポイント (93円), PayPay残高 (317円)",-,-,00000000000000000002`;
const COMBINED_WITH_COMMA_AMOUNT_ROW = `2025/03/23 13:03:03,"2,600",-,-,-,-,-,支払い,ダミーストアC,"PayPayポイント (1円), PayPay残高 (2,599円)",-,-,00000000000000000003`;
const VISA_PAYMENT_ROW = `2025/10/24 13:17:35,72,-,-,-,-,-,支払い,ダミーストアD,VISA 1234,-,-,00000000000000000004`;

describe("processPayPayCsv", () => {
  it("単一支払いのレコードを正しく処理できること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}`;
    const { chunks } = processPayPayCsv(csvContent, []);

    expect(Object.keys(chunks)).toEqual(["PayPay残高"]);
    expect(chunks["PayPay残高"]?.[0]?.count).toBe(1);
    expect(chunks["PayPay残高"]?.[0]?.data).toContain("PayPay残高");
    expect(chunks["PayPay残高"]?.[0]?.data).toContain("00000000000000000001");
  });

  it("併用払いのレコードを2つに分割できること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${COMBINED_PAYMENT_ROW}`;
    const { chunks } = processPayPayCsv(csvContent, []);

    // PayPayポイントの確認
    expect(chunks["PayPayポイント"]).toBeDefined();
    expect(chunks["PayPayポイント"]?.[0]?.count).toBe(1);
    const pointData = chunks["PayPayポイント"]?.[0]?.data;
    expect(pointData).toContain(",93,-"); // 金額が正しく配置されているか
    expect(pointData).not.toContain("PayPay残高");

    // PayPay残高の確認
    expect(chunks["PayPay残高"]).toBeDefined();
    expect(chunks["PayPay残高"]?.[0]?.count).toBe(1);
    const balanceData = chunks["PayPay残高"]?.[0]?.data;
    expect(balanceData).toContain(",317,-"); // 金額が正しく配置されているか
    expect(balanceData).not.toContain("PayPayポイント");
  });

  it("金額にカンマが含まれる併用払いを正しく処理できること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${COMBINED_WITH_COMMA_AMOUNT_ROW}`;
    const { chunks } = processPayPayCsv(csvContent, []);

    expect(chunks["PayPayポイント"]?.[0]?.data).toContain(",1,-");
    expect(chunks["PayPay残高"]?.[0]?.data).toContain(",2599,-");
  });

  it("MFMEのCSVに基づいて単一支払いのレコードを除外できること", () => {
    const paypayCsv = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}\n${VISA_PAYMENT_ROW}`;
    const mfmeCsv = `${MFME_CSV_HEADER}\n1,2025/10/24,ダミーストアA,-190,PayPay残高,食費,食費,メモ,,id01`;
    const { chunks } = processPayPayCsv(paypayCsv, [mfmeCsv]);

    expect(chunks["PayPay残高"]).toBeUndefined(); // この支払い方法は除外されるはず
    expect(chunks["VISA 1234"]).toBeDefined();
    expect(chunks["VISA 1234"]?.[0]?.count).toBe(1);
  });

  it("MFMEのCSVに基づいて併用払いのレコードを両方とも除外できること", () => {
    const paypayCsv = `${PAYPAY_CSV_HEADER}\n${COMBINED_PAYMENT_ROW}`;
    const mfmeCsv = `${MFME_CSV_HEADER}\n1,2025/09/29,ダミーストアB,-93,PayPayポイント,食費,食費,メモ,,id02\n1,2025/09/29,ダミーストアB,-317,PayPay残高,食費,食費,メモ,,id03`;
    const { chunks } = processPayPayCsv(paypayCsv, [mfmeCsv]);

    expect(chunks["PayPayポイント"]).toBeUndefined();
    expect(chunks["PayPay残高"]).toBeUndefined();
  });

  it("MFMEのCSVに基づいて併用払いの片方のレコードのみ除外できること", () => {
    const paypayCsv = `${PAYPAY_CSV_HEADER}\n${COMBINED_PAYMENT_ROW}`;
    // PayPay残高の支払いのみMFMEに存在するケース
    const mfmeCsv = `${MFME_CSV_HEADER}\n1,2025/09/29,ダミーストアB,-317,PayPay残高,食費,食費,メモ,,id03`;
    const { chunks } = processPayPayCsv(paypayCsv, [mfmeCsv]);

    expect(chunks["PayPayポイント"]).toBeDefined();
    expect(chunks["PayPayポイント"]?.[0]?.count).toBe(1);
    expect(chunks["PayPay残高"]).toBeUndefined();
  });

  it("チャンクの期間を正しく計算できること", () => {
    const csvContent = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}\n${COMBINED_PAYMENT_ROW}`;
    const { chunks } = processPayPayCsv(csvContent, []);

    // 「PayPay残高」のチャンクは両方の行のレコードを含むため、期間は両方の日付にまたがる
    const balanceChunk = chunks["PayPay残高"]?.[0];
    expect(balanceChunk?.startDate?.toISOString()).toEqual(
      "2025-09-29T05:54:12.000Z"
    );
    expect(balanceChunk?.endDate?.toISOString()).toEqual(
      "2025-10-24T01:59:25.000Z"
    );

    // 「PayPayポイント」のチャンクは1つのレコードのみ含む
    const pointChunk = chunks["PayPayポイント"]?.[0];
    expect(pointChunk?.startDate?.toISOString()).toEqual(
      "2025-09-29T05:54:12.000Z"
    );
    expect(pointChunk?.endDate?.toISOString()).toEqual(
      "2025-09-29T05:54:12.000Z"
    );
  });

  it("100件ごとにレコードをチャンキングできること", () => {
    let manyRows = "";
    for (let i = 0; i < 105; i++) {
      // 各行にユニークな取引番号を付与する
      const uniqueId = `00000000000000000${String(i).padStart(4, "0")}`;
      manyRows += `2025/10/24 10:59:25,190,-,-,-,-,-,支払い,ダミーストアA,PayPay残高,-,-,${uniqueId}\n`;
    }
    const csvContent = `${PAYPAY_CSV_HEADER}\n${manyRows}`;
    const { chunks } = processPayPayCsv(csvContent, []);

    expect(chunks["PayPay残高"]).toBeDefined();
    expect(chunks["PayPay残高"]?.length).toBe(2); // 2つのチャンクに分割されるはず
    expect(chunks["PayPay残高"]?.[0]?.count).toBe(100);
    expect(chunks["PayPay残高"]?.[1]?.count).toBe(5);
  });

  it("空のCSVが渡された場合に空のオブジェクトを返すこと", () => {
    const { chunks } = processPayPayCsv("", []);
    expect(chunks).toEqual({});
  });

  it("統計情報を正しく計算できること", () => {
    const paypayCsv = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}\n${COMBINED_PAYMENT_ROW}\n${VISA_PAYMENT_ROW}`;
    const mfmeCsv = `${MFME_CSV_HEADER}\n1,2025/10/24,ダミーストアA,-190,PayPay残高,食費,食費,メモ,,id01`;
    const result = processPayPayCsv(paypayCsv, [mfmeCsv]);

    // PayPay CSVの統計情報
    expect(result.paypayStats.count).toBe(3);
    expect(result.paypayStats.startDate?.toISOString()).toEqual(
      "2025-09-29T05:54:12.000Z"
    );
    expect(result.paypayStats.endDate?.toISOString()).toEqual(
      "2025-10-24T04:17:35.000Z"
    );

    // MFME CSVの統計情報
    expect(result.mfStats.count).toBe(1);
    expect(result.mfStats.duplicates).toBe(1);
    expect(result.mfStats.startDate?.toISOString()).toEqual(
      "2025-10-24T00:00:00.000Z"
    );
    expect(result.mfStats.endDate?.toISOString()).toEqual(
      "2025-10-24T00:00:00.000Z"
    );
  });
});
