import type { ProcessedResult } from "~/services/csv-processor";

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

interface Step3FileListProps {
  processedChunks: ProcessedResult;
  onShare: (
    filename: string,
    data: string,
    onShared: () => void,
  ) => Promise<void>;
  onShareClick: (name: string, index: number) => void;
}

export default function Step3FileList({
  processedChunks,
  onShare,
  onShareClick,
}: Step3FileListProps) {
  return (
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
                    <strong>注意:</strong> マネーフォワード MEで「{name}
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
                          onShare(filename, chunk.data, () =>
                            onShareClick(name, index),
                          )
                        }
                        disabled={chunk.imported}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-md shrink-0 font-semibold text-white transition-all duration-200 ease-in-out disabled:bg-slate-600 disabled:cursor-not-allowed bg-green-600 hover:bg-green-500"
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
  );
}
