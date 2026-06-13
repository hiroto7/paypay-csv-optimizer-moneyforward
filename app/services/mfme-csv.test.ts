import { describe, expect, it } from "vitest";
import { MFME_CSV_HEADER } from "./csv-test-fixtures";
import { createMfmeExclusionSet } from "./mfme-csv";

describe("createMfmeExclusionSet", () => {
  it("MFMEのCSVから除外キーの件数を作成できること", () => {
    const mfmeCsv = `${MFME_CSV_HEADER}\n1,2025/10/24,ダミーストアA,-190,PayPay残高,食費,食費,メモ,,id01`;
    const { exclusionCounts, stats } = createMfmeExclusionSet([mfmeCsv]);

    expect(exclusionCounts.size).toBe(1);
    expect(
      exclusionCounts.get("2025/10/24_-190_PayPay残高_ダミーストアA"),
    ).toBe(1);
    expect(stats.count).toBe(1);
  });

  it("同じ除外キーの明細件数を保持できること", () => {
    const mfmeCsv = `${MFME_CSV_HEADER}\n1,2025/10/24,ダミーストアA,-190,PayPay残高,食費,食費,メモ,,id01\n1,2025/10/24,ダミーストアA,-190,PayPay残高,食費,食費,メモ,,id02`;
    const { exclusionCounts } = createMfmeExclusionSet([mfmeCsv]);

    expect(
      exclusionCounts.get("2025/10/24_-190_PayPay残高_ダミーストアA"),
    ).toBe(2);
  });

  it("計算対象が0の行を除外できること", () => {
    const mfmeCsv = `${MFME_CSV_HEADER}\n0,2025/10/24,ダミーストアA,-190,PayPay残高,食費,食費,メモ,,id01\n1,2025/10/25,ダミーストアB,-100,PayPay残高,食費,食費,メモ,,id02`;
    const { exclusionCounts, stats } = createMfmeExclusionSet([mfmeCsv]);

    expect(exclusionCounts.size).toBe(1);
    expect(
      exclusionCounts.get("2025/10/25_-100_PayPay残高_ダミーストアB"),
    ).toBe(1);
    expect(stats.count).toBe(2);
  });

  it("複数のMFME CSVファイルを統合できること", () => {
    const mfmeCsv1 = `${MFME_CSV_HEADER}\n1,2025/10/24,ダミーストアA,-190,PayPay残高,食費,食費,メモ,,id01`;
    const mfmeCsv2 = `${MFME_CSV_HEADER}\n1,2025/10/25,ダミーストアB,-100,PayPay残高,食費,食費,メモ,,id02`;
    const { exclusionCounts, stats } = createMfmeExclusionSet([
      mfmeCsv1,
      mfmeCsv2,
    ]);

    expect(exclusionCounts.size).toBe(2);
    expect(stats.count).toBe(2);
  });

  it("統計情報を正しく計算できること", () => {
    const mfmeCsv = `${MFME_CSV_HEADER}\n1,2025/10/24,ダミーストアA,-190,PayPay残高,食費,食費,メモ,,id01\n1,2025/11/01,ダミーストアB,-100,PayPay残高,食費,食費,メモ,,id02`;
    const { stats } = createMfmeExclusionSet([mfmeCsv]);

    expect(stats.startDate?.toISOString()).toBe("2025-10-23T15:00:00.000Z");
    expect(stats.endDate?.toISOString()).toBe("2025-10-31T15:00:00.000Z");
  });

  it("空の配列の場合に空の件数マップを返すこと", () => {
    const { exclusionCounts, stats } = createMfmeExclusionSet([]);

    expect(exclusionCounts.size).toBe(0);
    expect(stats.count).toBe(0);
  });
});
