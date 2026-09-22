import type { FileStats } from "~/services/csv-date";
import { detectCsvFileType } from "~/services/csv-file-type";
import { type MfmeParsedResult, parseMfmeCsvs } from "~/services/mfme-csv";
import {
  extractTransactionsFromPayPayCsv,
  type PayPayTransaction,
} from "~/services/paypay-csv";
import { readFileAsTextAuto } from "~/utils/file-reader";

export type PayPayParsedData = {
  transactions: PayPayTransaction[];
  stats: FileStats;
  headers: string[];
};

export type ValidatedInputFile =
  | { type: "paypay"; file: File; data: PayPayParsedData }
  | { type: "mfme"; file: File; data: MfmeParsedResult };

export const validateInputFile = async (
  file: File,
  expectedType?: "paypay" | "mfme",
): Promise<ValidatedInputFile> => {
  let content: string;
  try {
    content = await readFileAsTextAuto(file);
  } catch {
    throw new Error("CSVファイルを読み込めませんでした。");
  }
  const type = detectCsvFileType(content);

  if (type === "unknown") {
    throw new Error(
      "PayPayの取引履歴またはMoneyForward MEの入出金履歴に必要な列がありません。",
    );
  }
  if (expectedType && type !== expectedType) {
    throw new Error(
      expectedType === "paypay"
        ? "PayPayの取引履歴のCSVファイルを選んでください。"
        : "MoneyForward MEの入出金履歴のCSVファイルを選んでください。",
    );
  }

  if (type === "paypay") {
    let data: PayPayParsedData;
    try {
      data = extractTransactionsFromPayPayCsv(content);
    } catch {
      throw new Error("PayPayの取引履歴の明細を読み込めませんでした。");
    }
    if (data.transactions.length === 0) {
      throw new Error("PayPay残高・PayPayポイントなどの対象取引がありません。");
    }
    return { type, file, data };
  }

  let data: MfmeParsedResult;
  try {
    data = parseMfmeCsvs([content]);
  } catch {
    throw new Error(
      "MoneyForward MEの入出金履歴の明細を読み込めませんでした。",
    );
  }
  if (data.stats.count === 0) {
    throw new Error("有効な入出金明細がありません。");
  }
  return { type, file, data };
};
