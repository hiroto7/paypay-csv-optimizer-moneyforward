import {
  type PayPayParsedData,
  type ValidatedInputFile,
  validateInputFile,
} from "~/services/input-file-validation";
import type { MfmeParsedResult } from "~/services/mfme-csv";
import { loadInputFiles } from "~/utils/shared-file-store";

export type RejectedInputFile = {
  name: string;
  reason: string;
};

const validationReason = (error: unknown): string =>
  error instanceof Error
    ? error.message
    : "CSVファイルを読み込めませんでした。";

export const validateInputFiles = async (
  files: readonly File[],
  expectedType?: "paypay" | "mfme",
): Promise<{
  accepted: ValidatedInputFile[];
  rejected: RejectedInputFile[];
}> => {
  const results = await Promise.all(
    files.map(async (file) => {
      try {
        return { accepted: await validateInputFile(file, expectedType) };
      } catch (error) {
        return {
          rejected: { name: file.name, reason: validationReason(error) },
        };
      }
    }),
  );
  return {
    accepted: results.flatMap((result) =>
      result.accepted ? [result.accepted] : [],
    ),
    rejected: results.flatMap((result) =>
      result.rejected ? [result.rejected] : [],
    ),
  };
};

export type StoredInputFiles = {
  payPay: { file: File; data: PayPayParsedData } | null;
  payPayRejected: RejectedInputFile[];
  mfme: { file: File; data: MfmeParsedResult }[];
  mfmeRejected: RejectedInputFile[];
};

// 端末に保存した入力ファイルを読み込み、作業画面と要確認明細のページで同じ条件で検証する。
export const loadStoredInputFiles = async (): Promise<StoredInputFiles> => {
  const saved = await loadInputFiles();
  const payPay = saved.payPayFile
    ? await validateInputFiles([saved.payPayFile], "paypay")
    : { accepted: [], rejected: [] };
  const mfme = await validateInputFiles(saved.mfmeFiles, "mfme");
  const validPayPay = payPay.accepted[0];

  return {
    payPay:
      validPayPay?.type === "paypay"
        ? { file: validPayPay.file, data: validPayPay.data }
        : null,
    payPayRejected: payPay.rejected,
    mfme: mfme.accepted.flatMap((item) =>
      item.type === "mfme" ? [{ file: item.file, data: item.data }] : [],
    ),
    mfmeRejected: mfme.rejected,
  };
};
