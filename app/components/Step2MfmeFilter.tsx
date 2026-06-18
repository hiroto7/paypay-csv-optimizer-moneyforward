import {
  AlertCircle,
  CalendarDays,
  Check,
  CircleOff,
  Database,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ClearFileSelectionButton from "~/components/ClearFileSelectionButton";
import CsvDropzone from "~/components/CsvDropzone";
import PeriodDisplay from "~/components/PeriodDisplay";
import type { CsvRecord } from "~/services/csv-schema";
import { countExclusions } from "~/services/local-exclusion-store";
import { createMfmeExclusionSet, type MfFileStats } from "~/services/mfme-csv";
import { createFileIdentity, readFilesAsTextAuto } from "~/utils/file-reader";

export type MfmeParsedData = {
  exclusionCounts: Map<string, number>;
  exclusionStats: Omit<MfFileStats, "duplicates">;
  stats: Omit<MfFileStats, "duplicates">;
  records: CsvRecord[];
  sourceIds: string[];
};

type ConfirmAction = "replace" | "delete-imported" | "delete-all";

interface Step2MfmeFilterProps {
  files: File[];
  onFilesSelected: (files: File[]) => void;
  onDataParsed: (data: MfmeParsedData | null) => void;
  duplicates?: number | undefined;
  totalTransactions?: number | undefined;
  allowSkip: boolean;
  storedBaseStats: Omit<MfFileStats, "duplicates"> | null;
  localImportedRecordCount: number;
  onResetLocalImportedRecords: () => void;
  onClearAllLocalData: () => void;
}

const confirmationCopy: Record<
  ConfirmAction,
  {
    title: string;
    description: string;
    confirmLabel: string;
    destructive: boolean;
  }
> = {
  replace: {
    title: "MoneyForward ME CSVを読み込み直しますか？",
    description:
      "読み込んである明細を新しいCSVの内容に入れ替えます。前回「取り込みました」と記録した明細も削除されます。",
    confirmLabel: "読み込み直す",
    destructive: false,
  },
  "delete-imported": {
    title: "前回の取り込み記録を削除しますか？",
    description:
      "PP2MFで「取り込みました」と記録した明細だけを削除します。MoneyForward ME CSVから読み込んだ明細は残ります。",
    confirmLabel: "記録を削除",
    destructive: true,
  },
  "delete-all": {
    title: "既存明細の除外データを削除しますか？",
    description:
      "MoneyForward ME CSVと「取り込みました」の記録をこの端末から削除します。MoneyForward ME本体の明細には影響しません。",
    confirmLabel: "削除する",
    destructive: true,
  },
};

function ConfirmationDialog({
  action,
  onCancel,
  onConfirm,
}: {
  action: ConfirmAction;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const copy = confirmationCopy[action];
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4">
      <div
        className="w-full max-w-md border border-zinc-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mfme-confirm-title"
        aria-describedby="mfme-confirm-description"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
          <h2
            id="mfme-confirm-title"
            className="text-base font-bold text-zinc-950"
          >
            {copy.title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex size-8 shrink-0 items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="閉じる"
            title="閉じる"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <p
          id="mfme-confirm-description"
          className="px-5 py-5 text-sm leading-6 text-zinc-600"
        >
          {copy.description}
        </p>
        <div className="flex justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-5 py-4">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="h-9 border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`h-9 px-4 text-sm font-semibold text-white ${
              copy.destructive
                ? "bg-red-700 hover:bg-red-600"
                : "bg-zinc-900 hover:bg-zinc-700"
            }`}
          >
            {copy.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Step2MfmeFilter({
  files,
  onFilesSelected,
  onDataParsed,
  duplicates,
  totalTransactions,
  allowSkip,
  storedBaseStats,
  localImportedRecordCount,
  onResetLocalImportedRecords,
  onClearAllLocalData,
}: Step2MfmeFilterProps) {
  const [fileInputVersion, setFileInputVersion] = useState(0);
  const [isMfmeSkipped, setIsMfmeSkipped] = useState(false);
  const [mfStats, setMfStats] = useState<Omit<
    MfFileStats,
    "duplicates"
  > | null>(null);
  const [error, setError] = useState("");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null,
  );
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileSelectionVersion = useRef(0);
  const lastProcessedFiles = useRef<File[] | null>(null);

  const processFiles = useCallback(
    async (selectedFiles: File[]) => {
      const selectionVersion = ++fileSelectionVersion.current;
      if (selectedFiles.length > 0) {
        setIsMfmeSkipped(false);
      }

      if (selectedFiles.length === 0) {
        if (!storedBaseStats) {
          onDataParsed(null);
        }
        setMfStats(null);
        setError("");
        return;
      }

      setError("");

      try {
        const [contents, sourceIds] = await Promise.all([
          readFilesAsTextAuto(selectedFiles),
          Promise.all(selectedFiles.map(createFileIdentity)),
        ]);
        const result = createMfmeExclusionSet(contents);

        if (selectionVersion !== fileSelectionVersion.current) {
          return;
        }

        const exclusionCount = countExclusions(result.exclusionCounts);
        if (exclusionCount === 0) {
          throw new Error(
            "MoneyForward MEの明細を読み込めませんでした。エクスポートしたCSVか確認してください。",
          );
        }

        setMfStats(allowSkip ? result.exclusionStats : result.stats);
        onDataParsed({ ...result, sourceIds });
      } catch (err) {
        if (selectionVersion !== fileSelectionVersion.current) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "MoneyForward ME CSVの読み込みに失敗しました。",
        );
        setMfStats(null);
        onDataParsed(null);
      }
    },
    [allowSkip, onDataParsed, storedBaseStats],
  );

  useEffect(() => {
    if (files === lastProcessedFiles.current) {
      return;
    }

    lastProcessedFiles.current = files;
    if (files.length === 0 && isMfmeSkipped) {
      return;
    }
    void processFiles(files);
  }, [files, isMfmeSkipped, processFiles]);

  const handleFileChange = (selectedFiles: FileList | null) => {
    const nextFiles = Array.from(selectedFiles ?? []);
    if (nextFiles.length === 0) {
      return;
    }

    if (allowSkip && storedBaseStats) {
      setPendingFiles(nextFiles);
      setConfirmAction("replace");
      return;
    }

    onFilesSelected(nextFiles);
  };

  const handleSkip = () => {
    fileSelectionVersion.current++;
    setIsMfmeSkipped(true);
    setFileInputVersion((version) => version + 1);
    onFilesSelected([]);
    onDataParsed({
      exclusionCounts: new Map(),
      exclusionStats: { count: 0, startDate: null, endDate: null },
      stats: { count: 0, startDate: null, endDate: null },
      records: [],
      sourceIds: [],
    });
    setMfStats(null);
    setError("");
  };

  const handleUndo = () => {
    fileSelectionVersion.current++;
    setIsMfmeSkipped(false);
    onDataParsed(null);
    setMfStats(null);
    setError("");
  };

  const handleConfirm = () => {
    if (confirmAction === "replace") {
      onFilesSelected(pendingFiles);
    } else if (confirmAction === "delete-imported") {
      onResetLocalImportedRecords();
    } else if (confirmAction === "delete-all") {
      onClearAllLocalData();
      setIsMfmeSkipped(false);
      setFileInputVersion((version) => version + 1);
    }
    setPendingFiles([]);
    setConfirmAction(null);
  };

  const allTransactionsExcluded =
    allowSkip &&
    !error &&
    totalTransactions !== undefined &&
    duplicates !== undefined &&
    totalTransactions > 0 &&
    duplicates === totalTransactions;
  const displayStats = mfStats ?? storedBaseStats;
  const hasStoredBase = Boolean(storedBaseStats);

  return (
    <section aria-labelledby="mfme-upload-title">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center bg-blue-50 text-blue-700">
          <Database className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2
              id="mfme-upload-title"
              className="text-sm font-bold text-zinc-950"
            >
              {allowSkip ? "既存明細の除外" : "MoneyForward ME明細"}
            </h2>
            <span className="text-xs text-zinc-500">
              {allowSkip ? "任意" : "必須"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">
            {allowSkip
              ? "MoneyForward MEに登録済みの明細を除外"
              : "重複・別口座取り込みの照合対象"}
          </p>
        </div>
      </div>

      {allowSkip && hasStoredBase && !isMfmeSkipped ? (
        <div className="border-y border-zinc-200 py-3">
          <div className="flex items-start gap-2">
            <Check
              className="mt-0.5 size-4 shrink-0 text-emerald-700"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900">
                MoneyForward ME CSVを読み込み済み
              </p>
              <p className="mt-1 text-xs leading-5 text-zinc-600">
                登録済みの明細を、出力するCSVから除外します。
              </p>
            </div>
          </div>

          <dl className="mt-3 grid gap-2 text-xs text-zinc-600">
            <div className="flex items-center justify-between gap-3">
              <dt>読み込んだ明細</dt>
              <dd className="font-semibold text-zinc-900">
                {storedBaseStats?.count ?? 0}件
              </dd>
            </div>
            {storedBaseStats?.startDate && storedBaseStats.endDate && (
              <div className="flex items-center justify-between gap-3">
                <dt>期間</dt>
                <dd className="inline-flex items-center gap-1.5 font-semibold text-zinc-900">
                  <CalendarDays className="size-3.5" aria-hidden="true" />
                  <PeriodDisplay
                    startDate={storedBaseStats.startDate}
                    endDate={storedBaseStats.endDate}
                  />
                </dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <dt>前回「取り込みました」の記録</dt>
              <dd className="font-semibold text-zinc-900">
                {localImportedRecordCount}件
              </dd>
            </div>
          </dl>

          <div className="mt-4">
            <CsvDropzone
              key={fileInputVersion}
              id="mfme-csv-replace-input"
              multiple
              prompt="MoneyForward ME CSVを読み込み直す"
              onFilesSelected={handleFileChange}
            />
          </div>

          <div className="mt-2 flex flex-col items-start gap-1">
            {localImportedRecordCount > 0 && (
              <button
                type="button"
                onClick={() => setConfirmAction("delete-imported")}
                className="inline-flex min-h-8 items-center gap-2 px-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                前回の取り込み記録を削除
              </button>
            )}
            <button
              type="button"
              onClick={() => setConfirmAction("delete-all")}
              className="inline-flex min-h-8 items-center gap-2 px-2 text-xs font-semibold text-red-700 hover:bg-red-50"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              除外データを削除
            </button>
          </div>
        </div>
      ) : isMfmeSkipped && allowSkip ? (
        <div className="flex items-start justify-between gap-3 border border-zinc-200 bg-zinc-50 px-4 py-3">
          <div className="flex gap-2">
            <CircleOff
              className="mt-0.5 size-4 shrink-0 text-zinc-600"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-semibold text-zinc-800">
                既存明細を除外しません
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                PayPayの全取引を変換します
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleUndo}
            className="inline-flex size-8 shrink-0 items-center justify-center border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"
            title="元に戻す"
            aria-label="元に戻す"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <>
          {allowSkip && (
            <p className="mb-3 text-xs leading-5 text-zinc-600">
              MoneyForward MEにすでにある明細を、出力するCSVから除外できます。
            </p>
          )}
          <CsvDropzone
            key={fileInputVersion}
            id="mfme-csv-input"
            multiple
            fileLabel={
              files.length > 0 ? `${files.length}ファイル選択済み` : undefined
            }
            prompt="MoneyForward ME CSVを選択"
            onFilesSelected={handleFileChange}
          />
          {files.length > 0 && (!allowSkip || Boolean(error)) && (
            <ClearFileSelectionButton
              onClick={() => {
                fileSelectionVersion.current++;
                setFileInputVersion((version) => version + 1);
                onFilesSelected([]);
                onDataParsed(null);
                setMfStats(null);
                setError("");
              }}
            />
          )}
          {allowSkip && files.length === 0 && (
            <button
              type="button"
              onClick={handleSkip}
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            >
              <CircleOff className="size-3.5" aria-hidden="true" />
              今回は除外せずに進む
            </button>
          )}
        </>
      )}

      {!allowSkip && displayStats && displayStats.count > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600">
          <span>{displayStats.count}件</span>
          {displayStats.startDate && displayStats.endDate && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              <PeriodDisplay
                startDate={displayStats.startDate}
                endDate={displayStats.endDate}
              />
            </span>
          )}
        </div>
      )}

      {(error || allTransactionsExcluded) && (
        <div
          className="mt-3 flex gap-2 border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            {error ||
              "変換対象がありません。すべての取引が取り込み済みの可能性があります。"}
          </p>
        </div>
      )}

      {confirmAction && (
        <ConfirmationDialog
          action={confirmAction}
          onCancel={() => {
            setConfirmAction(null);
            setPendingFiles([]);
            setFileInputVersion((version) => version + 1);
          }}
          onConfirm={handleConfirm}
        />
      )}
    </section>
  );
}
