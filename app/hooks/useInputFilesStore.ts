import { useCallback, useEffect, useRef, useState } from "react";
import { detectCsvFileType } from "~/services/csv-file-type";
import { createFileIdentity, readFileAsTextAuto } from "~/utils/file-reader";
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

type InputOperation = (currentFiles: InputFiles) => Promise<void>;

const emptyInputFiles = (): InputFiles => ({
  payPayFile: null,
  mfmeFiles: [],
});

const persistInputFiles = async (inputFiles: InputFiles): Promise<void> => {
  if (!inputFiles.payPayFile && inputFiles.mfmeFiles.length === 0) {
    await clearInputFiles();
  } else {
    await saveInputFiles(inputFiles);
  }
};

const haveSameFiles = async (
  currentFiles: readonly File[],
  nextFiles: readonly File[],
): Promise<boolean> => {
  const [currentIds, nextIds] = await Promise.all([
    Promise.all(currentFiles.map(createFileIdentity)),
    Promise.all(nextFiles.map(createFileIdentity)),
  ]);
  const currentSet = new Set(currentIds);
  const nextSet = new Set(nextIds);
  return (
    currentSet.size === nextSet.size &&
    nextIds.every((identity) => currentSet.has(identity))
  );
};

export function useInputFilesStore(onMfmeFilesChanged: () => boolean) {
  const [inputFiles, setInputFiles] = useState<InputFiles>(emptyInputFiles);
  const [notice, setNotice] = useState<SharedFileNotice | null>(null);
  const inputFilesRef = useRef(inputFiles);
  const operationQueueRef = useRef<Promise<void>>(Promise.resolve());
  const mountedRef = useRef(true);

  const applyInputFiles = useCallback((nextFiles: InputFiles) => {
    inputFilesRef.current = nextFiles;
    if (mountedRef.current) setInputFiles(nextFiles);
  }, []);

  const enqueue = useCallback((operation: InputOperation) => {
    const nextOperation = operationQueueRef.current.then(() =>
      operation(inputFilesRef.current),
    );
    operationQueueRef.current = nextOperation.catch(() => undefined);
    return nextOperation;
  }, []);

  const reportPersistenceError = useCallback((error: unknown) => {
    console.error("Failed to save input files:", error);
    if (mountedRef.current) {
      setNotice({
        tone: "error",
        message: "選択したCSVの保存に失敗しました。",
      });
    }
  }, []);

  const selectPayPayFile = useCallback(
    (file: File | null) => {
      void enqueue(async (currentFiles) => {
        const nextFiles = { ...currentFiles, payPayFile: file };
        try {
          await persistInputFiles(nextFiles);
          applyInputFiles(nextFiles);
        } catch (error) {
          reportPersistenceError(error);
        }
      });
    },
    [applyInputFiles, enqueue, reportPersistenceError],
  );

  const replaceMfmeFiles = useCallback(
    (files: File[]) => {
      void enqueue(async (currentFiles) => {
        try {
          const changed = !(await haveSameFiles(currentFiles.mfmeFiles, files));
          const didResetImportedRecords = changed && onMfmeFilesChanged();
          const nextFiles = { ...currentFiles, mfmeFiles: files };
          await persistInputFiles(nextFiles);
          applyInputFiles(nextFiles);
          if (didResetImportedRecords && mountedRef.current) {
            setNotice({
              tone: "success",
              message:
                "MoneyForward MEの入出金履歴を更新したため、以前の「保存した」記録をリセットしました。",
            });
          }
        } catch (error) {
          reportPersistenceError(error);
        }
      });
    },
    [applyInputFiles, enqueue, onMfmeFilesChanged, reportPersistenceError],
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
        applyInputFiles(await loadInputFiles());
      } catch (error) {
        reportPersistenceError(error);
      }
    });

    if (shareError) {
      setNotice({
        tone: "error",
        message:
          "共有されたCSVを受け取れませんでした。通常のファイル選択をお試しください。",
      });
    } else if (sharedFilesId) {
      void enqueue(async (currentFiles) => {
        try {
          const files = await consumeSharedFiles(sharedFilesId);
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
          const classifiedFiles = await Promise.all(
            files.map(async (file) => ({
              file,
              type: detectCsvFileType(await readFileAsTextAuto(file)),
            })),
          );
          const payPayFiles = classifiedFiles.filter(
            ({ type }) => type === "paypay",
          );
          const receivedMfmeFiles = classifiedFiles
            .filter(({ type }) => type === "mfme")
            .map(({ file }) => file);
          const unknownFiles = classifiedFiles.filter(
            ({ type }) => type === "unknown",
          );

          const knownMfmeIds = new Set(
            await Promise.all(currentFiles.mfmeFiles.map(createFileIdentity)),
          );
          const receivedMfmeFilesWithIds = await Promise.all(
            receivedMfmeFiles.map(async (file) => ({
              file,
              identity: await createFileIdentity(file),
            })),
          );
          const newMfmeFiles = receivedMfmeFilesWithIds
            .filter(({ identity }) => !knownMfmeIds.has(identity))
            .map(({ file }) => file);
          const didResetImportedRecords =
            newMfmeFiles.length > 0 && onMfmeFilesChanged();
          const nextFiles = {
            payPayFile: payPayFiles[0]?.file ?? currentFiles.payPayFile,
            mfmeFiles:
              receivedMfmeFiles.length > 0
                ? await mergeUniqueFiles(
                    currentFiles.mfmeFiles,
                    receivedMfmeFiles,
                  )
                : currentFiles.mfmeFiles,
          };
          await persistInputFiles(nextFiles);
          applyInputFiles(nextFiles);

          if (!mountedRef.current) return;
          if (files.length === 0) {
            setNotice({
              tone: "error",
              message:
                "共有ファイルの一時データが見つかりませんでした。もう一度共有してください。",
            });
            return;
          }

          const loadedTypes = [
            payPayFiles.length > 0 ? "PayPayの取引履歴" : null,
            receivedMfmeFiles.length > 0
              ? `MoneyForward MEの入出金履歴 ${receivedMfmeFiles.length}件`
              : null,
          ].filter((value): value is string => value !== null);
          setNotice({
            tone: unknownFiles.length > 0 ? "error" : "success",
            message:
              unknownFiles.length > 0
                ? loadedTypes.length > 0
                  ? `${loadedTypes.join("と")}を読み込みました。形式を判定できないCSV ${unknownFiles.length}件は読み込みませんでした。`
                  : "PayPayの取引履歴またはMoneyForward MEの入出金履歴として必要な列がないため、共有されたファイルを読み込めませんでした。"
                : `${loadedTypes.join("と")}を読み込みました。${didResetImportedRecords ? "以前の「保存した」記録はリセットしました。" : ""}`,
          });
        } catch (error) {
          console.error("Failed to load shared files:", error);
          if (mountedRef.current) {
            setNotice({
              tone: "error",
              message:
                "共有されたCSVの読み込みに失敗しました。通常のファイル選択をお試しください。",
            });
          }
        }
      });
    }

    return () => {
      mountedRef.current = false;
    };
  }, [applyInputFiles, enqueue, onMfmeFilesChanged, reportPersistenceError]);

  return {
    payPayFile: inputFiles.payPayFile,
    mfmeFiles: inputFiles.mfmeFiles,
    notice,
    dismissNotice: () => setNotice(null),
    selectPayPayFile,
    replaceMfmeFiles,
  };
}
