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
  it("種類が逆のファイルを拒否する", async () => {
    await expect(validateInputFile(mfmeFile, "paypay")).rejects.toThrow(
      "PayPayの取引履歴のCSVファイルを選んでください。",
    );
    await expect(validateInputFile(payPayFile, "mfme")).rejects.toThrow(
      "MoneyForward MEの入出金履歴のCSVファイルを選んでください。",
    );
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
