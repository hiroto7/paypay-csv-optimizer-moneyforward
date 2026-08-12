import { AlertCircle, UploadCloud, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { Link } from "react-router";
import AppFooter from "~/components/AppFooter";
import AppHeader from "~/components/AppHeader";
import AuditPanel from "~/components/AuditPanel";
import CsvShareGuide from "~/components/CsvShareGuide";
import MfImportGuideModal from "~/components/MfImportGuideModal";
import Step1PayPayUpload from "~/components/Step1PayPayUpload";
import Step2MfmeFilter from "~/components/Step2MfmeFilter";
import Step3FileList from "~/components/Step3FileList";
import WorkspaceEmptyState from "~/components/WorkspaceEmptyState";
import { useInputWorkspace } from "~/hooks/useInputWorkspace";
import { useLocalImportRecords } from "~/hooks/useLocalImportRecords";
import {
  createChunksFromGroupedTransactions,
  filterTransactionsBySources,
  type ProcessedResult,
} from "~/services/paypay-csv";
import { shareCsv } from "~/utils/csv-share";
import type { Route } from "./+types/home";

const pageTitle = "PayPayの決済をMoneyForward MEにストレスなく取り込み | PP2MF";
const heroDescription =
  "PayPayとMoneyForward MEの履歴を自動で照合し、二重登録することなく、新しい取引だけをスムーズに家計簿へ登録できます！";
const pageDescription =
  "PayPayとMoneyForward MEの履歴を自動で照合し、二重登録することなく、新しい取引だけをスムーズに家計簿へ登録できます。PayPayポイントで支払った分はPayPay残高とは別の口座として登録でき、ポイントと残高を併用した支払いも自動で分けて整理します。明細が多くても、上限に合わせて取り込み用ファイルを自動で分割します。";
const canonicalUrl = "https://pp2mf.vercel.app/";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: pageTitle },
    {
      name: "description",
      content: pageDescription,
    },
    { tagName: "link", rel: "canonical", href: canonicalUrl },
    { property: "og:title", content: pageTitle },
    { property: "og:description", content: pageDescription },
    { property: "og:type", content: "website" },
    { property: "og:url", content: canonicalUrl },
    { name: "twitter:card", content: "summary" },
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
  const handlePayPayFileChanged = useCallback(() => {
    refreshConversionCounts();
    resetCurrentImportState();
  }, [refreshConversionCounts, resetCurrentImportState]);
  const handleMfmeFilesChanged = useCallback(() => {
    const didResetImportedRecords = resetImportedRecords();
    resetCurrentImportState();
    return didResetImportedRecords;
  }, [resetImportedRecords, resetCurrentImportState]);
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
  } = useInputWorkspace({
    onPayPayFileChanged: handlePayPayFileChanged,
    onMfmeFilesChanged: handleMfmeFilesChanged,
  });

  const conversionResult = useMemo(() => {
    if (!payPayData) {
      return filterTransactionsBySources([], [], new Map());
    }

    return filterTransactionsBySources(
      payPayData.transactions,
      mfmeData?.records ?? [],
      conversionCounts,
    );
  }, [payPayData, mfmeData, conversionCounts]);

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
    <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-900">
      <AppHeader />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6 sm:py-7">
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
            <h1 className="text-2xl font-bold text-zinc-950">
              PayPayの決済を、MoneyForward MEにストレスなく取り込み。
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-zinc-600">
              {heroDescription}
            </p>
            <Link
              to="/guide"
              className="mt-2 inline-block text-sm font-semibold text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950"
            >
              使い方を見る
            </Link>
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
                  stats={mfmeData?.stats ?? null}
                  error={mfmeError}
                  onFilesAdded={addMfmeFiles}
                  onFilesCleared={clearMfmeFiles}
                  localImportedStats={recordStats}
                />
              </div>
              <div className="border-t border-zinc-200 pt-4">
                <CsvShareGuide />
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
              candidates={conversionResult.mfmeCandidates}
            />
          </div>
        </div>
      </main>

      <AppFooter />

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
