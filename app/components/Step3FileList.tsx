import {
  AlertTriangle,
  CalendarDays,
  Check,
  Download,
  FileSpreadsheet,
  Rows3,
} from "lucide-react";
import PeriodDisplay from "~/components/PeriodDisplay";
import type { ProcessedResult } from "~/services/csv-processor";

interface Step3FileListProps {
  processedChunks: ProcessedResult;
  onShare: (
    filename: string,
    data: string,
    onShared: () => void,
  ) => Promise<void>;
  onShareClick: (name: string, index: number) => void;
}

const createFilename = (
  filenameBase: string,
  index: number,
  totalParts: number,
) => `paypay-${filenameBase}${totalParts > 1 ? `_part${index + 1}` : ""}.csv`;

const createUniqueFilenameBases = (names: string[]) => {
  const usedBases = new Set<string>();

  return names.map((name) => {
    const normalizedName =
      name
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-|-$/g, "") || "transactions";
    let filenameBase = normalizedName;
    let suffix = 2;

    while (usedBases.has(filenameBase)) {
      filenameBase = `${normalizedName}-${suffix}`;
      suffix++;
    }

    usedBases.add(filenameBase);
    return filenameBase;
  });
};

export default function Step3FileList({
  processedChunks,
  onShare,
  onShareClick,
}: Step3FileListProps) {
  const groups = Object.entries(processedChunks).filter(
    ([, chunks]) => chunks.length > 0,
  );
  const uniqueFilenameBases = createUniqueFilenameBases(
    groups.map(([name]) => name),
  );
  const totalFiles = groups.reduce((sum, [, chunks]) => sum + chunks.length, 0);
  const totalRecords = groups.reduce(
    (sum, [, chunks]) =>
      sum + chunks.reduce((chunkSum, chunk) => chunkSum + chunk.count, 0),
    0,
  );

  return (
    <section aria-labelledby="output-title">
      <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="output-title" className="text-base font-bold text-zinc-950">
            変換結果
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {totalRecords}件を{totalFiles}ファイルに分割しました
          </p>
        </div>
        <div className="flex gap-4 text-xs text-zinc-600">
          <span className="inline-flex items-center gap-1.5">
            <Rows3 className="size-3.5" aria-hidden="true" />
            {groups.length}口座
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FileSpreadsheet className="size-3.5" aria-hidden="true" />
            {totalFiles}ファイル
          </span>
        </div>
      </div>

      <div className="divide-y divide-zinc-200">
        {groups.map(([name, chunks], groupIndex) => (
          <div key={name} className="px-5 py-5">
            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
              <h3 className="text-sm font-bold text-zinc-950">{name}</h3>
              <span className="text-xs text-zinc-500">
                {chunks.reduce((sum, chunk) => sum + chunk.count, 0)}件
              </span>
            </div>

            {!name.startsWith("PayPay") && (
              <div className="mb-3 flex gap-2 border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <AlertTriangle
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <p>
                  MoneyForward MEで「{name}
                  」を直接連携している場合は、重複しないか確認してください。
                </p>
              </div>
            )}

            <div className="divide-y divide-zinc-200 border-y border-zinc-200">
              {chunks.map((chunk, index) => {
                const filename = createFilename(
                  uniqueFilenameBases[groupIndex] ?? name,
                  index,
                  chunks.length,
                );
                return (
                  <div
                    key={filename}
                    className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className={chunk.imported ? "opacity-55" : ""}>
                      <p className="break-all text-sm font-semibold text-zinc-800">
                        {filename}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                        <span>{chunk.count}件</span>
                        {chunk.startDate && chunk.endDate && (
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays
                              className="size-3.5"
                              aria-hidden="true"
                            />
                            <PeriodDisplay
                              startDate={chunk.startDate}
                              endDate={chunk.endDate}
                            />
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onShare(filename, chunk.data, () =>
                          onShareClick(name, index),
                        )
                      }
                      disabled={chunk.imported}
                      className={`inline-flex h-9 w-full items-center justify-center gap-2 px-4 text-sm font-semibold sm:w-auto ${
                        chunk.imported
                          ? "cursor-default bg-zinc-100 text-zinc-500"
                          : "bg-zinc-900 text-white hover:bg-zinc-700"
                      }`}
                    >
                      {chunk.imported ? (
                        <Check className="size-4" aria-hidden="true" />
                      ) : (
                        <Download className="size-4" aria-hidden="true" />
                      )}
                      {chunk.imported ? "確認済み" : "取り込む"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
