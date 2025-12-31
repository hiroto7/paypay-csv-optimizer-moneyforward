import { useEffect, useState } from "react";
import Step1PayPayUpload, {
  type PayPayParsedData,
} from "~/components/Step1PayPayUpload";
import Step2MfmeFilter, {
  type MfmeParsedData,
} from "~/components/Step2MfmeFilter";
import Step3FileList from "~/components/Step3FileList";
import {
  createChunksFromGroupedRecords,
  filterTransactions,
  type ProcessedResult,
} from "~/services/csv-processor";
import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "PayPay CSV Optimizer for マネーフォワード ME" },
    {
      name: "description",
      content:
        "PayPayの取引履歴CSVをマネーフォワード ME用に変換。併用払いを自動分割",
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
};

const handleShare = async (
  filename: string,
  data: string,
  onShared: () => void,
) => {
  const blob = new Blob([`\uFEFF${data}`], { type: "text/csv" });
  const file = new File([blob], filename, { type: "text/csv" });

  if (
    navigator.share &&
    navigator.canShare &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file] });
      onShared();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Share was aborted by the user.");
        return;
      }
      console.error("Share failed, falling back to download:", error);
      downloadCsv(filename, blob);
    }
  } else {
    downloadCsv(filename, blob);
  }
};

const MfImportGuideModal = ({
  isOpen,
  onClose,
  onImported,
  accountName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
  accountName: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex justify-center items-center transition-opacity duration-300">
      <div
        className="bg-slate-800 border border-slate-700 rounded-xl shadow-lg p-6 md:p-8 max-w-lg w-full mx-4"
        role="dialog"
        aria-modal="true"
      >
        <h3 className="text-2xl font-bold mb-6 text-slate-100">
          マネーフォワード MEでの取り込み手順
        </h3>
        <div className="space-y-4 text-slate-300 leading-relaxed">
          <p>
            <span className="font-bold text-lg mr-2">1.</span>
            マネーフォワード
            MEアプリに移動すると「読み込んだ明細」画面が表示されます。
          </p>
          <p>
            <span className="font-bold text-lg mr-2">2.</span>
            「支出元・入金先一括変更」から
            <strong className="font-bold text-purple-400 mx-1.5">
              {accountName}
            </strong>
            を選択します。
          </p>
          <p>
            <span className="font-bold text-lg mr-2">3.</span>
            右上の「保存」をタップすれば、マネーフォワード
            MEでの操作は完了です。
          </p>
          <p>
            <span className="font-bold text-lg mr-2">4.</span>
            このアプリに戻り、「取り込み完了」ボタンを押してダイアログを閉じてください。
          </p>
        </div>
        <div className="mt-8 flex justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-700 text-slate-200 rounded-md font-semibold hover:bg-slate-600 transition-colors"
          >
            閉じる
          </button>
          <button
            type="button"
            onClick={onImported}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-500 transition-colors"
          >
            取り込み完了
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const [payPayData, setPayPayData] = useState<PayPayParsedData | null>(null);
  const [mfmeData, setMfmeData] = useState<MfmeParsedData | null>(null);
  const [processedChunks, setProcessedChunks] = useState<ProcessedResult>({});
  const [duplicates, setDuplicates] = useState<number>(0);
  const [modalContext, setModalContext] = useState<{
    name: string;
    index: number;
  } | null>(null);

  const handleMarkAsImported = () => {
    if (!modalContext) return;

    setProcessedChunks((prev) => {
      const newChunks = { ...prev };
      const chunkToUpdate = newChunks[modalContext.name]?.[modalContext.index];
      if (chunkToUpdate) {
        chunkToUpdate.imported = true;
      }
      return newChunks;
    });
    setModalContext(null);
  };

  const handlePayPayDataParsed = (data: PayPayParsedData | null) => {
    setPayPayData(data);
  };

  const handleMfmeDataParsed = (data: MfmeParsedData | null) => {
    setMfmeData(data);
  };

  useEffect(() => {
    // PayPayデータまたはMFMEデータのどちらかがないときは何もしない
    if (!payPayData || !mfmeData) {
      setProcessedChunks({});
      setDuplicates(0);
      return;
    }

    const { transactions, headers } = payPayData;
    const { exclusionSet } = mfmeData;

    // フィルタリング処理
    const { groupedRecords, duplicates: calculatedDuplicates } =
      filterTransactions(transactions, exclusionSet);
    setDuplicates(calculatedDuplicates);

    // チャンクに分割してCSV文字列化
    const chunks = createChunksFromGroupedRecords(groupedRecords, headers);

    setProcessedChunks(chunks);
  }, [payPayData, mfmeData]);

  return (
    <div className="bg-slate-900 text-slate-200 min-h-screen font-sans">
      <main className="container mx-auto px-4 py-12 md:py-20">
        <div className="flex flex-col items-center gap-12">
          <header className="flex flex-col items-center text-center gap-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="bg-linear-to-r from-red-500 to-red-400 text-transparent bg-clip-text">
                PayPay
              </span>{" "}
              CSV Optimizer
            </h1>
            <p className="text-lg text-slate-400">for マネーフォワード ME</p>
          </header>

          <div className="w-full max-w-4xl space-y-10">
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 shadow-lg p-6 md:p-8">
              <h2 className="text-2xl font-bold mb-6 text-center">
                かんたん3ステップ
              </h2>
              <ol className="list-decimal list-inside space-y-3 text-slate-300 text-lg">
                <li>
                  PayPayの取引履歴CSVファイルをドラッグ＆ドロップ（または選択）
                </li>
                <li>
                  既に登録済みの取引がある場合は、マネーフォワード
                  MEからエクスポートしたCSVを追加して除外。または「スキップ」ボタンをクリック
                </li>
                <li>
                  生成されたファイルを「取り込み」ボタンからマネーフォワード
                  MEに連携してインポート
                </li>
              </ol>
            </div>

            {/* Step 1: PayPay CSV Input */}
            <Step1PayPayUpload onDataParsed={handlePayPayDataParsed} />

            {/* Step 2: MoneyForward ME CSV Input (Optional) */}
            <Step2MfmeFilter
              onDataParsed={handleMfmeDataParsed}
              duplicates={duplicates}
              totalTransactions={payPayData?.transactions.length}
            />

            {Object.keys(processedChunks).length > 0 && mfmeData && (
              <Step3FileList
                processedChunks={processedChunks}
                onShare={handleShare}
                onShareClick={(name, index) => setModalContext({ name, index })}
              />
            )}
          </div>
        </div>
      </main>
      <MfImportGuideModal
        isOpen={modalContext !== null}
        onClose={() => setModalContext(null)}
        onImported={handleMarkAsImported}
        accountName={modalContext?.name ?? ""}
      />
    </div>
  );
}
