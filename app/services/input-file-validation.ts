import type { FileStats } from "~/services/csv-date";
import { detectCsvFileType } from "~/services/csv-file-type";
import { type MfmeParsedResult, parseMfmeCsvs } from "~/services/mfme-csv";
import {
  extractTransactionsFromPayPayCsv,
  type PayPayTransaction,
} from "~/services/paypay-csv";
import { createFileFingerprint } from "~/utils/file-fingerprint";
import { readFileAsTextAuto } from "~/utils/file-reader";

export type PayPayParsedData = {
  transactions: PayPayTransaction[];
  stats: FileStats;
  headers: string[];
  fingerprint: string;
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
    let extracted: ReturnType<typeof extractTransactionsFromPayPayCsv>;
    try {
      extracted = extractTransactionsFromPayPayCsv(content);
    } catch {
      throw new Error("PayPayの取引履歴の明細を読み込めませんでした。");
    }
    if (extracted.transactions.length === 0) {
      throw new Error("PayPay残高・PayPayポイントなどの対象取引がありません。");
    }
    return {
      type,
      file,
      data: { ...extracted, fingerprint: await createFileFingerprint(file) },
    };
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

// PayPayの取引履歴は1つだけ使うため、複数あるときは明細の最終日が最も新しいものを選ぶ。
export const selectLatestPayPayFile = <
  T extends { data: Pick<PayPayParsedData, "stats"> },
>(
  files: readonly T[],
): T | null =>
  files.reduce<T | null>((latest, current) => {
    if (!latest) return current;
    const latestEnd = latest.data.stats.endDate?.getTime() ?? 0;
    const currentEnd = current.data.stats.endDate?.getTime() ?? 0;
    return currentEnd > latestEnd ? current : latest;
  }, null);
