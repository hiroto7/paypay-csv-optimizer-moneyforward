import { useState } from "react";
import type { Route } from "./+types/home";
import {
  processPayPayCsv,
  type ProcessedResult,
} from "~/services/csv-processor";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "PayPay CSV Optimizer for MoneyForward ME" },
    { name: "description", content: "Optimize PayPay CSV for MoneyForward ME" },
  ];
}

const createCsvBlob = (data: string) => {
  return new Blob([`\uFEFF${data}`], {
    type: "text/csv;charset=utf-8;",
  });
};

const downloadCsv = (filename: string, data: string) => {
  const blob = createCsvBlob(data);
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const handleShare = async (filename: string, data: string) => {
  const blob = createCsvBlob(data);
  const file = new File([blob], filename, {
    type: "text/csv;charset=utf-8;",
  });

  if (
    navigator.share &&
    navigator.canShare &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file] });
    } catch (error) {
      console.error("Share failed:", error);
      downloadCsv(filename, data);
    }
  } else {
    downloadCsv(filename, data);
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
    timeStyle: "medium",
  });
  return (
    <p className="text-sm text-gray-600 dark:text-gray-300">
      期間: {dtf.formatRange(startDate, endDate)}
    </p>
  );
};

export default function Home() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [processedChunks, setProcessedChunks] = useState<ProcessedResult>({});
  const [error, setError] = useState<string>("");
  const [importedTransactionIds, setImportedTransactionIds] =
    useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCsvFile(e.target.files?.[0] ?? null);
  };

  const processCsv = async () => {
    if (!csvFile) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setError("");
        setProcessedChunks({});

        const text = e.target?.result;
        if (typeof text !== "string") {
          setError("Failed to read file.");
          return;
        }

        const importedIds = new Set(
          importedTransactionIds.split(/\s+/).filter(Boolean)
        );
        const result = processPayPayCsv(text, importedIds);

        if (Object.keys(result).length === 0) {
          setError(
            "処理対象のデータが見つかりませんでした。取り込み済み取引番号を確認してください。"
          );
        }

        setProcessedChunks(result);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unknown error occurred.");
        }
      }
    };
    reader.readAsText(csvFile, "Shift_JIS");
  };

  return (
    <main className="flex items-center justify-center pt-16 pb-4">
      <div className="flex-1 flex flex-col items-center gap-16 min-h-0">
        <header className="flex flex-col items-center gap-9">
          <h1 className="text-4xl font-bold">PayPay CSV Optimizer</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            for MoneyForward ME
          </p>
        </header>
        <div className="max-w-2xl w-full space-y-6 px-4">
          <div className="rounded-3xl border border-gray-200 p-6 dark:border-gray-700 space-y-4">
            <h2 className="text-xl font-bold">使い方</h2>
            <p className="leading-6 text-gray-700 dark:text-gray-200">
              1. PayPayアプリから取引履歴CSVをエクスポートします。
            </p>
            <p className="leading-6 text-gray-700 dark:text-gray-200">
              2. （任意）既に取り込み済みの取引がある場合、MoneyForward
              MEからCSVをダウンロードし、取引番号を下のテキストエリアに貼り付けます。
            </p>
            <p className="leading-6 text-gray-700 dark:text-gray-200">
              3. 下のボタンからPayPayのCSVファイルをアップロードして処理します。
            </p>
            <p className="leading-6 text-gray-700 dark:text-gray-200">
              4. 生成されたファイルを共有または保存し、MoneyForward
              MEにインポートします。
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 p-6 dark:border-gray-700 space-y-4">
            <h2 className="text-xl font-bold">取り込み済み取引番号</h2>
            <textarea
              rows={5}
              placeholder="ここに取引番号を改行またはスペース区切りで入力します"
              className="w-full p-2 border border-gray-300 rounded-md"
              onChange={(e) => setImportedTransactionIds(e.target.value)}
            />
          </div>

          <div className="flex flex-col items-center gap-4">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <button
              onClick={processCsv}
              disabled={!csvFile}
              className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-gray-400"
            >
              処理を実行
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md">
              <p>{error}</p>
            </div>
          )}

          {Object.keys(processedChunks).length > 0 && (
            <div className="space-y-8 pt-8">
              {Object.keys(processedChunks).map((name) => {
                const chunks = processedChunks[name];
                if (!chunks || chunks.length === 0) return null;

                return (
                  <div key={name}>
                    <h2 className="text-xl font-bold mb-4">{name}</h2>
                    <div className="space-y-4">
                      {chunks.map((chunk, index) => {
                        const totalParts = chunks.length;
                        const filename = `paypay-${name.toLowerCase().replace(/\s/g, "-")}${totalParts > 1 ? `_part${index + 1}` : ""}.csv`;
                        return (
                          <div
                            key={filename}
                            className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center"
                          >
                            <div>
                              {totalParts > 1 && (
                                <p className="font-semibold">
                                  ファイル {index + 1}/{totalParts}
                                </p>
                              )}
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {chunk.count}件
                              </p>
                              {chunk.startDate && chunk.endDate && (
                                <PeriodDisplay
                                  startDate={chunk.startDate}
                                  endDate={chunk.endDate}
                                />
                              )}
                            </div>
                            <button
                              onClick={() => handleShare(filename, chunk.data)}
                              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex-shrink-0"
                            >
                              共有 / 保存
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
