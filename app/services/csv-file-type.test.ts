import { describe, expect, it } from "vitest";
import { detectCsvFileType } from "./csv-file-type";

describe("detectCsvFileType", () => {
  it("PayPay CSVのヘッダを判定する", () => {
    const csv =
      "取引日,出金金額（円）,入金金額（円）,取引先,取引方法\n2026/06/01 10:00,100,-,架空商店,PayPay残高\n";

    expect(detectCsvFileType(csv)).toBe("paypay");
  });

  it("BOM付きMoneyForward ME CSVのヘッダを判定する", () => {
    const csv =
      "\uFEFF計算対象,日付,内容,金額（円）,保有金融機関\n1,2026/06/01,架空商店,-100,架空口座\n";

    expect(detectCsvFileType(csv)).toBe("mfme");
  });

  it("必要なヘッダがないCSVはunknownにする", () => {
    expect(detectCsvFileType("日付,金額\n2026/06/01,100\n")).toBe("unknown");
  });

  it("CSVとして解析できない内容はunknownにする", () => {
    expect(detectCsvFileType('"閉じていない引用符')).toBe("unknown");
  });
});
