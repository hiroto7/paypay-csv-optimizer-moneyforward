import { AlertCircle, LockKeyhole, UploadCloud, X } from "lucide-react";
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
  "PayPayとMoneyForward MEの履歴を自動で照合し、二重登録することなく、新しい取引だけをスムーズに家計簿へ登録できます。";
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
    <div className="app-frame flex flex-col">
      <AppHeader />

      <main className="app-container flex-1 pb-8 sm:pb-12">
        {notice && (
          <div
            className={`mt-4 flex items-center justify-between gap-3 border px-4 py-2 text-sm ${
              notice.tone === "success" ? "status-success" : "status-error"
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
              className="icon-control interactive"
              aria-label="通知を閉じる"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <section className="home-intro" aria-labelledby="home-title">
          <div className="min-w-0">
            <h1 id="home-title" className="text-ink">
              PayPayの決済を、MoneyForward MEに
              <span className="whitespace-nowrap">ストレスなく取り込み。</span>
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-ink-2">
              {heroDescription}
            </p>
            <Link
              to="/guide"
              className="control-link interactive mt-2 pr-2 text-sm"
            >
              使い方を見る
            </Link>
          </div>
          <aside className="trust-note" aria-label="データの取り扱い">
            <LockKeyhole
              className="mt-0.5 size-5 text-accent"
              aria-hidden="true"
            />
            <div>
              <p className="font-display text-sm font-bold text-ink">
                ブラウザ内で処理
              </p>
              <p className="mt-1 text-sm leading-6 text-muted">
                CSVの内容をアプリケーションサーバーへ送信せず、端末上で照合・変換します。
              </p>
            </div>
          </aside>
        </section>

        <div className="workbench">
          <aside className="workbench-rail" aria-labelledby="input-title">
            <div className="border-b border-rule px-4 py-4 sm:px-5">
              <h2
                id="input-title"
                className="font-display text-sm font-bold text-ink"
              >
                入力ファイル
              </h2>
            </div>
            <div className="space-y-7 p-4 sm:p-5">
              <Step1PayPayUpload
                file={payPayFile}
                stats={payPayData?.stats ?? null}
                error={payPayError}
                onFileSelected={selectPayPayFile}
              />
              <div className="border-t border-rule pt-6">
                <Step2MfmeFilter
                  files={mfmeFiles}
                  stats={mfmeData?.stats ?? null}
                  error={mfmeError}
                  onFilesAdded={addMfmeFiles}
                  onFilesCleared={clearMfmeFiles}
                  localImportedStats={recordStats}
                />
              </div>
              <div className="border-t border-rule pt-4">
                <CsvShareGuide />
              </div>
            </div>
          </aside>

          <div className="workbench-canvas">
            <div>
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
