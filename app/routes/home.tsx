import { useEffect, useState, useRef } from "react";
import type { Route } from "./+types/home";
import {
  processPayPayCsv,
  type ProcessedResult,
  type FileStats,
  type MfFileStats,
} from "~/services/csv-processor";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "PayPay CSV Optimizer for マネーフォワード ME" },
    { name: "description", content: "PayPayの取引履歴CSVをマネーフォワード ME用に変換。併用払いを自動分割" },
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
  onShared: () => void
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

const PeriodDisplay = ({
  startDate,
  endDate,
}: {
  startDate: Date;
  endDate: Date;
}) => {
  const dtf = new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "short",
  });
  return <>{dtf.formatRange(startDate, endDate)}</>;
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
    <div
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex justify-center items-center transition-opacity duration-300"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-xl shadow-lg p-6 md:p-8 max-w-lg w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-2xl font-bold mb-6 text-slate-100">
          マネーフォワード MEでの取り込み手順
        </h3>
        <div className="space-y-4 text-slate-300 leading-relaxed">
          <p>
            <span className="font-bold text-lg mr-2">1.</span>
            マネーフォワード MEアプリに移動すると「読み込んだ明細」画面が表示されます。
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
            右上の「保存」をタップすれば、マネーフォワード MEでの操作は完了です。
          </p>
          <p>
            <span className="font-bold text-lg mr-2">4.</span>
            このアプリに戻り、「取り込み完了」ボタンを押してダイアログを閉じてください。
          </p>
        </div>
        <div className="mt-8 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-700 text-slate-200 rounded-md font-semibold hover:bg-slate-600 transition-colors"
          >
            閉じる
          </button>
          <button
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
  const [payPayFile, setPayPayFile] = useState<File | null>(null);
  const [mfmeFiles, setMfmeFiles] = useState<FileList | null>(null);
  const [processedChunks, setProcessedChunks] = useState<ProcessedResult>({});
  const [paypayStats, setPaypayStats] = useState<FileStats | null>(null);
  const [mfStats, setMfStats] = useState<MfFileStats | null>(null);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [modalContext, setModalContext] = useState<{
    name: string;
    index: number;
  } | null>(null);
  const [isPayPayDragging, setIsPayPayDragging] = useState(false);
  const [isMfDragging, setIsMfDragging] = useState(false);
  const [isMfmeSkipped, setIsMfmeSkipped] = useState(false);

  const paypayInputRef = useRef<HTMLInputElement>(null);
  const mfInputRef = useRef<HTMLInputElement>(null);

  const handlePayPayFileChange = (files: FileList | null) => {
    setPayPayFile(files?.[0] ?? null);
  };

  const handleMfCsvFileChange = (files: FileList | null) => {
    setMfmeFiles(files);
    // ファイルが選択されたらスキップ状態を解除
    if (files && files.length > 0) {
      setIsMfmeSkipped(false);
    }
  };

  const handleSkipMfme = () => {
    setIsMfmeSkipped(true);
    setMfmeFiles(null);
  };

  const createDragHandlers = (
    setDragging: (isDragging: boolean) => void,
    fileHandler: (files: FileList | null) => void
  ) => ({
    onDragEnter: (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      setDragging(true);
    },
    onDragLeave: (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      // Check if the pointer is leaving the drop zone (including its children)
      // and not just moving from parent to child element within the drop zone.
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setDragging(false);
      }
    },
    onDragOver: (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault(); // Necessary to allow drop
    },
    onDrop: (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      setDragging(false);
      fileHandler(e.dataTransfer.files);
    },
  });

  const paypayDragHandlers = createDragHandlers(
    setIsPayPayDragging,
    handlePayPayFileChange
  );
  const mfDragHandlers = createDragHandlers(
    setIsMfDragging,
    handleMfCsvFileChange
  );

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

  useEffect(() => {
    const processCsv = async () => {
      if (!payPayFile) return;

      setIsLoading(true);
      setError("");
      setProcessedChunks({});
      setPaypayStats(null);
      setMfStats(null);

      const readPayPayFile = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (typeof e.target?.result === "string") {
            resolve(e.target.result);
          } else {
            reject(new Error("Failed to read PayPay CSV file."));
          }
        };
        reader.onerror = () =>
          reject(new Error("Error reading PayPay CSV file."));
        reader.readAsText(payPayFile, "Shift_JIS");
      });

      const readMfmeFiles = mfmeFiles
        ? Promise.all(
            Array.from(mfmeFiles).map(
              (file) =>
                new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    if (typeof e.target?.result === "string") {
                      resolve(e.target.result);
                    } else {
                      reject(new Error(`Failed to read file: ${file.name}`));
                    }
                  };
                  reader.onerror = () =>
                    reject(new Error(`Error reading file: ${file.name}`));
                  reader.readAsText(file, "Shift_JIS");
                })
            )
          )
        : Promise.resolve([]);

      try {
        const [payPayContent, mfmeContents] = await Promise.all([
          readPayPayFile,
          readMfmeFiles,
        ]);

        const result = processPayPayCsv(payPayContent, mfmeContents);
        const { chunks, paypayStats, mfStats } = result;

        if (Object.keys(chunks).length === 0) {
          setError(
            "変換できる取引が見つかりませんでした。ファイルが正しいか、または（重複防止用ファイルをアップロードした場合）全ての取引が既に取り込み済みでないか確認してください。"
          );
        }

        setProcessedChunks(chunks);
        setPaypayStats(paypayStats);
        setMfStats(mfStats);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("不明なエラーが発生しました。");
        }
      } finally {
        setIsLoading(false);
      }
    };

    processCsv();
  }, [payPayFile, mfmeFiles]);

  return (
    <div className="bg-slate-900 text-slate-200 min-h-screen font-sans">
      <main className="container mx-auto px-4 py-12 md:py-20">
        <div className="flex flex-col items-center gap-12">
          <header className="flex flex-col items-center text-center gap-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-red-500 to-red-400 text-transparent bg-clip-text">
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
                  既に登録済みの取引がある場合は、マネーフォワード MEからエクスポートしたCSVを追加して除外。または「スキップ」ボタンをクリック
                </li>
                <li>
                  生成されたファイルを「取り込み」ボタンからマネーフォワード MEに連携してインポート
                </li>
              </ol>
            </div>

            {/* Step 1: PayPay CSV Input */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 shadow-lg p-6 md:p-8">
              <h2 className="text-2xl font-bold text-slate-100 mb-4">
                1. PayPayの取引履歴CSVを選択
              </h2>
              <label
                htmlFor="paypay-csv-input"
                className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors block ${
                  isPayPayDragging
                    ? "border-red-500 bg-red-500/10"
                    : "border-slate-600 hover:border-red-400"
                }`}
                {...paypayDragHandlers}
              >
                <input
                  id="paypay-csv-input"
                  ref={paypayInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => handlePayPayFileChange(e.target.files)}
                  className="sr-only"
                />
                <p className="text-slate-400 pointer-events-none">
                  {payPayFile
                    ? payPayFile.name
                    : "ファイルをドラッグ＆ドロップするか、ここをクリックして選択"}
                </p>
              </label>
              {paypayStats && (
                <div className="mt-4 space-y-1 text-sm text-slate-400">
                  <p>読み込み件数: {paypayStats.count}件</p>
                  {paypayStats.startDate && paypayStats.endDate && (
                    <p>
                      明細の期間:{" "}
                      <PeriodDisplay
                        startDate={paypayStats.startDate}
                        endDate={paypayStats.endDate}
                      />
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: MoneyForward ME CSV Input (Optional) */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 shadow-lg p-6 md:p-8">
              <h2 className="text-2xl font-bold text-slate-100 mb-4">
                2. 既に登録済みの取引を除外（任意）
              </h2>
              <p className="text-sm text-slate-400 mb-4">
                マネーフォワード MEのアプリまたはWebサイトからエクスポートした取引履歴CSVを選択してください。既に登録済みの取引が自動で除外されます。
              </p>

              {!isMfmeSkipped ? (
                <>
                  <p className="text-sm font-semibold text-yellow-300 mb-4">
                    ⚠️ 既に取り込み済みの取引がある場合は、ここでCSVを選択してください
                  </p>
                  <label
                    htmlFor="mfme-csv-input"
                    className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors block ${
                      isMfDragging
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-slate-600 hover:border-purple-400"
                    }`}
                    {...mfDragHandlers}
                  >
                    <input
                      id="mfme-csv-input"
                      ref={mfInputRef}
                      type="file"
                      accept=".csv"
                      multiple
                      onChange={(e) => handleMfCsvFileChange(e.target.files)}
                      className="sr-only"
                    />
                    <p className="text-slate-400 pointer-events-none">
                      {mfmeFiles && mfmeFiles.length > 0
                        ? `${mfmeFiles.length}個のファイルを選択中`
                        : "ここにファイルをドラッグ＆ドロップ（複数選択可）"}
                    </p>
                  </label>
                  {mfStats && mfStats.count > 0 && (
                    <div className="mt-4 space-y-1 text-sm text-slate-400">
                      <p>読み込み件数: {mfStats.count}件</p>
                      {mfStats.startDate && mfStats.endDate && (
                        <p>
                          明細の期間:{" "}
                          <PeriodDisplay
                            startDate={mfStats.startDate}
                            endDate={mfStats.endDate}
                          />
                        </p>
                      )}
                      <p>重複として除外: {mfStats.duplicates}件</p>
                    </div>
                  )}
                  {(!mfmeFiles || mfmeFiles.length === 0) && (
                    <div className="mt-4">
                      <button
                        onClick={handleSkipMfme}
                        className="w-full px-4 py-3 bg-slate-700 text-slate-200 rounded-lg font-semibold hover:bg-slate-600 transition-colors"
                      >
                        取り込み済み取引の除外をスキップ
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-slate-300 font-semibold mb-1">
                        ✓ 取り込み済み取引の除外をスキップしました
                      </p>
                      <p className="text-sm text-slate-400">
                        全ての取引が変換対象となります
                      </p>
                    </div>
                    <button
                      onClick={() => setIsMfmeSkipped(false)}
                      className="px-3 py-1.5 text-sm bg-slate-600 text-slate-200 rounded hover:bg-slate-500 transition-colors whitespace-nowrap"
                    >
                      やり直す
                    </button>
                  </div>
                </div>
              )}
            </div>

            {isLoading && (
              <div className="text-center py-6">
                <p className="text-lg text-slate-300 animate-pulse">
                  ファイル処理中...
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-900/50 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">
                <p>
                  <strong>エラー:</strong> {error}
                </p>
              </div>
            )}

            {Object.keys(processedChunks).length > 0 && (mfmeFiles || isMfmeSkipped) && (
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 shadow-lg p-6 md:p-8">
                <h2 className="text-2xl font-bold text-slate-100 mb-4">
                  3. マネーフォワード ME取込用ファイル
                </h2>
                <div className="space-y-6">
                  {Object.keys(processedChunks).map((name) => {
                    const chunks = processedChunks[name];
                    if (!chunks || chunks.length === 0) return null;

                    return (
                      <div key={name} className="space-y-3">
                        <div className="flex items-baseline gap-3">
                          <h3 className="text-xl font-bold">{name}</h3>
                          <span className="text-sm text-slate-400">
                            {chunks.reduce((sum, chunk) => sum + chunk.count, 0)}件
                          </span>
                        </div>
                        {!name.startsWith("PayPay") && (
                          <div className="text-sm bg-yellow-900/50 border border-yellow-500/30 text-yellow-300 p-3 rounded-md">
                            <p>
                              <strong>注意:</strong> マネーフォワード MEで「
                              {name}
                              」を直接連携している場合、CSVを取り込むと明細が重複する恐れがあります。
                            </p>
                          </div>
                        )}
                        <div className="space-y-3">
                          {chunks.map((chunk, index) => {
                            const totalParts = chunks.length;
                            const filename = `paypay-${name.toLowerCase().replace(/\s/g, "-")}${totalParts > 1 ? `_part${index + 1}` : ""}.csv`;
                            return (
                              <div
                                key={filename}
                                className={`rounded-lg p-4 border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                                  chunk.imported
                                    ? "bg-slate-700/30 border-slate-600/50"
                                    : "bg-slate-700/50 border-slate-600"
                                }`}
                              >
                                <div
                                  className={`${chunk.imported ? "line-through text-slate-500" : ""}`}
                                >
                                  <p className="font-semibold">
                                    {totalParts > 1
                                      ? `ファイル ${index + 1}/${totalParts}`
                                      : filename}
                                  </p>
                                  <div className="text-sm text-slate-400 flex gap-x-4">
                                    <p>{chunk.count}件</p>
                                    {chunk.startDate && chunk.endDate && (
                                      <p>
                                        期間:{" "}
                                        <PeriodDisplay
                                          startDate={chunk.startDate}
                                          endDate={chunk.endDate}
                                        />
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() =>
                                    handleShare(filename, chunk.data, () =>
                                      setModalContext({ name, index })
                                    )
                                  }
                                  disabled={chunk.imported}
                                  className="w-full sm:w-auto px-5 py-2.5 rounded-md flex-shrink-0 font-semibold text-white transition-all duration-200 ease-in-out disabled:bg-slate-600 disabled:cursor-not-allowed bg-green-600 hover:bg-green-500"
                                >
                                  {chunk.imported ? "取り込み済み" : "取り込み"}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
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
