import { describe, expect, it } from "vitest";
import {
  createSecondSinglePaymentRow,
  MFME_CSV_HEADER,
  PAYPAY_CSV_HEADER,
  SINGLE_PAYMENT_ROW,
} from "./csv-test-fixtures";
import { parseMfmeCsvs } from "./mfme-csv";
import { reconcileMfmeTransactions } from "./mfme-reconciliation";
import { extractTransactionsFromPayPayCsv } from "./paypay-csv";

const reconcileCsvs = (payPayRows: string, mfmeRows: string) => {
  const { transactions } = extractTransactionsFromPayPayCsv(
    `${PAYPAY_CSV_HEADER}\n${payPayRows}`,
  );
  const { records } = parseMfmeCsvs([`${MFME_CSV_HEADER}\n${mfmeRows}`]);
  return reconcileMfmeTransactions(transactions, records);
};

describe("reconcileMfmeTransactions", () => {
  it("完全一致した明細を変換対象から除外すること", () => {
    const result = reconcileCsvs(
      SINGLE_PAYMENT_ROW,
      "1,2025/10/24,ダミーストアA,-190,PayPay残高,食費,食費,メモ,,id01",
    );

    expect(result.matchedCount).toBe(1);
    expect(result.remainingTransactions).toHaveLength(0);
    expect(result.candidates).toHaveLength(0);
  });

  it("口座だけ異なる明細を要確認にしPayPay明細は変換対象に残すこと", () => {
    const result = reconcileCsvs(
      SINGLE_PAYMENT_ROW,
      "1,2025/10/24,ダミーストアA,-190,別の口座,食費,食費,メモ,,id01",
    );

    expect(result.matchedCount).toBe(0);
    expect(result.remainingTransactions).toHaveLength(1);
    expect(result.candidates).toEqual([
      expect.objectContaining({
        key: "id01",
        actualInstitution: "別の口座",
      }),
    ]);
  });

  it("MFME側に余った同一明細だけを要確認にすること", () => {
    const result = reconcileCsvs(
      SINGLE_PAYMENT_ROW,
      "1,2025/10/24,ダミーストアA,-190,PayPay残高,食費,食費,メモ,,id01\n1,2025/10/24,ダミーストアA,-190,PayPay残高,食費,食費,メモ,,id02",
    );

    expect(result.matchedCount).toBe(1);
    expect(result.candidates.map(({ key }) => key)).toEqual(["id02"]);
  });

  it("同じ取引が双方に2件あればすべて一致させること", () => {
    const result = reconcileCsvs(
      `${SINGLE_PAYMENT_ROW}\n${createSecondSinglePaymentRow()}`,
      "1,2025/10/24,ダミーストアA,-190,PayPay残高,食費,食費,メモ,,id01\n1,2025/10/24,ダミーストアA,-190,PayPay残高,食費,食費,メモ,,id02",
    );

    expect(result.matchedCount).toBe(2);
    expect(result.remainingTransactions).toHaveLength(0);
    expect(result.candidates).toHaveLength(0);
  });

  it("同じ内容でも支払い方法が異なる正当な明細を一致させること", () => {
    const pointPaymentRow = SINGLE_PAYMENT_ROW.replace(
      "PayPay残高",
      "PayPayポイント",
    ).replace(/0001$/, "0005");
    const result = reconcileCsvs(
      `${SINGLE_PAYMENT_ROW}\n${pointPaymentRow}`,
      "1,2025/10/24,ダミーストアA,-190,PayPay残高,食費,食費,メモ,,id01\n1,2025/10/24,ダミーストアA,-190,PayPayポイント,食費,食費,メモ,,id02",
    );

    expect(result.matchedCount).toBe(2);
    expect(result.candidates).toHaveLength(0);
  });

  it("PayPayに同じ日付・金額・内容がないMFME明細は候補にしないこと", () => {
    const result = reconcileCsvs(
      SINGLE_PAYMENT_ROW,
      "1,2025/10/25,別の支払い,-500,別の口座,食費,食費,メモ,,id01",
    );

    expect(result.remainingTransactions).toHaveLength(1);
    expect(result.candidates).toHaveLength(0);
  });

  it("引用符の表記ゆれがある明細を一致させること", () => {
    const payPayRow = SINGLE_PAYMENT_ROW.replace(
      "ダミーストアA",
      "ダミー＇店舗 - ダミー'店舗",
    );
    const result = reconcileCsvs(
      payPayRow,
      "1,2025/10/24,ダミー＇店舗 - ダミー’店舗,-190,PayPay残高,食費,食費,メモ,,id01",
    );

    expect(result.matchedCount).toBe(1);
    expect(result.candidates).toHaveLength(0);
  });
});
