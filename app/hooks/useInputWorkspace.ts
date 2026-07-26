import { useEffect, useState } from "react";
import { useInputFilesStore } from "~/hooks/useInputFilesStore";
import type { FileStats } from "~/services/csv-date";
import { countExclusions } from "~/services/local-exclusion-store";
import {
  createMfmeExclusionSet,
  type MfmeParsedResult,
} from "~/services/mfme-csv";
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
  onSettled?: () => void,
) => {
  const [state, setState] = useState<ParsedState<Result>>({
    data: null,
    error: "",
  });

  useEffect(() => {
    let active = true;

    if (empty) {
      setState({ data: null, error: "" });
      onSettled?.();
      return;
    }

    setState((current) => ({ ...current, error: "" }));
    void parse(source)
      .then((data) => {
        if (active) {
          setState({ data, error: "" });
          onSettled?.();
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
        onSettled?.();
      });

    return () => {
      active = false;
    };
  }, [empty, onSettled, parse, source]);

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
  const result = createMfmeExclusionSet(await readFilesAsTextAuto(files));
  if (countExclusions(result.exclusionCounts) === 0) {
    throw new Error(
      "MoneyForward MEから書き出した入出金履歴を読み込めませんでした。ファイルを確認してください。",
    );
  }
  return result;
};

type InputWorkspaceCallbacks = {
  onMfmeFilesChanged: () => boolean;
  onPayPayParseSettled: () => void;
};

export function useInputWorkspace({
  onMfmeFilesChanged,
  onPayPayParseSettled,
}: InputWorkspaceCallbacks) {
  const files = useInputFilesStore(onMfmeFilesChanged);
  const payPay = useParsedSource(
    files.payPayFile,
    files.payPayFile === null,
    parsePayPayFile,
    onPayPayParseSettled,
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
