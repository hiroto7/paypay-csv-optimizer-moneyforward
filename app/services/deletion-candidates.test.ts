import { describe, expect, it } from "vitest";
import {
  createSecondSinglePaymentRow,
  MFME_CSV_HEADER,
  PAYPAY_CSV_HEADER,
  SINGLE_PAYMENT_ROW,
} from "./csv-test-fixtures";
import { findMfmeDeletionCandidates } from "./deletion-candidates";
import { createMfmeExclusionSet } from "./mfme-csv";
import { extractTransactionsFromPayPayCsv } from "./paypay-csv";

describe("findMfmeDeletionCandidates", () => {
  it("別口座に取り込まれたMFME明細を削除候補として抽出できること", () => {
    const payPayCsv = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}`;
    const { transactions } = extractTransactionsFromPayPayCsv(payPayCsv);
    const mfmeCsv = `${MFME_CSV_HEADER}\n1,2025/10/24,ダミーストアA,-190,別の口座,食費,食費,メモ,,id01`;
    const { records } = createMfmeExclusionSet([mfmeCsv]);

    const candidates = findMfmeDeletionCandidates(transactions, records);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.reason).toBe("wrong-account");
    expect(candidates[0]?.expectedInstitution).toBe("PayPay残高");
    expect(candidates[0]?.actualInstitution).toBe("別の口座");
  });

  it("同じ口座に重複して取り込まれたMFME明細の2件目以降を削除候補として抽出できること", () => {
    const payPayCsv = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}`;
    const { transactions } = extractTransactionsFromPayPayCsv(payPayCsv);
    const mfmeCsv = `${MFME_CSV_HEADER}\n1,2025/10/24,ダミーストアA,-190,PayPay残高,食費,食費,メモ,,id01\n1,2025/10/24,ダミーストアA,-190,PayPay残高,食費,食費,メモ,,id02`;
    const { records } = createMfmeExclusionSet([mfmeCsv]);

    const candidates = findMfmeDeletionCandidates(transactions, records);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.reason).toBe("duplicate");
    expect(candidates[0]?.id).toBe("id02");
  });

  it("PayPay側とMoneyForward ME側に同じ取引が2件ずつある場合は候補にしないこと", () => {
    const payPayCsv = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}\n${createSecondSinglePaymentRow()}`;
    const { transactions } = extractTransactionsFromPayPayCsv(payPayCsv);
    const mfmeCsv = `${MFME_CSV_HEADER}\n1,2025/10/24,ダミーストアA,-190,PayPay残高,食費,食費,メモ,,id01\n1,2025/10/24,ダミーストアA,-190,PayPay残高,食費,食費,メモ,,id02`;
    const { records } = createMfmeExclusionSet([mfmeCsv]);

    const candidates = findMfmeDeletionCandidates(transactions, records);

    expect(candidates).toHaveLength(0);
  });

  it("同じ取引条件で支払い方法が異なる正当な明細を別口座候補にしないこと", () => {
    const pointPaymentRow = SINGLE_PAYMENT_ROW.replace(
      "PayPay残高",
      "PayPayポイント",
    ).replace(/0001$/, "0005");
    const payPayCsv = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}\n${pointPaymentRow}`;
    const { transactions } = extractTransactionsFromPayPayCsv(payPayCsv);
    const mfmeCsv = `${MFME_CSV_HEADER}\n1,2025/10/24,ダミーストアA,-190,PayPay残高,食費,食費,メモ,,id01\n1,2025/10/24,ダミーストアA,-190,PayPayポイント,食費,食費,メモ,,id02`;
    const { records } = createMfmeExclusionSet([mfmeCsv]);

    const candidates = findMfmeDeletionCandidates(transactions, records);

    expect(candidates).toHaveLength(0);
  });

  it("同じ取引条件のMoneyForward ME明細がPayPay側より1件多い場合は超過分だけを候補にすること", () => {
    const payPayCsv = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}\n${createSecondSinglePaymentRow()}`;
    const { transactions } = extractTransactionsFromPayPayCsv(payPayCsv);
    const mfmeCsv = `${MFME_CSV_HEADER}\n1,2025/10/24,ダミーストアA,-190,PayPay残高,食費,食費,メモ,,id01\n1,2025/10/24,ダミーストアA,-190,PayPay残高,食費,食費,メモ,,id02\n1,2025/10/24,ダミーストアA,-190,PayPay残高,食費,食費,メモ,,id03`;
    const { records } = createMfmeExclusionSet([mfmeCsv]);

    const candidates = findMfmeDeletionCandidates(transactions, records);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.reason).toBe("duplicate");
    expect(candidates[0]?.id).toBe("id03");
  });

  it("正しい口座の明細がある状態で別口座の余分な明細は重複候補にすること", () => {
    const payPayCsv = `${PAYPAY_CSV_HEADER}\n${SINGLE_PAYMENT_ROW}`;
    const { transactions } = extractTransactionsFromPayPayCsv(payPayCsv);
    const mfmeCsv = `${MFME_CSV_HEADER}\n1,2025/10/24,ダミーストアA,-190,PayPay残高,食費,食費,メモ,,id01\n1,2025/10/24,ダミーストアA,-190,別の口座,食費,食費,メモ,,id02`;
    const { records } = createMfmeExclusionSet([mfmeCsv]);

    const candidates = findMfmeDeletionCandidates(transactions, records);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.reason).toBe("duplicate");
    expect(candidates[0]?.id).toBe("id02");
  });
});
