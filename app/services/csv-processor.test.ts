import { describe, it, expect } from "vitest";
import { processPayPayCsv } from "./csv-processor";

const CSV_HEADER = `取引日,出金金額（円）,入金金額（円）,海外出金金額,通貨,変換レート（円）,利用国,取引内容,取引先,取引方法,支払い区分,利用者,取引番号`;

const SINGLE_PAYMENT_ROW = `2025/10/24 10:59:25,190,-,-,-,-,-,支払い,ダミーストアA,PayPay残高,-,-,00000000000000000001`;
const COMBINED_PAYMENT_ROW = `2025/09/29 14:54:12,410,-,-,-,-,-,支払い,ダミーストアB,"PayPayポイント (93円), PayPay残高 (317円)",-,-,00000000000000000002`;
const COMBINED_WITH_COMMA_AMOUNT_ROW = `2025/03/23 13:03:03,"2,600",-,-,-,-,-,支払い,ダミーストアC,"PayPayポイント (1円), PayPay残高 (2,599円)",-,-,00000000000000000003`;
const VISA_PAYMENT_ROW = `2025/10/24 13:17:35,72,-,-,-,-,-,支払い,ダミーストアB,VISA 1234,-,-,00000000000000000004`;

describe("processPayPayCsv", () => {

  it("単一支払いのレコードを正しく処理できること", () => {
    const csvContent = `${CSV_HEADER}\n${SINGLE_PAYMENT_ROW}`;
    const result = processPayPayCsv(csvContent, new Set());

    expect(Object.keys(result)).toEqual(["PayPay残高"]);
    expect(result["PayPay残高"][0].count).toBe(1);
    expect(result["PayPay残高"][0].data).toContain("PayPay残高");
    expect(result["PayPay残高"][0].data).toContain("00000000000000000001");
  });

  it("併用払いのレコードを2つに分割できること", () => {
    const csvContent = `${CSV_HEADER}\n${COMBINED_PAYMENT_ROW}`;
    const result = processPayPayCsv(csvContent, new Set());

    // PayPayポイントの確認
    expect(result["PayPayポイント"]).toBeDefined();
    expect(result["PayPayポイント"][0].count).toBe(1);
    const pointData = result["PayPayポイント"][0].data;
    expect(pointData).toContain(",93,-"); // 金額が正しく配置されているか
    expect(pointData).not.toContain("PayPay残高");

    // PayPay残高の確認
    expect(result["PayPay残高"]).toBeDefined();
    expect(result["PayPay残高"][0].count).toBe(1);
    const balanceData = result["PayPay残高"][0].data;
    expect(balanceData).toContain(",317,-"); // 金額が正しく配置されているか
    expect(balanceData).not.toContain("PayPayポイント");
  });

  it("金額にカンマが含まれる併用払いを正しく処理できること", () => {
    const csvContent = `${CSV_HEADER}\n${COMBINED_WITH_COMMA_AMOUNT_ROW}`;
    const result = processPayPayCsv(csvContent, new Set());

    expect(result["PayPayポイント"][0].data).toContain(",1,-");
    expect(result["PayPay残高"][0].data).toContain(",2599,-");
  });

  it("取り込み済みの取引番号に基づいてレコードを除外できること", () => {
    const csvContent = `${CSV_HEADER}\n${SINGLE_PAYMENT_ROW}\n${VISA_PAYMENT_ROW}`;
    const importedIds = new Set(["00000000000000000001"]); // SINGLE_PAYMENT_ROWのID
    const result = processPayPayCsv(csvContent, importedIds);

    expect(result["PayPay残高"]).toBeUndefined(); // この支払い方法は除外されるはず
    expect(result["VISA 1234"]).toBeDefined();
    expect(result["VISA 1234"][0].count).toBe(1);
  });

  it("チャンクの期間を正しく計算できること", () => {
    const csvContent = `${CSV_HEADER}\n${SINGLE_PAYMENT_ROW}\n${COMBINED_PAYMENT_ROW}`;
    const result = processPayPayCsv(csvContent, new Set());

    // 「PayPay残高」のチャンクは両方の行のレコードを含むため、期間は両方の日付にまたがる
    const balanceChunk = result["PayPay残高"][0];
    expect(balanceChunk.startDate).toEqual(new Date("2025-09-29T14:54:12"));
    expect(balanceChunk.endDate).toEqual(new Date("2025-10-24T10:59:25"));

    // 「PayPayポイント」のチャンクは1つのレコードのみ含む
    const pointChunk = result["PayPayポイント"][0];
    expect(pointChunk.startDate).toEqual(new Date("2025-09-29T14:54:12"));
    expect(pointChunk.endDate).toEqual(new Date("2025-09-29T14:54:12"));
  });

  it("100件ごとにレコードをチャンキングできること", () => {
    let manyRows = "";
    for (let i = 0; i < 105; i++) {
      // 各行にユニークな取引番号を付与する
      const uniqueId = `00000000000000000${String(i).padStart(4, '0')}`;
      manyRows += `2025/10/24 10:59:25,190,-,-,-,-,-,支払い,ダミーストアA,PayPay残高,-,-,${uniqueId}\n`;
    }
    const csvContent = `${CSV_HEADER}\n${manyRows}`;
    const result = processPayPayCsv(csvContent, new Set());

    expect(result["PayPay残高"]).toBeDefined();
    expect(result["PayPay残高"].length).toBe(2); // 2つのチャンクに分割されるはず
    expect(result["PayPay残高"][0].count).toBe(100);
    expect(result["PayPay残高"][1].count).toBe(5);
  });

  it("空のCSVが渡された場合に空のオブジェクトを返すこと", () => {
    const result = processPayPayCsv("", new Set());
    expect(result).toEqual({});
  });
});
