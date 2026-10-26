import { AlertCircle, ArrowRight, LockKeyhole } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import CsvFilePicker from "~/components/CsvFilePicker";
import CsvShareGuide from "~/components/CsvShareGuide";

interface StartScreenProps {
  error: string;
  mfmeFileCount: number;
  onFileSelected: (file: File) => void;
}

const steps = [
  "PayPayの取引履歴を選ぶ",
  "登録済みの明細を除外する",
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
      <span
        className={`flex size-12 items-center justify-center rounded-xl text-sm font-extrabold ${className}`}
      >
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
  mfmeFileCount,
  onFileSelected,
}: StartScreenProps) {
  return (
    <section aria-labelledby="start-title" className="space-y-5">
      <figure
        className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-start gap-2 px-2"
        aria-label="PayPayの取引履歴をPP2MFで整えてMoneyForward MEへ取り込む流れ"
      >
        <FlowNode label="PayPayの取引履歴" className="bg-red-600 text-white">
          Pay
        </FlowNode>
        <ArrowRight
          className="mt-4 size-4 shrink-0 text-zinc-400"
          aria-hidden="true"
        />
        <FlowNode label="PP2MF" className="bg-white ring-1 ring-zinc-200">
          <img src="/pwa-icon.svg" alt="" className="size-12 rounded-xl" />
        </FlowNode>
        <ArrowRight
          className="mt-4 size-4 shrink-0 text-zinc-400"
          aria-hidden="true"
        />
        <FlowNode label="MoneyForward ME" className="bg-orange-500 text-white">
          ME
        </FlowNode>
      </figure>

      <div>
        <h1
          id="start-title"
          className="text-2xl font-bold leading-snug text-zinc-950"
        >
          PayPayの明細を、MoneyForward MEへ重複なく取り込みます
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          登録済みの明細を除外し、口座ごとに取り込み用CSVを作ります。
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

      <div className="space-y-2 text-xs leading-5 text-zinc-500">
        <p>2回目からは、新しいPayPayの取引履歴を選ぶだけで使えます。</p>
        <p className="flex gap-1.5">
          <LockKeyhole
            className="mt-0.5 size-3.5 shrink-0"
            aria-hidden="true"
          />
          明細はこの端末の中だけで処理し、外部へ送信しません。
        </p>
        {mfmeFileCount > 0 && (
          <p>
            MoneyForward MEの入出金履歴は{mfmeFileCount}
            ファイルを読み込み済みです。
          </p>
        )}
      </div>

      <div className="space-y-3">
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
