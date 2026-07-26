import { describe, expect, it } from "vitest";
import { MFME_CSV_HEADER } from "./csv-test-fixtures";
import { parseMfmeCsvs } from "./mfme-csv";

describe("parseMfmeCsvs", () => {
  it("MFME CSVの明細と統計を読み込むこと", () => {
    const mfmeCsv = `${MFME_CSV_HEADER}\n1,2025/10/24,ダミーストアA,-190,PayPay残高,食費,食費,メモ,,id01`;
    const result = parseMfmeCsvs([mfmeCsv]);

    expect(result.records).toHaveLength(1);
    expect(result.records[0]?.["ID"]).toBe("id01");
    expect(result.stats.count).toBe(1);
    expect(result.stats.startDate?.toISOString()).toBe(
      "2025-10-23T15:00:00.000Z",
    );
  });

  it("計算対象が0の明細も登録済みとして数えること", () => {
    const mfmeCsv = `${MFME_CSV_HEADER}\n0,2025/10/24,ダミーストアA,-190,PayPay残高,食費,食費,メモ,,id01`;
    const result = parseMfmeCsvs([mfmeCsv]);

    expect(result.records).toHaveLength(1);
    expect(result.stats.count).toBe(1);
  });

  it("複数のMFME CSVファイルを統合すること", () => {
    const first = `${MFME_CSV_HEADER}\n1,2025/10/24,ダミーストアA,-190,PayPay残高,食費,食費,メモ,,id01`;
    const second = `${MFME_CSV_HEADER}\n1,2025/10/25,ダミーストアB,-100,PayPay残高,食費,食費,メモ,,id02`;
    const result = parseMfmeCsvs([first, second]);

    expect(result.records).toHaveLength(2);
    expect(result.stats.count).toBe(2);
  });

  it("空の配列から空の結果を返すこと", () => {
    const result = parseMfmeCsvs([]);

    expect(result.records).toEqual([]);
    expect(result.stats.count).toBe(0);
  });
});
