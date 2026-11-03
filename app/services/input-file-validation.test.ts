import { describe, expect, it } from "vitest";
import {
  MFME_CSV_HEADER,
  PAYPAY_CSV_HEADER,
  SINGLE_PAYMENT_ROW,
  VISA_PAYMENT_ROW,
} from "./csv-test-fixtures";
import {
  selectLatestPayPayFile,
  validateInputFile,
} from "./input-file-validation";

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

describe("PayPayの取引履歴の判定値", () => {
  it("同じ内容のファイルは名前が違っても同じ判定値になる", async () => {
    const content = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}`;
    const first = await validateInputFile(file("a.csv", content), "paypay");
    const second = await validateInputFile(file("b.csv", content), "paypay");
    const other = await validateInputFile(
      file(
        "c.csv",
        `${content}\n${SINGLE_PAYMENT_ROW.replace("0001", "0009")}`,
      ),
      "paypay",
    );

    if (
      first.type !== "paypay" ||
      second.type !== "paypay" ||
      other.type !== "paypay"
    ) {
      throw new Error("PayPayの取引履歴として読み込めませんでした");
    }
    expect(first.data.fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(second.data.fingerprint).toBe(first.data.fingerprint);
    expect(other.data.fingerprint).not.toBe(first.data.fingerprint);
  });
});

describe("selectLatestPayPayFile", () => {
  const withEndDate = (name: string, endDate: string | null) => ({
    name,
    data: {
      stats: {
        count: 1,
        startDate: null,
        endDate: endDate ? new Date(endDate) : null,
      },
    },
  });

  it("明細の最終日が最も新しいファイルを選び、同じなら先のファイルを選ぶ", () => {
    expect(
      selectLatestPayPayFile([
        withEndDate("old", "2025-10-24"),
        withEndDate("new", "2025-11-24"),
        withEndDate("same", "2025-11-24"),
      ])?.name,
    ).toBe("new");
    expect(selectLatestPayPayFile([])).toBeNull();
  });
});
