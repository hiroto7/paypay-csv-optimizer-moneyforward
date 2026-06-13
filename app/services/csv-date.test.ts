import { describe, expect, it } from "vitest";
import { parseDate, updateDateRange } from "./csv-date";

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
    expect(parseDate(undefined)).toBeNull();
  });

  it("不正な日付形式の場合にnullを返すこと", () => {
    expect(parseDate("invalid-date")).toBeNull();
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
