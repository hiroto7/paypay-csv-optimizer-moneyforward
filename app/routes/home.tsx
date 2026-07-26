import { AlertCircle, LockKeyhole, UploadCloud, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import AuditPanel from "~/components/AuditPanel";
import MfImportGuideModal from "~/components/MfImportGuideModal";
import Step1PayPayUpload from "~/components/Step1PayPayUpload";
import Step2MfmeFilter from "~/components/Step2MfmeFilter";
import Step3FileList from "~/components/Step3FileList";
import WorkspaceEmptyState from "~/components/WorkspaceEmptyState";
import { useInputWorkspace } from "~/hooks/useInputWorkspace";
import { useLocalImportRecords } from "~/hooks/useLocalImportRecords";
import { findMfmeDeletionCandidates } from "~/services/deletion-candidates";
import {
  createChunksFromGroupedTransactions,
  filterTransactionsBySources,
  type ProcessedResult,
} from "~/services/paypay-csv";
import { shareCsv } from "~/utils/csv-share";
import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "PP2MF - PayPay CSV Optimizer for MoneyForward ME" },
    {
      name: "description",
      content:
        "PayPayから書き出した取引履歴を整理し、MoneyForward MEに取り込めるファイルを作成します。",
    },
  ];
}

export default function Home() {
  const [importedChunkKeys, setImportedChunkKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [modalContext, setModalContext] = useState<{
    name: string;
    index: number;
    isSharing: boolean;
  } | null>(null);
  const {
    conversionCounts,
    accountBalances,
    recordStats,
    addImportedRecords,
    setAccountBalance,
    clearAccountBalance,
    resetImportedRecords,
    refreshConversionCounts,
  } = useLocalImportRecords();
  const closeModal = useCallback(() => setModalContext(null), []);
  const resetCurrentImportState = useCallback(() => {
    setImportedChunkKeys(new Set());
    closeModal();
  }, [closeModal]);
  const handlePayPayDataChanged = useCallback(() => {
    refreshConversionCounts();
    resetCurrentImportState();
  }, [refreshConversionCounts, resetCurrentImportState]);
  const handleMfmeDataChanged = useCallback(() => {
    resetCurrentImportState();
  }, [resetCurrentImportState]);
  const {
    payPayFile,
    mfmeFiles,
    notice,
    dismissNotice,
    selectPayPayFile,
    addMfmeFiles,
    clearMfmeFiles,
    payPayData,
    payPayError,
    mfmeData,
    mfmeError,
  } = useInputWorkspace(
    resetImportedRecords,
    handlePayPayDataChanged,
    handleMfmeDataChanged,
  );

  const conversionResult = useMemo(() => {
    if (!payPayData) {
      return filterTransactionsBySources([], new Map(), new Map());
    }

    return filterTransactionsBySources(
      payPayData.transactions,
      mfmeData?.exclusionCounts ?? new Map(),
      conversionCounts,
    );
  }, [payPayData, mfmeData, conversionCounts]);

  const deletionCandidates = useMemo(() => {
    if (!payPayData || !mfmeData) return [];
    return findMfmeDeletionCandidates(
      payPayData.transactions,
      mfmeData.records,
    );
  }, [payPayData, mfmeData]);

  const chunks = useMemo<ProcessedResult>(() => {
    if (!payPayData) {
      return {};
    }

    return createChunksFromGroupedTransactions(
      conversionResult.groupedTransactions,
      payPayData.headers,
    );
  }, [payPayData, conversionResult]);

  const handleImport = useCallback(
    async (filename: string, data: string, name: string, index: number) => {
      flushSync(() => setModalContext({ name, index, isSharing: true }));
      try {
        const shared = await shareCsv(filename, data);
        setModalContext((currentContext) =>
          shared && currentContext
            ? { ...currentContext, isSharing: false }
            : null,
        );
      } catch {
        setModalContext(null);
      }
    },
    [],
  );

  const handleMarkAsImported = () => {
    if (!modalContext) return;
    const importedChunk =
      chunks[modalContext.name]?.[modalContext.index] ?? null;
    if (importedChunk) {
      addImportedRecords(
        importedChunk.transactionKeys,
        modalContext.name,
        importedChunk.balanceDelta,
      );
    }

    setImportedChunkKeys((currentKeys) => {
      const nextKeys = new Set(currentKeys);
      nextKeys.add(`${modalContext.name}:${modalContext.index}`);
      return nextKeys;
    });
    closeModal();
  };

  const hasMfmeRecords = Boolean(mfmeData?.records.length);
  const hasOutput = Object.keys(chunks).length > 0;
  const canShowConversion = Boolean(payPayData && hasOutput);

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/pwa-icon.svg"
              alt=""
              className="size-9 shrink-0 rounded-lg"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold text-zinc-950 sm:text-base">
                PP2MF
              </h1>
              <p className="truncate text-[10px] leading-4 text-zinc-500 sm:text-xs">
                PayPay CSV Optimizer for MoneyForward ME
              </p>
            </div>
          </div>
          <div
            className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-zinc-500"
            title="ブラウザ内で処理"
          >
            <LockKeyhole className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">ブラウザ内で処理</span>
            <span className="sr-only sm:hidden">ブラウザ内で処理</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 sm:py-7">
        {notice && (
          <div
            className={`mb-5 flex items-center justify-between gap-3 border px-4 py-2.5 text-sm ${
              notice.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
            role={notice.tone === "error" ? "alert" : "status"}
          >
            <div className="flex min-w-0 items-center gap-2">
              {notice.tone === "success" ? (
                <UploadCloud className="size-4 shrink-0" aria-hidden="true" />
              ) : (
                <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
              )}
              <p className="leading-5">{notice.message}</p>
            </div>
            <button
              type="button"
              onClick={dismissNotice}
              className="inline-flex size-7 shrink-0 items-center justify-center hover:bg-black/5"
              aria-label="通知を閉じる"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="mb-5">
          <div>
            <h2 className="text-2xl font-bold text-zinc-950">
              MoneyForward MEに取り込むファイルを作る
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-zinc-600">
              PayPayから書き出した取引履歴を、支払い方法ごと・100件ごとに整理します。
            </p>
          </div>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="border border-zinc-200 bg-white">
            <div className="border-b border-zinc-200 px-5 py-4">
              <h2 className="text-sm font-bold text-zinc-950">入力ファイル</h2>
            </div>
            <div className="space-y-6 p-5">
              <Step1PayPayUpload
                file={payPayFile}
                stats={payPayData?.stats ?? null}
                error={payPayError}
                onFileSelected={selectPayPayFile}
              />
              <div className="border-t border-zinc-200 pt-5">
                <Step2MfmeFilter
                  files={mfmeFiles}
                  stats={mfmeData?.exclusionStats ?? null}
                  error={mfmeError}
                  onFilesAdded={addMfmeFiles}
                  onFilesCleared={clearMfmeFiles}
                  localImportedStats={recordStats}
                />
              </div>
            </div>
          </aside>

          <div className="min-w-0 space-y-5">
            <div className="border border-zinc-200 bg-white">
              {canShowConversion ? (
                <Step3FileList
                  chunks={chunks}
                  importedChunkKeys={importedChunkKeys}
                  hasMfmeData={hasMfmeRecords}
                  excludedByMfme={conversionResult.mfmeDuplicates}
                  excludedByImportedRecords={
                    conversionResult.importedDuplicates
                  }
                  onImport={handleImport}
                  accountBalances={accountBalances}
                  onSetBalance={setAccountBalance}
                  onClearBalance={clearAccountBalance}
                />
              ) : (
                <WorkspaceEmptyState
                  hasPayPay={Boolean(payPayData)}
                  hasOutput={hasOutput}
                />
              )}
            </div>
            <AuditPanel
              hasPayPay={Boolean(payPayData)}
              hasMfme={hasMfmeRecords}
              candidates={deletionCandidates}
            />
          </div>
        </div>
      </main>

      {modalContext && (
        <MfImportGuideModal
          accountName={modalContext.name}
          isSharing={modalContext.isSharing}
          onClose={closeModal}
          onImported={handleMarkAsImported}
        />
      )}
    </div>
  );
}
