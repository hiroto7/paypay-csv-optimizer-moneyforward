import { CirclePlay, History, LockKeyhole, Smartphone } from "lucide-react";
import { Link } from "react-router";
import CsvFilePicker from "~/components/CsvFilePicker";
import CsvShareGuide from "~/components/CsvShareGuide";
import ErrorAlert from "~/components/ErrorAlert";
import FileStatsSummary from "~/components/FileStatsSummary";
import { FlowArrow, FlowFigure, FlowNode } from "~/components/FlowFigure";
import ReviewLink from "~/components/ReviewLink";
import type { FileStats } from "~/services/csv-date";

interface StartScreenProps {
  error: string;
  // 「MoneyForward MEで保存した」明細の記録。
  recordStats: FileStats;
  // 保存しているPayPayの取引履歴と入出金履歴で求めた要確認明細の件数。どちらかがなければnull。
  reviewCandidateCount: number | null;
  onFileSelected: (file: File) => void;
}

const steps = [
  "PayPayの取引履歴を選ぶ",
  "MoneyForward MEに登録済みの明細を、取り込み用CSVから除く",
  "口座ごとにMoneyForward MEへ取り込む",
] as const;

export default function StartScreen({
  error,
  recordStats,
  reviewCandidateCount,
  onFileSelected,
}: StartScreenProps) {
  return (
    <section aria-labelledby="start-title" className="space-y-5">
      <FlowFigure
        label="PayPayの取引履歴をPP2MFで整え、MoneyForward MEへ取り込む流れ"
        className="px-2"
      >
        <FlowNode label="PayPay" icon={Smartphone} />
        <FlowArrow />
        <FlowNode label="PP2MF" />
        <FlowArrow />
        <FlowNode label="MoneyForward ME" icon={Smartphone} />
      </FlowFigure>

      <div>
        <h1
          id="start-title"
          className="text-2xl font-bold leading-snug text-zinc-950"
        >
          PayPayの決済を、MoneyForward MEにストレスなく取り込み。
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          PayPayとMoneyForward
          MEの履歴を自動で照合し、二重登録することなく、新しい取引だけをスムーズに家計簿へ登録できます。
        </p>
        <Link
          to="/guide#why-pp2mf"
          className="mt-1 inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950"
        >
          <CirclePlay className="size-4 shrink-0" aria-hidden="true" />
          なぜPP2MFを使うのか（動画・1分）
        </Link>
      </div>

      <ol className="divide-y divide-zinc-200 border border-zinc-200 bg-white">
        {steps.map((step, index) => (
          <li key={step} className="flex items-center gap-3 px-4 py-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
              {index + 1}
            </span>
            <span className="text-sm leading-6 text-zinc-800">{step}</span>
          </li>
        ))}
      </ol>

      <p className="flex gap-1.5 text-xs leading-5 text-zinc-500">
        <LockKeyhole className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        明細はこの端末の中だけで処理し、外部へ送信しません。
      </p>

      <div className="space-y-3">
        {recordStats.count > 0 && (
          <section
            aria-labelledby="start-records-title"
            className="border border-blue-200 bg-blue-50 px-4 py-3"
          >
            <h2
              id="start-records-title"
              className="flex gap-1.5 text-sm font-bold text-blue-950"
            >
              <History className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              「MoneyForward MEで保存した」を押した明細を記録しています
            </h2>
            <div className="mt-1 text-xs leading-5 text-blue-900">
              <FileStatsSummary stats={recordStats} />
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-700">
              PayPayの取引履歴を選ぶだけで、記録した明細を除いて、まだ登録していない明細だけを取り込めます。MoneyForward
              MEの入出金履歴を追加し直す必要はありません。
            </p>
          </section>
        )}
        <CsvFilePicker
          id="paypay-csv-input"
          label="PayPayの取引履歴を選ぶ"
          variant="primary"
          onFilesSelected={(files) => {
            const file = files?.[0];
            if (file) onFileSelected(file);
          }}
        />
        {error && (
          <ErrorAlert>
            <p>{error}</p>
          </ErrorAlert>
        )}
        <div className="flex flex-wrap items-center justify-center gap-x-5">
          <ReviewLink candidateCount={reviewCandidateCount} />
          <CsvShareGuide />
        </div>
      </div>
    </section>
  );
}
