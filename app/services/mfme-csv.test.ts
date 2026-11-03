import { describe, expect, it } from "vitest";
import { MFME_CSV_HEADER } from "./csv-test-fixtures";
import { combineMfmeData, parseMfmeCsvs } from "./mfme-csv";

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

describe("combineMfmeData", () => {
  const parse = (row: string) => parseMfmeCsvs([`${MFME_CSV_HEADER}\n${row}`]);

  it("選択中のファイル順に明細をまとめ、期間を合わせること", () => {
    const first = new File([""], "2025.csv");
    const second = new File([""], "2026.csv");
    const dataByName = new Map([
      [
        "2026.csv",
        parse("1,2026/01/05,ダミーストアB,-100,PayPay残高,食費,食費,,,id02"),
      ],
      [
        "2025.csv",
        parse("1,2025/12/31,ダミーストアA,-190,PayPay残高,食費,食費,,,id01"),
      ],
      [
        "unused.csv",
        parse("1,2024/01/01,ダミーストアC,-1,PayPay残高,食費,食費,,,id03"),
      ],
    ]);

    const result = combineMfmeData([first, second], dataByName);

    expect(result?.records.map((record) => record["ID"])).toEqual([
      "id01",
      "id02",
    ]);
    expect(result?.stats.count).toBe(2);
    expect(result?.stats.startDate?.toISOString()).toBe(
      "2025-12-30T15:00:00.000Z",
    );
    expect(result?.stats.endDate?.toISOString()).toBe(
      "2026-01-04T15:00:00.000Z",
    );
  });

  it("解析結果のあるファイルがなければnullを返すこと", () => {
    expect(combineMfmeData([new File([""], "a.csv")], new Map())).toBeNull();
  });
});
