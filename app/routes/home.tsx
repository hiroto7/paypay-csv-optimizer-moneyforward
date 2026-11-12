import { useEffect, useState } from "react";
import AppFooter from "~/components/AppFooter";
import AppHeader from "~/components/AppHeader";
import CsvShareGuide from "~/components/CsvShareGuide";
import NoticeBanner from "~/components/NoticeBanner";
import ReviewLink from "~/components/ReviewLink";
import StartScreen from "~/components/StartScreen";
import Step1PayPayUpload from "~/components/Step1PayPayUpload";
import Step2MfmeFilter from "~/components/Step2MfmeFilter";
import Step3FileList from "~/components/Step3FileList";
import { StepConnector } from "~/components/StepCard";
import { useWorkspace } from "~/hooks/useWorkspace";
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

export default function Home() {
  // この画面を開いてから作業画面を表示したか。開いた時点ですべて保存済みなら最初の画面を表示するが、
  // ファイルを選んだり保存したりしたあとは、完了しても作業画面のまま結果を見せる。
  const [hasEnteredWork, setHasEnteredWork] = useState(false);
  const {
    records,
    inputs,
    state,
    payPayFile,
    payPayData,
    mfmeData,
    conversion,
    progress,
    recordStats,
    reviewCandidateCount,
    isReady,
    handleImport,
    modals,
  } = useWorkspace({ onWorkStarted: () => setHasEnteredWork(true) });

  const isFinished = progress.accounts.length === 0 || progress.isComplete;
  const showsWorkScreen =
    Boolean(payPayFile && payPayData && conversion) &&
    (hasEnteredWork || !isFinished);

  // 作業画面を一度表示したら、完了しても最初の画面へ戻さない。
  useEffect(() => {
    if (showsWorkScreen) setHasEnteredWork(true);
  }, [showsWorkScreen]);

  const isStep2Done =
    recordStats.count > 0 ||
    inputs.mfmeFiles.length > 0 ||
    state.hasNoMfmeHistory;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-900">
      <AppHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-5 sm:px-6 sm:py-8">
        <NoticeBanner notice={inputs.notice} onDismiss={inputs.dismissNotice} />

        {!isReady ? (
          <div className="min-h-96" aria-busy="true">
            <h1 className="sr-only">
              PayPayの決済を、MoneyForward MEにストレスなく取り込み。
            </h1>
          </div>
        ) : !showsWorkScreen || !payPayFile || !payPayData || !conversion ? (
          <StartScreen
            error={inputs.payPayError}
            recordStats={recordStats}
            reviewCandidateCount={reviewCandidateCount}
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
                onImport={handleImport}
                onNewFileSelected={inputs.selectPayPayFile}
              />
            ) : (
              <Step3FileList lockedReason="手順2で答えるか、入出金履歴を追加すると表示されます" />
            )}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5">
              <ReviewLink candidateCount={reviewCandidateCount} />
              <CsvShareGuide />
            </div>
          </div>
        )}
      </main>

      <AppFooter />

      {modals}
    </div>
  );
}
