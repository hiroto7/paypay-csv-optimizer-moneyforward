import {
  AlertCircle,
  ArrowRight,
  History,
  LockKeyhole,
  Smartphone,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import CsvFilePicker from "~/components/CsvFilePicker";
import CsvShareGuide from "~/components/CsvShareGuide";
import FileStatsSummary from "~/components/FileStatsSummary";
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

function FlowNode({
  label,
  className,
  children,
}: {
  label: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <span className={`flex size-12 items-center justify-center ${className}`}>
        {children}
      </span>
      <span className="text-xs font-semibold leading-4 text-zinc-700">
        {label}
      </span>
    </div>
  );
}

export default function StartScreen({
  error,
  recordStats,
  reviewCandidateCount,
  onFileSelected,
}: StartScreenProps) {
  return (
    <section aria-labelledby="start-title" className="space-y-5">
      <figure
        className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-start gap-2 px-2"
        aria-label="PayPayの取引履歴をPP2MFで整え、MoneyForward MEへ取り込む流れ"
      >
        <FlowNode
          label="PayPay"
          className="bg-white shadow-sm ring-1 ring-zinc-200"
        >
          <Smartphone className="size-6 text-zinc-600" aria-hidden="true" />
        </FlowNode>
        <ArrowRight
          className="mt-4 size-4 shrink-0 text-zinc-400"
          aria-hidden="true"
        />
        <FlowNode label="PP2MF" className="">
          <img src="/pwa-icon.svg" alt="" className="size-12 shadow-sm" />
        </FlowNode>
        <ArrowRight
          className="mt-4 size-4 shrink-0 text-zinc-400"
          aria-hidden="true"
        />
        <FlowNode
          label="MoneyForward ME"
          className="bg-white shadow-sm ring-1 ring-zinc-200"
        >
          <Smartphone className="size-6 text-zinc-600" aria-hidden="true" />
        </FlowNode>
      </figure>

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
      </div>

      <ol className="divide-y divide-zinc-200 border border-zinc-200 bg-white">
        {steps.map((step, index) => (
          <li key={step} className="flex items-center gap-3 px-4 py-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
              {index + 1}
            </span>
            <span className="text-sm text-zinc-800">{step}</span>
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
              className="flex items-center gap-1.5 text-sm font-bold text-blue-950"
            >
              <History className="size-4 shrink-0" aria-hidden="true" />
              前回までに保存した明細を記録しています
            </h2>
            <div className="mt-1 text-xs text-blue-900">
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
          <div
            className="flex gap-2 border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800"
            role="alert"
          >
            <AlertCircle
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <p>{error}</p>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-center gap-x-5">
          <ReviewLink candidateCount={reviewCandidateCount} />
          <CsvShareGuide />
          <Link
            to="/guide"
            className="inline-flex min-h-8 items-center text-xs font-semibold text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950"
          >
            使い方
          </Link>
        </div>
      </div>
    </section>
  );
}
