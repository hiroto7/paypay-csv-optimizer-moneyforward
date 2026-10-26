import { AlertCircle, UploadCloud, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import AppFooter from "~/components/AppFooter";
import AppHeader from "~/components/AppHeader";
import CsvShareGuide from "~/components/CsvShareGuide";
import MfImportGuideModal from "~/components/MfImportGuideModal";
import MfmeChangeConfirmModal from "~/components/MfmeChangeConfirmModal";
import PendingImportModal from "~/components/PendingImportModal";
import Pp2mfShareTargetModal from "~/components/Pp2mfShareTargetModal";
import type { RecordCoverage } from "~/components/RecordCoverageNotice";
import ReviewCandidates from "~/components/ReviewCandidates";
import SharedFilesConfirmModal from "~/components/SharedFilesConfirmModal";
import StartScreen from "~/components/StartScreen";
import Step1PayPayUpload from "~/components/Step1PayPayUpload";
import Step2MfmeFilter from "~/components/Step2MfmeFilter";
import Step3FileList from "~/components/Step3FileList";
import { StepConnector } from "~/components/StepCard";
import {
  type MfmeChangePreview,
  type SharedFilesPreview,
  useInputFilesStore,
} from "~/hooks/useInputFilesStore";
import { useLocalImportRecords } from "~/hooks/useLocalImportRecords";
import type { CsvRecord } from "~/services/csv-schema";
import { markSavedChunks } from "~/services/import-progress";
import {
  countExclusions,
  createBaselineCounts,
  createStatsFromTransactionCounts,
  getSavedCountsForFile,
} from "~/services/local-exclusion-store";
import { countRecordsCoveredByMfme } from "~/services/mfme-reconciliation";
import {
  createChunksFromGroupedTransactions,
  filterTransactionsBySources,
} from "~/services/paypay-csv";
import { shareCsv, shareFile } from "~/utils/csv-share";
import type { Route } from "./+types/home";

const pageTitle = "PayPayの決済をMoneyForward MEにストレスなく取り込み | PP2MF";
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

type PendingConfirmation<T> = {
  preview: T;
  resolve: (confirmed: boolean) => void;
};

export default function Home() {
  const records = useLocalImportRecords();
  // 保存待ちのうち、今回の作業で共有したもの。再読み込み後は空になり、再訪時の確認として扱う。
  const [sessionShare, setSessionShare] = useState<{
    isSharing: boolean;
  } | null>(null);
  const [mfmeConfirmation, setMfmeConfirmation] =
    useState<PendingConfirmation<MfmeChangePreview> | null>(null);
  const [sharedFilesConfirmation, setSharedFilesConfirmation] =
    useState<PendingConfirmation<SharedFilesPreview> | null>(null);
  const { hasImportedRecords } = records;

  const confirmMfmeChange = useCallback(
    (preview: MfmeChangePreview) =>
      hasImportedRecords()
        ? new Promise<boolean>((resolve) =>
            setMfmeConfirmation({ preview, resolve }),
          )
        : Promise.resolve(true),
    [hasImportedRecords],
  );

  const confirmSharedFiles = useCallback(
    (preview: SharedFilesPreview) =>
      new Promise<boolean>((resolve) =>
        setSharedFilesConfirmation({ preview, resolve }),
      ),
    [],
  );

  const inputs = useInputFilesStore({
    onPayPayFileChanged: records.changePayPayFile,
    onMfmeFilesChanged: records.resetImportedRecords,
    hasPendingImport: records.hasPendingImport,
    confirmMfmeChange,
    confirmSharedFiles,
  });
  const {
    payPayFile,
    payPayData,
    mfmeData,
    deferredShare,
    resumeDeferredShare,
    discardDeferredShare,
  } = inputs;
  const { state, discardPendingImport } = records;
  const { pendingImport } = state;
  const payPayFingerprint = payPayData?.fingerprint ?? null;

  const conversion = useMemo(() => {
    if (!payPayData) return null;
    return filterTransactionsBySources(
      payPayData.transactions,
      mfmeData?.records ?? [],
      createBaselineCounts(state, payPayFingerprint),
    );
  }, [payPayData, mfmeData, state, payPayFingerprint]);

  const progress = useMemo(() => {
    const chunks =
      payPayData && conversion
        ? createChunksFromGroupedTransactions(
            conversion.groupedTransactions,
            payPayData.headers,
          )
        : {};
    return markSavedChunks(
      chunks,
      getSavedCountsForFile(state, payPayFingerprint),
    );
  }, [payPayData, conversion, state, payPayFingerprint]);

  const recordStats = useMemo(
    () => createStatsFromTransactionCounts(state.localImportedCounts),
    [state.localImportedCounts],
  );

  const createCoverage = useCallback(
    (nextRecords: readonly CsvRecord[]): RecordCoverage => {
      const { covered, uncoveredCounts } = countRecordsCoveredByMfme(
        state.localImportedCounts,
        nextRecords,
      );
      return {
        recordCount: countExclusions(state.localImportedCounts),
        coveredCount: covered,
        uncoveredStats: createStatsFromTransactionCounts(uncoveredCounts),
      };
    },
    [state.localImportedCounts],
  );

  // 保存待ちの確認が終わったら、後回しにしていた共有ファイルを読み込む。
  useEffect(() => {
    if (pendingImport || !deferredShare) return;
    if (deferredShare.kind === "pending") {
      resumeDeferredShare();
    } else {
      discardDeferredShare();
    }
  }, [pendingImport, deferredShare, resumeDeferredShare, discardDeferredShare]);

  const handleImport = async (
    filename: string,
    accountName: string,
    index: number,
  ) => {
    const chunk = progress.accounts.find(({ name }) => name === accountName)
      ?.chunks[index];
    if (!chunk) return;

    // 共有シートからMoneyForward MEへ移っている間にページが破棄されても確認できるよう、共有前に記録する。
    flushSync(() => {
      records.startPendingImport({
        accountName,
        sharedAt: Date.now(),
        payPayFingerprint,
        transactions: chunk.transactions,
      });
      setSessionShare({ isSharing: true });
    });
    try {
      const shared = await shareCsv(filename, chunk.data);
      if (!shared) {
        discardPendingImport();
        setSessionShare(null);
        return;
      }
      setSessionShare((current) => (current ? { isSharing: false } : null));
    } catch {
      discardPendingImport();
      setSessionShare(null);
    }
  };

  const handleShareAgain = async (file: File) => {
    setSessionShare({ isSharing: true });
    try {
      if (!(await shareFile(file))) {
        setSessionShare(null);
        return;
      }
      setSessionShare({ isSharing: false });
      discardDeferredShare();
    } catch {
      setSessionShare(null);
    }
  };

  const handleConfirmImport = () => {
    records.confirmPendingImport();
    setSessionShare(null);
  };

  const handleDiscardImport = () => {
    discardPendingImport();
    setSessionShare(null);
  };

  const isReady = records.isLoaded && inputs.isReady;
  const hasRecords = recordStats.count > 0;
  const isStep2Done =
    hasRecords || inputs.mfmeFiles.length > 0 || state.hasNoMfmeHistory;
  const notice = inputs.notice;

  const renderModal = () => {
    if (pendingImport && sessionShare) {
      return (
        <MfImportGuideModal
          accountName={pendingImport.accountName}
          transactionCount={pendingImport.transactions.length}
          isSharing={sessionShare.isSharing}
          onImported={handleConfirmImport}
          onCancel={handleDiscardImport}
        />
      );
    }
    if (pendingImport && deferredShare?.kind === "pp2mf-output") {
      return (
        <Pp2mfShareTargetModal
          fileName={deferredShare.file.name}
          onShareAgain={() => void handleShareAgain(deferredShare.file)}
          onCancel={handleDiscardImport}
        />
      );
    }
    if (pendingImport) {
      return (
        <PendingImportModal
          pendingImport={pendingImport}
          deferredFileNames={
            deferredShare?.kind === "pending" ? deferredShare.fileNames : []
          }
          onConfirm={handleConfirmImport}
          onDiscard={handleDiscardImport}
        />
      );
    }
    if (mfmeConfirmation) {
      const answer = (confirmed: boolean) => {
        mfmeConfirmation.resolve(confirmed);
        setMfmeConfirmation(null);
      };
      return (
        <MfmeChangeConfirmModal
          preview={mfmeConfirmation.preview}
          coverage={createCoverage(mfmeConfirmation.preview.nextRecords)}
          onConfirm={() => answer(true)}
          onCancel={() => answer(false)}
        />
      );
    }
    if (sharedFilesConfirmation) {
      const { preview } = sharedFilesConfirmation;
      const answer = (confirmed: boolean) => {
        sharedFilesConfirmation.resolve(confirmed);
        setSharedFilesConfirmation(null);
      };
      return (
        <SharedFilesConfirmModal
          preview={preview}
          coverage={
            hasRecords && preview.mfme.length > 0
              ? createCoverage(preview.nextMfmeRecords)
              : null
          }
          hasImportedRecords={hasRecords}
          onConfirm={() => answer(true)}
          onCancel={() => answer(false)}
        />
      );
    }
    return null;
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-900">
      <AppHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-5 sm:px-6 sm:py-8">
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
              onClick={inputs.dismissNotice}
              className="inline-flex size-7 shrink-0 items-center justify-center hover:bg-black/5"
              aria-label="通知を閉じる"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {!isReady ? (
          <div className="min-h-96" aria-busy="true">
            <h1 className="sr-only">
              PayPayの明細を、MoneyForward MEへ重複なく取り込みます
            </h1>
          </div>
        ) : !payPayFile || !payPayData || !conversion ? (
          <StartScreen
            error={inputs.payPayError}
            mfmeFileCount={inputs.mfmeFiles.length}
            onFileSelected={inputs.selectPayPayFile}
          />
        ) : (
          <div>
            <h1 className="sr-only">
              PayPayの取引履歴をMoneyForward MEへ取り込む
            </h1>
            <Step1PayPayUpload
              file={payPayFile}
              stats={payPayData.stats}
              error={inputs.payPayError}
              onFileSelected={inputs.selectPayPayFile}
            />
            <StepConnector />
            <Step2MfmeFilter
              files={inputs.mfmeFiles}
              fileStatsByName={
                new Map(
                  [...inputs.mfmeDataByName].map(([name, data]) => [
                    name,
                    data.stats,
                  ]),
                )
              }
              mfmeStats={mfmeData?.stats ?? null}
              recordStats={recordStats}
              hasNoMfmeHistory={state.hasNoMfmeHistory}
              errors={inputs.mfmeErrors}
              onFilesAdded={inputs.addMfmeFiles}
              onFileRemoved={inputs.removeMfmeFile}
              onNoMfmeHistoryChange={records.setHasNoMfmeHistory}
            />
            <StepConnector />
            {isStep2Done ? (
              <Step3FileList
                lockedReason={null}
                progress={progress}
                totalCount={payPayData.transactions.length}
                savedBeforeCount={conversion.importedDuplicates}
                mfmeMatchedCount={conversion.mfmeDuplicates}
                recordedCount={recordStats.count}
                onImport={handleImport}
                onNewFileSelected={inputs.selectPayPayFile}
              />
            ) : (
              <Step3FileList lockedReason="手順2で答えるか、入出金履歴を追加すると表示されます" />
            )}
            <div className="mt-4">
              <ReviewCandidates candidates={conversion.mfmeCandidates} />
            </div>
            <div className="mt-6 flex justify-center">
              <CsvShareGuide />
            </div>
          </div>
        )}
      </main>

      <AppFooter />

      {renderModal()}
    </div>
  );
}
