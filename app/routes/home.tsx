import {
  ArrowRight,
  Check,
  FileCheck2,
  FileSearch,
  LockKeyhole,
  Search,
  Upload,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import Step1PayPayUpload, {
  type PayPayParsedData,
} from "~/components/Step1PayPayUpload";
import Step2MfmeFilter, {
  type MfmeParsedData,
} from "~/components/Step2MfmeFilter";
import Step3FileList from "~/components/Step3FileList";
import Step4DeletionCandidates from "~/components/Step4DeletionCandidates";
import {
  createChunksFromGroupedRecords,
  createDeletionCandidatesCsv,
  filterTransactions,
  findMfmeDeletionCandidates,
  type ProcessedResult,
} from "~/services/csv-processor";
import type { Route } from "./+types/home";

type WorkspaceMode = "convert" | "audit";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "PayPay CSV Optimizer for マネーフォワード ME" },
    {
      name: "description",
      content:
        "PayPayの取引履歴CSVをマネーフォワード ME用に変換し、重複・誤口座取り込みも照合します。",
    },
  ];
}

const downloadCsv = (filename: string, blob: Blob) => {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const shareCsv = async (
  filename: string,
  data: string,
  onShared: () => void,
) => {
  const blob = new Blob([`\uFEFF${data}`], { type: "text/csv" });
  const file = new File([blob], filename, { type: "text/csv" });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      onShared();
      return;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      console.error("Share failed, falling back to download:", error);
    }
  }

  downloadCsv(filename, blob);
  onShared();
};

const MfImportGuideModal = ({
  accountName,
  onClose,
  onImported,
}: {
  accountName: string;
  onClose: () => void;
  onImported: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4">
    <div
      className="w-full max-w-lg border border-zinc-200 bg-white shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-guide-title"
    >
      <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
        <div>
          <h2
            id="import-guide-title"
            className="text-base font-bold text-zinc-950"
          >
            MoneyForward MEで保存
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            CSVを渡した後、口座を確認してください
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-8 shrink-0 items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          aria-label="閉じる"
          title="閉じる"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <ol className="divide-y divide-zinc-200 px-5">
        {[
          "MoneyForward MEの「読み込んだ明細」を開く",
          `「支出元・入金先一括変更」で「${accountName}」を選ぶ`,
          "内容を確認して右上の「保存」を押す",
        ].map((instruction, index) => (
          <li
            key={instruction}
            className="grid grid-cols-[28px_1fr] gap-3 py-4 text-sm text-zinc-700"
          >
            <span className="flex size-7 items-center justify-center bg-zinc-100 text-xs font-bold text-zinc-700">
              {index + 1}
            </span>
            <span className="pt-1">{instruction}</span>
          </li>
        ))}
      </ol>

      <div className="flex justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-5 py-4">
        <button
          type="button"
          onClick={onClose}
          className="h-9 border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
        >
          後で確認
        </button>
        <button
          type="button"
          onClick={onImported}
          className="inline-flex h-9 items-center gap-2 bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-700"
        >
          <Check className="size-4" aria-hidden="true" />
          保存を確認した
        </button>
      </div>
    </div>
  </div>
);

function WorkspaceEmptyState({
  mode,
  hasPayPay,
  hasMfme,
}: {
  mode: WorkspaceMode;
  hasPayPay: boolean;
  hasMfme: boolean;
}) {
  const isAudit = mode === "audit";
  const ready = hasPayPay && (isAudit ? hasMfme : true);

  return (
    <div className="flex min-h-80 flex-col items-center justify-center px-6 py-10 text-center sm:min-h-[520px] sm:py-12">
      <div className="flex size-12 items-center justify-center bg-zinc-100 text-zinc-600">
        {isAudit ? (
          <FileSearch className="size-6" aria-hidden="true" />
        ) : (
          <FileCheck2 className="size-6" aria-hidden="true" />
        )}
      </div>
      <h2 className="mt-4 text-lg font-bold text-zinc-950">
        {ready
          ? isAudit
            ? "明細を照合できます"
            : "変換条件を選択してください"
          : isAudit
            ? "2種類のCSVを選択してください"
            : "PayPay CSVを選択してください"}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-zinc-600">
        {isAudit
          ? "PayPayの取引履歴とMoneyForward MEの明細を比較し、重複や別口座への取り込み候補を表示します。"
          : "PayPayの併用払いを分割し、MoneyForward MEへ取り込める100件単位のCSVを作成します。"}
      </p>
      <div className="mt-6 flex items-center gap-2 text-xs font-semibold">
        <span
          className={`inline-flex items-center gap-1.5 ${
            hasPayPay ? "text-emerald-700" : "text-zinc-400"
          }`}
        >
          {hasPayPay ? (
            <Check className="size-3.5" aria-hidden="true" />
          ) : (
            <span className="size-1.5 bg-zinc-300" />
          )}
          PayPay
        </span>
        <ArrowRight className="size-3.5 text-zinc-300" aria-hidden="true" />
        <span
          className={`inline-flex items-center gap-1.5 ${
            hasMfme ? "text-emerald-700" : "text-zinc-400"
          }`}
        >
          {hasMfme ? (
            <Check className="size-3.5" aria-hidden="true" />
          ) : (
            <span className="size-1.5 bg-zinc-300" />
          )}
          MoneyForward ME
        </span>
      </div>
    </div>
  );
}

export default function Home() {
  const [mode, setMode] = useState<WorkspaceMode>("convert");
  const [payPayData, setPayPayData] = useState<PayPayParsedData | null>(null);
  const [mfmeData, setMfmeData] = useState<MfmeParsedData | null>(null);
  const [importedChunkKeys, setImportedChunkKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [modalContext, setModalContext] = useState<{
    name: string;
    index: number;
  } | null>(null);

  const processingResult = useMemo(() => {
    if (!payPayData || !mfmeData) {
      return {
        chunks: {} satisfies ProcessedResult,
        duplicates: 0,
        deletionCandidates: [],
      };
    }

    const { transactions, headers } = payPayData;
    const { exclusionSet, records } = mfmeData;
    const { groupedRecords, duplicates } = filterTransactions(
      transactions,
      exclusionSet,
    );

    return {
      chunks: createChunksFromGroupedRecords(groupedRecords, headers),
      duplicates,
      deletionCandidates: findMfmeDeletionCandidates(transactions, records),
    };
  }, [payPayData, mfmeData]);

  const processedChunks = useMemo<ProcessedResult>(
    () =>
      Object.fromEntries(
        Object.entries(processingResult.chunks).map(([name, chunks]) => [
          name,
          chunks.map((chunk, index) => ({
            ...chunk,
            imported: importedChunkKeys.has(`${name}:${index}`),
          })),
        ]),
      ),
    [processingResult.chunks, importedChunkKeys],
  );

  const handleMarkAsImported = () => {
    if (!modalContext) return;
    setImportedChunkKeys((currentKeys) => {
      const nextKeys = new Set(currentKeys);
      nextKeys.add(`${modalContext.name}:${modalContext.index}`);
      return nextKeys;
    });
    setModalContext(null);
  };

  const resetImportState = () => {
    setImportedChunkKeys(new Set());
    setModalContext(null);
  };

  const hasMfmeRecords = Boolean(mfmeData && mfmeData.stats.count > 0);
  const hasOutput = Object.keys(processedChunks).length > 0;
  const canShowConversion = Boolean(payPayData && mfmeData && hasOutput);
  const canShowAudit = Boolean(payPayData && hasMfmeRecords);

  const handleDownloadAudit = () => {
    const csv = createDeletionCandidatesCsv(
      processingResult.deletionCandidates,
    );
    downloadCsv(
      "mfme-review-candidates.csv",
      new Blob([`\uFEFF${csv}`], { type: "text/csv" }),
    );
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center bg-red-600 text-sm font-black text-white">
              P
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold text-zinc-950 sm:text-base">
                PayPay CSV Optimizer
              </h1>
              <p className="hidden text-xs text-zinc-500 sm:block">
                for MoneyForward ME
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500">
            <LockKeyhole className="size-3.5" aria-hidden="true" />
            ブラウザ内で処理
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 sm:py-7">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold text-red-600">WORKSPACE</p>
            <h2 className="mt-1 text-2xl font-bold text-zinc-950">
              {mode === "convert" ? "CSVを変換" : "取り込みを調査"}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-zinc-600">
              {mode === "convert"
                ? "PayPay明細を口座ごとに整理し、MoneyForward ME用のCSVを作成します。"
                : "取り込み済み明細から、重複や別口座への登録候補を洗い出します。"}
            </p>
          </div>

          <div
            className="grid grid-cols-2 border border-zinc-300 bg-white p-1"
            role="tablist"
            aria-label="作業モード"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "convert"}
              onClick={() => setMode("convert")}
              className={`inline-flex h-9 items-center justify-center gap-2 px-4 text-sm font-semibold ${
                mode === "convert"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              <Upload className="size-4" aria-hidden="true" />
              CSV変換
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "audit"}
              onClick={() => setMode("audit")}
              className={`inline-flex h-9 items-center justify-center gap-2 px-4 text-sm font-semibold ${
                mode === "audit"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              <Search className="size-4" aria-hidden="true" />
              取り込み調査
            </button>
          </div>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="border border-zinc-200 bg-white">
            <div className="border-b border-zinc-200 px-5 py-4">
              <h2 className="text-sm font-bold text-zinc-950">入力ファイル</h2>
              <p className="mt-1 text-xs text-zinc-500">
                タブを切り替えても選択内容は保持されます
              </p>
            </div>
            <div className="space-y-6 p-5">
              <Step1PayPayUpload
                onDataParsed={(data) => {
                  setPayPayData(data);
                  resetImportState();
                }}
              />
              <div className="border-t border-zinc-200 pt-5">
                <Step2MfmeFilter
                  allowSkip={mode === "convert"}
                  onDataParsed={(data) => {
                    setMfmeData(data);
                    resetImportState();
                  }}
                  duplicates={processingResult.duplicates}
                  totalTransactions={payPayData?.transactions.length}
                />
              </div>
            </div>
          </aside>

          <div className="min-w-0 border border-zinc-200 bg-white">
            {mode === "convert" ? (
              canShowConversion ? (
                <Step3FileList
                  processedChunks={processedChunks}
                  onShare={shareCsv}
                  onShareClick={(name, index) =>
                    setModalContext({ name, index })
                  }
                />
              ) : (
                <WorkspaceEmptyState
                  mode={mode}
                  hasPayPay={Boolean(payPayData)}
                  hasMfme={Boolean(mfmeData)}
                />
              )
            ) : canShowAudit ? (
              <Step4DeletionCandidates
                candidates={processingResult.deletionCandidates}
                onDownload={handleDownloadAudit}
              />
            ) : (
              <WorkspaceEmptyState
                mode={mode}
                hasPayPay={Boolean(payPayData)}
                hasMfme={hasMfmeRecords}
              />
            )}
          </div>
        </div>
      </main>

      {modalContext && (
        <MfImportGuideModal
          accountName={modalContext.name}
          onClose={() => setModalContext(null)}
          onImported={handleMarkAsImported}
        />
      )}
    </div>
  );
}
