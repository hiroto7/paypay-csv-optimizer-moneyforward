import AppFooter from "~/components/AppFooter";
import AppHeader from "~/components/AppHeader";
import BackLink from "~/components/BackLink";
import NoticeBanner from "~/components/NoticeBanner";
import ReviewCandidateList from "~/components/ReviewCandidateList";
import Step1PayPayUpload from "~/components/Step1PayPayUpload";
import { MfmeFileManager } from "~/components/Step2MfmeFilter";
import StepCard, { StepConnector } from "~/components/StepCard";
import { useWorkspace } from "~/hooks/useWorkspace";
import type { Route } from "./+types/review";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "重複登録・口座間違いを確認する | PP2MF" },
    {
      name: "description",
      content:
        "PayPayの取引履歴とMoneyForward MEの入出金履歴を照合し、重複登録や口座間違いの可能性がある明細を表示します。",
    },
  ];
}

const TITLE = "重複登録・口座間違いを確認する";

export default function Review() {
  // 入力ファイル・取り込み記録・確認画面は作業画面と共有し、同じ照合で要確認明細を求める。
  const { inputs, payPayFile, payPayData, conversion, isReady, modals } =
    useWorkspace();
  const candidates =
    payPayData && conversion && inputs.mfmeFiles.length > 0
      ? conversion.mfmeCandidates
      : null;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-900">
      <AppHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <BackLink />
        <NoticeBanner notice={inputs.notice} onDismiss={inputs.dismissNotice} />
        <div className="mb-5">
          <h1 className="text-2xl font-bold leading-snug text-zinc-950">
            {TITLE}
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            PayPayの取引履歴と同じ日付・金額・内容の明細のうち、口座が違うものや、件数が多いものをMoneyForward
            MEの入出金履歴から探します。
          </p>
        </div>

        {!isReady ? (
          <div className="min-h-96" aria-busy="true" />
        ) : (
          <div>
            <Step1PayPayUpload
              file={payPayFile}
              stats={payPayData?.stats ?? null}
              error={inputs.payPayError}
              onFileSelected={inputs.selectPayPayFile}
            />
            <StepConnector />
            <StepCard
              number={2}
              title="MoneyForward MEの入出金履歴"
              status={inputs.mfmeFiles.length > 0 ? "done" : "current"}
              summary={
                inputs.mfmeFiles.length > 0
                  ? `入出金履歴 ${inputs.mfmeFiles.length}ファイル`
                  : "MoneyForward MEから書き出した入出金履歴を追加すると、PayPayの取引履歴と照合します。"
              }
            >
              <MfmeFileManager
                files={inputs.mfmeFiles}
                fileStatsByName={
                  new Map(
                    [...inputs.mfmeDataByName].map(([name, data]) => [
                      name,
                      data.stats,
                    ]),
                  )
                }
                errors={inputs.mfmeErrors}
                onFilesAdded={inputs.addMfmeFiles}
                onFileRemoved={inputs.removeMfmeFile}
              />
            </StepCard>
            <StepConnector />
            {candidates === null ? (
              <StepCard
                number={3}
                title="要確認の明細"
                status="locked"
                summary="手順1と手順2のファイルを選ぶと表示されます"
              />
            ) : (
              <StepCard
                number={3}
                title="要確認の明細"
                status={candidates.length > 0 ? "attention" : "done"}
                summary={
                  candidates.length > 0
                    ? `${candidates.length}件あります。MoneyForward MEで内容と口座を確認してください。`
                    : "読み込んだ入出金履歴の範囲では、見つかりませんでした"
                }
              >
                {candidates.length > 0 ? (
                  <ReviewCandidateList candidates={candidates} />
                ) : undefined}
              </StepCard>
            )}
          </div>
        )}
      </main>

      <AppFooter />

      {modals}
    </div>
  );
}
