import { describe, expect, it } from "vitest";
import {
  MFME_CSV_HEADER,
  PAYPAY_CSV_HEADER,
  SINGLE_PAYMENT_ROW,
  VISA_PAYMENT_ROW,
} from "./csv-test-fixtures";
import { validateInputFile } from "./input-file-validation";

const file = (name: string, content: string) =>
  new File([content], name, { type: "text/csv" });

const payPayFile = file(
  "paypay.csv",
  `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}`,
);
const mfmeFile = file(
  "moneyforward.csv",
  `${MFME_CSV_HEADER}\n1,2025/10/24,架空商店,-190,PayPay残高,食費,食費,メモ,,id01`,
);

describe("validateInputFile", () => {
  it("PayPayの取引履歴から対象明細を読み込む", async () => {
    const result = await validateInputFile(payPayFile, "paypay");
    expect(result.type).toBe("paypay");
    if (result.type === "paypay") {
      expect(result.data.transactions).toHaveLength(1);
      expect(result.data.stats.count).toBe(1);
    }
  });

  it("MoneyForward MEの入出金履歴からファイル別の件数を読み込む", async () => {
    const result = await validateInputFile(mfmeFile, "mfme");
    expect(result.type).toBe("mfme");
    if (result.type === "mfme") expect(result.data.stats.count).toBe(1);
  });

  it("種類が逆のファイルを拒否する", async () => {
    await expect(validateInputFile(mfmeFile, "paypay")).rejects.toThrow(
      "PayPayの取引履歴のCSVファイルを選んでください。",
    );
    await expect(validateInputFile(payPayFile, "mfme")).rejects.toThrow(
      "MoneyForward MEの入出金履歴のCSVファイルを選んでください。",
    );
  });

  it("必要な列がないファイルを拒否する", async () => {
    await expect(
      validateInputFile(file("invalid.csv", "日付,金額\n2025/10/24,190")),
    ).rejects.toThrow("必要な列がありません");
  });

  it("対象取引がないPayPayの取引履歴を拒否する", async () => {
    await expect(
      validateInputFile(
        file("visa.csv", `${PAYPAY_CSV_HEADER}\n${VISA_PAYMENT_ROW}`),
        "paypay",
      ),
    ).rejects.toThrow("対象取引がありません");
  });

  it("有効な明細がないMoneyForward MEの入出金履歴を拒否する", async () => {
    await expect(
      validateInputFile(
        file(
          "empty.csv",
          `${MFME_CSV_HEADER}\n1,2025/10/24,架空商店,,PayPay残高,食費,食費,メモ,,id01`,
        ),
        "mfme",
      ),
    ).rejects.toThrow("有効な入出金明細がありません");
  });
});
