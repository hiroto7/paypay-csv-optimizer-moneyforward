import { AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import AppFooter from "~/components/AppFooter";
import AppHeader from "~/components/AppHeader";
import ReviewCandidateList from "~/components/ReviewCandidateList";
import {
  createBaselineCounts,
  loadLocalExclusionState,
} from "~/services/local-exclusion-store";
import { combineMfmeData } from "~/services/mfme-csv";
import type { MfmeReviewCandidate } from "~/services/mfme-reconciliation";
import { filterTransactionsBySources } from "~/services/paypay-csv";
import { loadStoredInputFiles } from "~/services/stored-input-files";
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

type ReviewState =
  | { status: "loading" }
  | { status: "missing"; hasPayPay: boolean; hasMfme: boolean }
  | {
      status: "ready";
      payPayFileName: string;
      mfmeFileCount: number;
      candidates: MfmeReviewCandidate[];
    }
  | { status: "error" };

// 作業画面と同じ入力ファイル・同じ照合で、要確認明細の候補を求める。
const loadReviewState = async (): Promise<ReviewState> => {
  const stored = await loadStoredInputFiles();
  const mfmeData = combineMfmeData(
    stored.mfme.map(({ file }) => file),
    new Map(stored.mfme.map(({ file, data }) => [file.name, data])),
  );
  if (!stored.payPay || !mfmeData) {
    return {
      status: "missing",
      hasPayPay: stored.payPay !== null,
      hasMfme: mfmeData !== null,
    };
  }

  const { mfmeCandidates } = filterTransactionsBySources(
    stored.payPay.data.transactions,
    mfmeData.records,
    createBaselineCounts(
      loadLocalExclusionState(),
      stored.payPay.data.fingerprint,
    ),
  );
  return {
    status: "ready",
    payPayFileName: stored.payPay.file.name,
    mfmeFileCount: stored.mfme.length,
    candidates: mfmeCandidates,
  };
};

function ReviewContent({ state }: { state: ReviewState }) {
  if (state.status === "loading") {
    return <div className="min-h-40" aria-busy="true" />;
  }

  if (state.status === "error") {
    return (
      <p
        className="px-5 py-8 text-center text-sm text-red-800 sm:px-7"
        role="alert"
      >
        保存済みの入力ファイルを読み込めませんでした。
      </p>
    );
  }

  if (state.status === "missing") {
    return (
      <div className="px-5 py-8 text-center sm:px-7">
        <p className="text-sm font-semibold text-zinc-800">
          {!state.hasPayPay
            ? "PayPayの取引履歴を選んでください。"
            : "MoneyForward MEの入出金履歴を追加してください。"}
        </p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          PayPayの取引履歴とMoneyForward
          MEの入出金履歴の両方があるときに確認できます。
        </p>
        <Link
          to="/"
          className="mt-4 inline-flex min-h-9 items-center border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          アプリに戻る
        </Link>
      </div>
    );
  }

  const { payPayFileName, mfmeFileCount, candidates } = state;
  return (
    <div>
      <p className="px-5 pt-4 pb-3 text-xs leading-5 text-zinc-500 sm:px-7">
        照合したファイル：PayPayの取引履歴「{payPayFileName}」、MoneyForward
        MEの入出金履歴 {mfmeFileCount}ファイル
      </p>
      {candidates.length === 0 ? (
        <div className="flex flex-col items-center border-t border-zinc-200 px-5 py-10 text-center sm:px-7">
          <CheckCircle2
            className="size-8 text-emerald-600"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm font-bold text-zinc-950">
            要確認の明細は見つかりませんでした
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            読み込んだ入出金履歴の範囲で確認しています。
          </p>
        </div>
      ) : (
        <>
          <h2 className="flex items-center gap-2 border-t border-zinc-200 px-5 py-3 text-base font-bold text-zinc-950 sm:px-7">
            <AlertTriangle
              className="size-5 text-amber-600"
              aria-hidden="true"
            />
            要確認の明細 {candidates.length}件
          </h2>
          <ReviewCandidateList candidates={candidates} />
        </>
      )}
    </div>
  );
}

export default function Review() {
  const [state, setState] = useState<ReviewState>({ status: "loading" });

  useEffect(() => {
    let isCurrent = true;
    loadReviewState()
      .then((nextState) => {
        if (isCurrent) setState(nextState);
      })
      .catch((error: unknown) => {
        console.error("Failed to load review candidates:", error);
        if (isCurrent) setState({ status: "error" });
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-900">
      <AppHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <Link
          to="/"
          className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          アプリに戻る
        </Link>
        <div className="border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-5 py-5 sm:px-7 sm:py-6">
            <h1 className="text-2xl font-bold text-zinc-950">
              重複登録・口座間違いを確認する
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              PayPayの取引履歴と同じ日付・金額・内容の明細のうち、口座が違うものや、件数が多いものをMoneyForward
              MEの入出金履歴から探します。重複か口座間違いかは判定せず、MoneyForward
              MEの明細も変更しません。
            </p>
          </div>
          <ReviewContent state={state} />
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
