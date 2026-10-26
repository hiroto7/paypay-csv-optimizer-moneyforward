import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FileStats } from "~/services/csv-date";
import type { CsvRecord } from "~/services/csv-schema";
import {
  type PayPayParsedData,
  selectLatestPayPayFile,
  type ValidatedInputFile,
  validateInputFile,
} from "~/services/input-file-validation";
import { combineMfmeData, type MfmeParsedResult } from "~/services/mfme-csv";
import { isPp2mfOutputFilename } from "~/utils/pp2mf-output-filename";
import {
  clearInputFiles,
  deleteSharedFilesExcept,
  type InputFiles,
  loadInputFiles,
  mergeUniqueFiles,
  readSharedFiles,
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

// 入出金履歴を変更する前に、取り込み記録のリセットを確認するための内容。
export type MfmeChangePreview = {
  kind: "add" | "remove";
  files: { name: string; stats: FileStats | null }[];
  nextRecords: CsvRecord[];
};

// 共有で受け取ったファイルを読み込む前に、ファイルごとの扱いを確認するための内容。
export type SharedFilesPreview = {
  fileCount: number;
  payPay: { file: File; data: PayPayParsedData } | null;
  currentPayPayFile: File | null;
  unusedPayPayFiles: File[];
  mfme: { file: File; data: MfmeParsedResult; replaces: boolean }[];
  nextMfmeRecords: CsvRecord[];
  rejected: RejectedInputFile[];
};

// 保存待ちの確認が終わるまで読み込みを後回しにしている、共有で受け取ったファイル。
export type DeferredShare =
  | { kind: "pending"; fileNames: string[] }
  | { kind: "pp2mf-output"; file: File };

type InputState = {
  files: InputFiles;
  payPayData: PayPayParsedData | null;
  mfmeDataByName: ReadonlyMap<string, MfmeParsedResult>;
};

type InputOperation = (current: InputState) => Promise<void>;

const SHARED_FILES_PARAM = "shared-files";
const PP2MF_OUTPUT_REASON =
  "PP2MFで作成した取り込み用CSVです。共有シートではMoneyForward MEを選んでください。";

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

const removeUrlParams = (names: readonly string[]) => {
  const params = new URLSearchParams(window.location.search);
  if (!names.some((name) => params.has(name))) return;
  for (const name of names) params.delete(name);
  const cleanUrl = `${window.location.pathname}${
    params.size > 0 ? `?${params.toString()}` : ""
  }${window.location.hash}`;
  window.history.replaceState(window.history.state, "", cleanUrl);
};

type InputFilesStoreCallbacks = {
  onPayPayFileChanged: (fingerprint: string | null) => void;
  // 取り込み記録をリセットした場合はtrueを返す。
  onMfmeFilesChanged: () => boolean;
  hasPendingImport: () => boolean;
  confirmMfmeChange: (preview: MfmeChangePreview) => Promise<boolean>;
  confirmSharedFiles: (preview: SharedFilesPreview) => Promise<boolean>;
};

export function useInputFilesStore(callbacks: InputFilesStoreCallbacks) {
  const [inputState, setInputState] = useState<InputState>(emptyInputState);
  const [isReady, setIsReady] = useState(false);
  const [notice, setNotice] = useState<SharedFileNotice | null>(null);
  const [payPayError, setPayPayError] = useState("");
  const [mfmeErrors, setMfmeErrors] = useState<RejectedInputFile[]>([]);
  const [deferredShare, setDeferredShare] = useState<DeferredShare | null>(
    null,
  );
  const inputStateRef = useRef(inputState);
  const operationQueueRef = useRef<Promise<void>>(Promise.resolve());
  const mountedRef = useRef(true);
  const initializedRef = useRef(false);
  const deferredShareIdRef = useRef<string | null>(null);
  // 確認画面などの呼び出し側の状態が変わっても、実行中の処理から最新の関数を呼べるようにする。
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

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

  const showNotice = useCallback((nextNotice: SharedFileNotice) => {
    if (mountedRef.current) setNotice(nextNotice);
  }, []);

  const reportPersistenceError = useCallback(
    (error: unknown) => {
      console.error("Failed to save input files:", error);
      showNotice({
        tone: "error",
        message: "選択したCSVファイルの保存に失敗しました。",
      });
    },
    [showNotice],
  );

  const reportMfmeChange = useCallback(() => {
    const didResetImportedRecords = callbacksRef.current.onMfmeFilesChanged();
    if (didResetImportedRecords) {
      showNotice({
        tone: "success",
        message:
          "MoneyForward MEの入出金履歴を変更したため、以前の「保存した」記録をリセットしました。",
      });
    }
    return didResetImportedRecords;
  }, [showNotice]);

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
          callbacksRef.current.onPayPayFileChanged(data?.fingerprint ?? null);
          applyInputState({ ...current, files: nextFiles, payPayData: data });
          if (mountedRef.current) setPayPayError("");
        } catch (error) {
          reportPersistenceError(error);
        }
      });
    },
    [applyInputState, enqueue, reportPersistenceError],
  );

  const addMfmeFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      void enqueue(async (current) => {
        const { accepted, rejected } = await validateFiles(files, "mfme");
        const valid = accepted.flatMap((item) =>
          item.type === "mfme" ? [item] : [],
        );
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
        const confirmed = await callbacksRef.current.confirmMfmeChange({
          kind: "add",
          files: valid.map(({ file, data }) => ({
            name: file.name,
            stats: data.stats,
          })),
          nextRecords:
            combineMfmeData(nextFiles.mfmeFiles, nextData)?.records ?? [],
        });
        if (!confirmed) {
          if (mountedRef.current) setMfmeErrors(rejected);
          return;
        }

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
        const confirmed = await callbacksRef.current.confirmMfmeChange({
          kind: "remove",
          files: [
            { name, stats: current.mfmeDataByName.get(name)?.stats ?? null },
          ],
          nextRecords:
            combineMfmeData(nextFiles.mfmeFiles, nextData)?.records ?? [],
        });
        if (!confirmed) return;

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

  const finishSharedFiles = useCallback(async () => {
    deferredShareIdRef.current = null;
    if (mountedRef.current) setDeferredShare(null);
    removeUrlParams([SHARED_FILES_PARAM]);
    try {
      await deleteSharedFilesExcept(null);
    } catch (error) {
      console.warn("Failed to delete shared files:", error);
    }
  }, []);

  const processSharedFiles = useCallback(
    async (id: string, current: InputState) => {
      const files = await readSharedFiles(id);
      if (files.length === 0) {
        showNotice({
          tone: "error",
          message:
            "共有ファイルの一時データが見つかりませんでした。もう一度共有してください。",
        });
        await finishSharedFiles();
        return;
      }

      // 保存待ちの確認が終わるまで、受け取ったファイルはURLと一時データに残しておく。
      if (callbacksRef.current.hasPendingImport()) {
        const pp2mfOutput = files.find((file) =>
          isPp2mfOutputFilename(file.name),
        );
        deferredShareIdRef.current = id;
        if (mountedRef.current) {
          setDeferredShare(
            pp2mfOutput
              ? { kind: "pp2mf-output", file: pp2mfOutput }
              : {
                  kind: "pending",
                  fileNames: files.map((file) => file.name),
                },
          );
        }
        return;
      }

      const pp2mfOutputs = files.filter((file) =>
        isPp2mfOutputFilename(file.name),
      );
      const { accepted, rejected } = await validateFiles(
        files.filter((file) => !isPp2mfOutputFilename(file.name)),
      );
      const payPayFiles = accepted.flatMap((item) =>
        item.type === "paypay" ? [item] : [],
      );
      const mfme = accepted.flatMap((item) =>
        item.type === "mfme" ? [item] : [],
      );
      const payPay = selectLatestPayPayFile(payPayFiles);
      const nextMfmeFiles =
        mfme.length > 0
          ? mergeUniqueFiles(
              current.files.mfmeFiles,
              mfme.map(({ file }) => file),
            )
          : current.files.mfmeFiles;
      const nextMfmeData = new Map(current.mfmeDataByName);
      for (const item of mfme) nextMfmeData.set(item.file.name, item.data);

      const confirmed = await callbacksRef.current.confirmSharedFiles({
        fileCount: files.length,
        payPay: payPay && { file: payPay.file, data: payPay.data },
        currentPayPayFile: current.files.payPayFile,
        unusedPayPayFiles: payPayFiles
          .filter((item) => item !== payPay)
          .map(({ file }) => file),
        mfme: mfme.map(({ file, data }) => ({
          file,
          data,
          replaces: current.files.mfmeFiles.some(
            (currentFile) => currentFile.name === file.name,
          ),
        })),
        nextMfmeRecords:
          combineMfmeData(nextMfmeFiles, nextMfmeData)?.records ?? [],
        rejected: [
          ...pp2mfOutputs.map((file) => ({
            name: file.name,
            reason: PP2MF_OUTPUT_REASON,
          })),
          ...rejected,
        ],
      });

      if (confirmed && (payPay || mfme.length > 0)) {
        const nextFiles: InputFiles = {
          payPayFile: payPay?.file ?? current.files.payPayFile,
          mfmeFiles: nextMfmeFiles,
        };
        try {
          await persistInputFiles(nextFiles);
          // 入出金履歴を変えると記録をリセットすることは、確認画面で伝えている。
          if (mfme.length > 0) callbacksRef.current.onMfmeFilesChanged();
          if (payPay) {
            callbacksRef.current.onPayPayFileChanged(payPay.data.fingerprint);
            if (mountedRef.current) setPayPayError("");
          }
          applyInputState({
            files: nextFiles,
            payPayData: payPay?.data ?? current.payPayData,
            mfmeDataByName: nextMfmeData,
          });
          showNotice({
            tone: "success",
            message: "共有されたファイルを読み込みました。",
          });
        } catch (error) {
          reportPersistenceError(error);
        }
      }

      await finishSharedFiles();
    },
    [applyInputState, finishSharedFiles, reportPersistenceError, showNotice],
  );

  const resumeDeferredShare = useCallback(() => {
    const id = deferredShareIdRef.current;
    if (!id) return;
    deferredShareIdRef.current = null;
    setDeferredShare(null);
    void enqueue(async (current) => {
      try {
        await processSharedFiles(id, current);
      } catch (error) {
        console.error("Failed to load shared files:", error);
        showNotice({
          tone: "error",
          message:
            "共有されたCSVファイルの読み込みに失敗しました。通常のファイル選択をお試しください。",
        });
        await finishSharedFiles();
      }
    });
  }, [enqueue, finishSharedFiles, processSharedFiles, showNotice]);

  const discardDeferredShare = useCallback(() => {
    void enqueue(finishSharedFiles);
  }, [enqueue, finishSharedFiles]);

  useEffect(() => {
    mountedRef.current = true;
    if (initializedRef.current) {
      return () => {
        mountedRef.current = false;
      };
    }
    initializedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const sharedFilesId = params.get(SHARED_FILES_PARAM);
    const shareError = params.get("share-error");
    // 受け取ったファイルのIDは、読み込みが終わるまでリロードに備えてURLに残す。
    removeUrlParams(["share-error", "share-debug"]);

    void enqueue(async () => {
      try {
        const saved = await loadInputFiles();
        const payPay = saved.payPayFile
          ? await validateFiles([saved.payPayFile], "paypay")
          : { accepted: [], rejected: [] };
        const mfme = await validateFiles(saved.mfmeFiles, "mfme");
        const validPayPay = payPay.accepted[0];
        const validMfme = mfme.accepted.flatMap((item) =>
          item.type === "mfme" ? [item] : [],
        );
        const nextFiles: InputFiles = {
          payPayFile: validPayPay?.type === "paypay" ? validPayPay.file : null,
          mfmeFiles: validMfme.map(({ file }) => file),
        };
        const removedMfme = mfme.rejected.length > 0;
        if (payPay.rejected.length > 0 || removedMfme) {
          await persistInputFiles(nextFiles);
          if (payPay.rejected.length > 0) {
            callbacksRef.current.onPayPayFileChanged(null);
          }
          if (removedMfme) reportMfmeChange();
          showNotice({
            tone: "error",
            message:
              "保存済みの入力ファイルに読み込めないものがあったため、除外しました。",
          });
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
      } finally {
        if (mountedRef.current) setIsReady(true);
      }
    });

    // 読み込みが終わらないまま残った、以前に受け取ったファイルを削除する。
    void deleteSharedFilesExcept(sharedFilesId).catch((error: unknown) => {
      console.warn("Failed to delete stale shared files:", error);
    });

    if (shareError) {
      showNotice({
        tone: "error",
        message:
          "共有されたCSVファイルを受け取れませんでした。通常のファイル選択をお試しください。",
      });
    } else if (sharedFilesId) {
      void enqueue(async (current) => {
        try {
          await processSharedFiles(sharedFilesId, current);
        } catch (error) {
          console.error("Failed to load shared files:", error);
          showNotice({
            tone: "error",
            message:
              "共有されたCSVファイルの読み込みに失敗しました。通常のファイル選択をお試しください。",
          });
          await finishSharedFiles();
        }
      });
    }

    return () => {
      mountedRef.current = false;
    };
  }, [
    applyInputState,
    enqueue,
    finishSharedFiles,
    processSharedFiles,
    reportMfmeChange,
    reportPersistenceError,
    showNotice,
  ]);

  const mfmeData = useMemo(
    () =>
      combineMfmeData(inputState.files.mfmeFiles, inputState.mfmeDataByName),
    [inputState.files.mfmeFiles, inputState.mfmeDataByName],
  );

  return {
    isReady,
    payPayFile: inputState.files.payPayFile,
    mfmeFiles: inputState.files.mfmeFiles,
    payPayData: inputState.payPayData,
    mfmeData,
    mfmeDataByName: inputState.mfmeDataByName,
    payPayError,
    mfmeErrors,
    notice,
    dismissNotice: () => setNotice(null),
    deferredShare,
    resumeDeferredShare,
    discardDeferredShare,
    selectPayPayFile,
    addMfmeFiles,
    removeMfmeFile,
  };
}
