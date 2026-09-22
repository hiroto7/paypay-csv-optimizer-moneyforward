import { useCallback, useEffect, useRef, useState } from "react";
import {
  type PayPayParsedData,
  type ValidatedInputFile,
  validateInputFile,
} from "~/services/input-file-validation";
import type { MfmeParsedResult } from "~/services/mfme-csv";
import { isPp2mfOutputFilename } from "~/utils/pp2mf-output-filename";
import {
  clearInputFiles,
  consumeSharedFiles,
  type InputFiles,
  loadInputFiles,
  mergeUniqueFiles,
  saveInputFiles,
} from "~/utils/shared-file-store";

export type SharedFileNotice = {
  tone: "success" | "error";
  message: string;
};

export type RejectedInputFile = {
  name: string;
  reason: string;
};

type InputState = {
  files: InputFiles;
  payPayData: PayPayParsedData | null;
  mfmeDataByName: ReadonlyMap<string, MfmeParsedResult>;
};

type InputOperation = (current: InputState) => Promise<void>;

const emptyInputState = (): InputState => ({
  files: { payPayFile: null, mfmeFiles: [] },
  payPayData: null,
  mfmeDataByName: new Map(),
});

const persistInputFiles = async (inputFiles: InputFiles): Promise<void> => {
  if (!inputFiles.payPayFile && inputFiles.mfmeFiles.length === 0) {
    await clearInputFiles();
  } else {
    await saveInputFiles(inputFiles);
  }
};

const validationReason = (error: unknown): string =>
  error instanceof Error
    ? error.message
    : "CSVファイルを読み込めませんでした。";

const validateFiles = async (
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

const describeRejectedFiles = (files: readonly RejectedInputFile[]): string =>
  files.map(({ name, reason }) => `${name}: ${reason}`).join(" ");

type InputFilesStoreCallbacks = {
  onPayPayFileChanged: () => void;
  onMfmeFilesChanged: () => boolean;
};

export function useInputFilesStore({
  onPayPayFileChanged,
  onMfmeFilesChanged,
}: InputFilesStoreCallbacks) {
  const [inputState, setInputState] = useState<InputState>(emptyInputState);
  const [notice, setNotice] = useState<SharedFileNotice | null>(null);
  const [payPayError, setPayPayError] = useState("");
  const [mfmeErrors, setMfmeErrors] = useState<RejectedInputFile[]>([]);
  const inputStateRef = useRef(inputState);
  const operationQueueRef = useRef<Promise<void>>(Promise.resolve());
  const mountedRef = useRef(true);

  const applyInputState = useCallback((nextState: InputState) => {
    inputStateRef.current = nextState;
    if (mountedRef.current) setInputState(nextState);
  }, []);

  const enqueue = useCallback((operation: InputOperation) => {
    const nextOperation = operationQueueRef.current.then(() =>
      operation(inputStateRef.current),
    );
    operationQueueRef.current = nextOperation.catch(() => undefined);
    return nextOperation;
  }, []);

  const reportPersistenceError = useCallback((error: unknown) => {
    console.error("Failed to save input files:", error);
    if (mountedRef.current) {
      setNotice({
        tone: "error",
        message: "選択したCSVファイルの保存に失敗しました。",
      });
    }
  }, []);

  const reportMfmeChange = useCallback(() => {
    const didResetImportedRecords = onMfmeFilesChanged();
    if (didResetImportedRecords && mountedRef.current) {
      setNotice({
        tone: "success",
        message:
          "MoneyForward MEの入出金履歴を更新したため、以前の「保存した」記録をリセットしました。",
      });
    }
    return didResetImportedRecords;
  }, [onMfmeFilesChanged]);

  const selectPayPayFile = useCallback(
    (file: File | null) => {
      void enqueue(async (current) => {
        let data: PayPayParsedData | null = null;
        if (file) {
          const result = await validateFiles([file], "paypay");
          if (result.rejected[0]) {
            if (mountedRef.current) {
              setPayPayError(describeRejectedFiles(result.rejected));
            }
            return;
          }
          const accepted = result.accepted[0];
          if (accepted?.type !== "paypay") return;
          data = accepted.data;
        }

        if (!file && !current.files.payPayFile) {
          if (mountedRef.current) setPayPayError("");
          return;
        }
        const nextFiles = { ...current.files, payPayFile: file };
        try {
          await persistInputFiles(nextFiles);
          onPayPayFileChanged();
          applyInputState({ ...current, files: nextFiles, payPayData: data });
          if (mountedRef.current) setPayPayError("");
        } catch (error) {
          reportPersistenceError(error);
        }
      });
    },
    [applyInputState, enqueue, onPayPayFileChanged, reportPersistenceError],
  );

  const addMfmeFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      void enqueue(async (current) => {
        const { accepted, rejected } = await validateFiles(files, "mfme");
        const valid = accepted.filter((item) => item.type === "mfme");
        if (valid.length === 0) {
          if (mountedRef.current) setMfmeErrors(rejected);
          return;
        }

        const nextFiles = {
          ...current.files,
          mfmeFiles: mergeUniqueFiles(
            current.files.mfmeFiles,
            valid.map(({ file }) => file),
          ),
        };
        const nextData = new Map(current.mfmeDataByName);
        for (const item of valid) nextData.set(item.file.name, item.data);
        try {
          await persistInputFiles(nextFiles);
          reportMfmeChange();
          applyInputState({
            ...current,
            files: nextFiles,
            mfmeDataByName: nextData,
          });
          if (mountedRef.current) setMfmeErrors(rejected);
        } catch (error) {
          reportPersistenceError(error);
        }
      });
    },
    [applyInputState, enqueue, reportMfmeChange, reportPersistenceError],
  );

  const removeMfmeFile = useCallback(
    (name: string) => {
      void enqueue(async (current) => {
        if (!current.files.mfmeFiles.some((file) => file.name === name)) return;
        const nextFiles = {
          ...current.files,
          mfmeFiles: current.files.mfmeFiles.filter(
            (file) => file.name !== name,
          ),
        };
        const nextData = new Map(current.mfmeDataByName);
        nextData.delete(name);
        try {
          await persistInputFiles(nextFiles);
          reportMfmeChange();
          applyInputState({
            ...current,
            files: nextFiles,
            mfmeDataByName: nextData,
          });
          if (mountedRef.current) setMfmeErrors([]);
        } catch (error) {
          reportPersistenceError(error);
        }
      });
    },
    [applyInputState, enqueue, reportMfmeChange, reportPersistenceError],
  );

  useEffect(() => {
    mountedRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const sharedFilesId = params.get("shared-files");
    const shareError = params.get("share-error");

    if (sharedFilesId || shareError || params.has("share-debug")) {
      params.delete("shared-files");
      params.delete("share-error");
      params.delete("share-debug");
      const cleanUrl = `${window.location.pathname}${
        params.size > 0 ? `?${params.toString()}` : ""
      }${window.location.hash}`;
      window.history.replaceState(null, "", cleanUrl);
    }

    void enqueue(async () => {
      try {
        const saved = await loadInputFiles();
        const payPay = saved.payPayFile
          ? await validateFiles([saved.payPayFile], "paypay")
          : { accepted: [], rejected: [] };
        const mfme = await validateFiles(saved.mfmeFiles, "mfme");
        const validPayPay = payPay.accepted[0];
        const validMfme = mfme.accepted.filter((item) => item.type === "mfme");
        const nextFiles: InputFiles = {
          payPayFile: validPayPay?.type === "paypay" ? validPayPay.file : null,
          mfmeFiles: validMfme.map(({ file }) => file),
        };
        const removedMfme = mfme.rejected.length > 0;
        if (payPay.rejected.length > 0 || removedMfme) {
          await persistInputFiles(nextFiles);
          if (payPay.rejected.length > 0) onPayPayFileChanged();
          if (removedMfme) reportMfmeChange();
          if (mountedRef.current) {
            setNotice({
              tone: "error",
              message:
                "保存済みの入力ファイルに読み込めないものがあったため、除外しました。",
            });
          }
        }
        applyInputState({
          files: nextFiles,
          payPayData: validPayPay?.type === "paypay" ? validPayPay.data : null,
          mfmeDataByName: new Map(
            validMfme.map(({ file, data }) => [file.name, data]),
          ),
        });
        if (mountedRef.current) {
          setPayPayError(describeRejectedFiles(payPay.rejected));
          setMfmeErrors(mfme.rejected);
        }
      } catch (error) {
        reportPersistenceError(error);
      }
    });

    if (shareError) {
      setNotice({
        tone: "error",
        message:
          "共有されたCSVファイルを受け取れませんでした。通常のファイル選択をお試しください。",
      });
    } else if (sharedFilesId) {
      void enqueue(async (current) => {
        try {
          const files = await consumeSharedFiles(sharedFilesId);
          if (files.length === 0) {
            if (mountedRef.current) {
              setNotice({
                tone: "error",
                message:
                  "共有ファイルの一時データが見つかりませんでした。もう一度共有してください。",
              });
            }
            return;
          }
          if (files.some((file) => isPp2mfOutputFilename(file.name))) {
            if (mountedRef.current) {
              setNotice({
                tone: "error",
                message:
                  "PP2MFで作成したCSVは読み込みませんでした。共有先にはPP2MFではなくMoneyForward MEを選択してください。",
              });
            }
            return;
          }

          const { accepted, rejected } = await validateFiles(files);
          const payPay = accepted.find((item) => item.type === "paypay");
          const mfme = accepted.filter((item) => item.type === "mfme");
          const nextFiles: InputFiles = {
            payPayFile:
              payPay?.type === "paypay"
                ? payPay.file
                : current.files.payPayFile,
            mfmeFiles:
              mfme.length > 0
                ? mergeUniqueFiles(
                    current.files.mfmeFiles,
                    mfme.map(({ file }) => file),
                  )
                : current.files.mfmeFiles,
          };
          let didResetImportedRecords = false;
          if (payPay || mfme.length > 0) {
            await persistInputFiles(nextFiles);
            if (mfme.length > 0) {
              didResetImportedRecords = onMfmeFilesChanged();
            }
            if (payPay) onPayPayFileChanged();
            const nextData = new Map(current.mfmeDataByName);
            for (const item of mfme) nextData.set(item.file.name, item.data);
            applyInputState({
              files: nextFiles,
              payPayData:
                payPay?.type === "paypay" ? payPay.data : current.payPayData,
              mfmeDataByName: nextData,
            });
          }

          if (!mountedRef.current) return;
          const loadedTypes = [
            payPay ? "PayPayの取引履歴" : null,
            mfme.length > 0
              ? `MoneyForward MEの入出金履歴 ${mfme.length}件`
              : null,
          ].filter((value): value is string => value !== null);
          setNotice({
            tone: rejected.length > 0 ? "error" : "success",
            message:
              rejected.length > 0
                ? `${loadedTypes.length > 0 ? `${loadedTypes.join("と")}を読み込みました。` : ""}読み込めなかったファイル: ${describeRejectedFiles(rejected)}`
                : `${loadedTypes.join("と")}を読み込みました。${didResetImportedRecords ? "以前の「保存した」記録はリセットしました。" : ""}`,
          });
        } catch (error) {
          console.error("Failed to load shared files:", error);
          if (mountedRef.current) {
            setNotice({
              tone: "error",
              message:
                "共有されたCSVファイルの読み込みに失敗しました。通常のファイル選択をお試しください。",
            });
          }
        }
      });
    }

    return () => {
      mountedRef.current = false;
    };
  }, [
    applyInputState,
    enqueue,
    onMfmeFilesChanged,
    onPayPayFileChanged,
    reportMfmeChange,
    reportPersistenceError,
  ]);

  return {
    payPayFile: inputState.files.payPayFile,
    mfmeFiles: inputState.files.mfmeFiles,
    payPayData: inputState.payPayData,
    mfmeDataByName: inputState.mfmeDataByName,
    payPayError,
    mfmeErrors,
    notice,
    dismissNotice: () => setNotice(null),
    selectPayPayFile,
    addMfmeFiles,
    removeMfmeFile,
  };
}
