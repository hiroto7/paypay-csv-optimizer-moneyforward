import { useEffect, useState } from "react";
import { useInputFilesStore } from "~/hooks/useInputFilesStore";
import type { FileStats } from "~/services/csv-date";
import { type MfmeParsedResult, parseMfmeCsvs } from "~/services/mfme-csv";
import {
  extractTransactionsFromPayPayCsv,
  type PayPayTransaction,
} from "~/services/paypay-csv";
import { readFileAsTextAuto, readFilesAsTextAuto } from "~/utils/file-reader";

export type PayPayParsedData = {
  transactions: PayPayTransaction[];
  stats: FileStats;
  headers: string[];
};

type ParsedState<T> = {
  data: T | null;
  error: string;
};

const useParsedSource = <Source, Result>(
  source: Source,
  empty: boolean,
  parse: (source: Source) => Promise<Result>,
) => {
  const [state, setState] = useState<ParsedState<Result>>({
    data: null,
    error: "",
  });

  useEffect(() => {
    let active = true;

    if (empty) {
      setState({ data: null, error: "" });
      return;
    }

    setState({ data: null, error: "" });
    void parse(source)
      .then((data) => {
        if (active) {
          setState({ data, error: "" });
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          data: null,
          error:
            error instanceof Error
              ? error.message
              : "CSVファイルを読み込めませんでした。",
        });
      });

    return () => {
      active = false;
    };
  }, [empty, parse, source]);

  return state;
};

const parsePayPayFile = async (
  file: File | null,
): Promise<PayPayParsedData> => {
  if (!file) {
    throw new Error("PayPayの取引履歴が選択されていません。");
  }
  const result = extractTransactionsFromPayPayCsv(
    await readFileAsTextAuto(file),
  );
  if (result.transactions.length === 0) {
    throw new Error("PayPay残高・PayPayポイントなどの対象取引がありません。");
  }
  return result;
};

const parseMfmeFiles = async (files: File[]): Promise<MfmeParsedResult> => {
  const result = parseMfmeCsvs(await readFilesAsTextAuto(files));
  if (result.stats.count === 0) {
    throw new Error(
      "MoneyForward MEから書き出した入出金履歴を読み込めませんでした。ファイルを確認してください。",
    );
  }
  return result;
};

type InputWorkspaceCallbacks = {
  onPayPayFileChanged: () => void;
  onMfmeFilesChanged: () => boolean;
};

export function useInputWorkspace({
  onPayPayFileChanged,
  onMfmeFilesChanged,
}: InputWorkspaceCallbacks) {
  const files = useInputFilesStore({
    onPayPayFileChanged,
    onMfmeFilesChanged,
  });
  const payPay = useParsedSource(
    files.payPayFile,
    files.payPayFile === null,
    parsePayPayFile,
  );
  const mfme = useParsedSource(
    files.mfmeFiles,
    files.mfmeFiles.length === 0,
    parseMfmeFiles,
  );

  return {
    ...files,
    payPayData: payPay.data,
    payPayError: payPay.error,
    mfmeData: mfme.data,
    mfmeError: mfme.error,
  };
}
