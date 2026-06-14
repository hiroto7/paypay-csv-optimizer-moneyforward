import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  Rows3,
} from "lucide-react";
import { useState } from "react";
import PeriodDisplay from "~/components/PeriodDisplay";
import type { ProcessedCsvChunk, ProcessedResult } from "~/services/paypay-csv";
import { sum } from "~/utils/array";

interface Step3FileListProps {
  processedChunks: ProcessedResult;
  onShare: (
    filename: string,
    data: string,
    onShared: () => void,
  ) => Promise<void>;
  onShareClick: (name: string, index: number) => void;
}

type FileGroup = {
  name: string;
  chunks: ProcessedCsvChunk[];
  filenameBase: string;
};

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

const isPayPayMethod = (name: string) => name.startsWith("PayPay");

const countRecords = (chunks: ProcessedCsvChunk[]) =>
  sum(chunks, (chunk) => chunk.count);

function FileGroupList({
  groups,
  manualImport,
  onShare,
  onShareClick,
}: {
  groups: FileGroup[];
  manualImport: boolean;
  onShare: Step3FileListProps["onShare"];
  onShareClick: Step3FileListProps["onShareClick"];
}) {
  return (
    <div className="divide-y divide-zinc-200">
      {groups.map(({ name, chunks, filenameBase }) => (
        <div key={name} className="px-5 py-5">
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="text-sm font-bold text-zinc-950">{name}</h3>
            <span className="text-xs text-zinc-500">
              {countRecords(chunks)}件
            </span>
          </div>

          {manualImport && (
            <div className="mb-3 flex gap-2 border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <p>
                MoneyForward MEで「{name}
                」を直接連携している場合は、重複するため取り込まないでください。
              </p>
            </div>
          )}

          <div className="divide-y divide-zinc-200 border-y border-zinc-200">
            {chunks.map((chunk, index) => {
              const filename = createFilename(
                filenameBase,
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
                    className={`inline-flex min-h-9 w-full items-center justify-center gap-2 px-4 py-2 text-sm font-semibold sm:w-auto ${
                      chunk.imported
                        ? "cursor-default bg-zinc-100 text-zinc-500"
                        : manualImport
                          ? "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
                          : "bg-zinc-900 text-white hover:bg-zinc-700"
                    }`}
                  >
                    {chunk.imported ? (
                      <Check className="size-4" aria-hidden="true" />
                    ) : (
                      <Download className="size-4" aria-hidden="true" />
                    )}
                    {chunk.imported
                      ? "確認済み"
                      : manualImport
                        ? "手動登録が必要なので取り込む"
                        : "取り込む"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Step3FileList({
  processedChunks,
  onShare,
  onShareClick,
}: Step3FileListProps) {
  const [showManualImports, setShowManualImports] = useState(false);
  const groupEntries = Object.entries(processedChunks).filter(
    ([, chunks]) => chunks.length > 0,
  );
  const uniqueFilenameBases = createUniqueFilenameBases(
    groupEntries.map(([name]) => name),
  );
  const groups = groupEntries.map(
    ([name, chunks], index): FileGroup => ({
      name,
      chunks,
      filenameBase: uniqueFilenameBases[index] ?? name,
    }),
  );
  const payPayGroups = groups.filter(({ name }) => isPayPayMethod(name));
  const manualImportGroups = groups.filter(({ name }) => !isPayPayMethod(name));
  const totalFiles = sum(groups, ({ chunks }) => chunks.length);
  const totalRecords = sum(groups, ({ chunks }) => countRecords(chunks));
  const manualImportFiles = sum(
    manualImportGroups,
    ({ chunks }) => chunks.length,
  );
  const manualImportRecords = sum(manualImportGroups, ({ chunks }) =>
    countRecords(chunks),
  );
  const manualImportSummary = manualImportGroups
    .map(({ name, chunks }) => `${name} ${countRecords(chunks)}件`)
    .join("、");

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

      {payPayGroups.length > 0 && (
        <FileGroupList
          groups={payPayGroups}
          manualImport={false}
          onShare={onShare}
          onShareClick={onShareClick}
        />
      )}

      {manualImportGroups.length > 0 && (
        <div className="border-t border-zinc-200 bg-zinc-50">
          <div className="px-5 py-5">
            <div className="flex gap-3">
              <AlertTriangle
                className="mt-0.5 size-5 shrink-0 text-amber-600"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-zinc-950">
                  通常は取り込まない支払い方法
                </h3>
                <p className="mt-1 text-xs font-semibold text-zinc-700">
                  {manualImportRecords}件 / {manualImportFiles}ファイル
                </p>
                <p className="mt-2 text-xs leading-5 text-zinc-600">
                  {manualImportSummary}
                </p>
                <p className="mt-2 text-xs leading-5 text-zinc-600">
                  カード・銀行口座としてMoneyForward
                  MEに直接連携済みの場合は、重複するため通常は取り込まないでください。直接連携していない場合や、未対応の決済手段を手動登録する場合のみ利用します。
                </p>
                <button
                  type="button"
                  onClick={() => setShowManualImports((current) => !current)}
                  className="mt-3 inline-flex h-9 items-center gap-2 border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
                  aria-expanded={showManualImports}
                  aria-controls="manual-import-groups"
                >
                  {showManualImports ? (
                    <ChevronUp className="size-4" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="size-4" aria-hidden="true" />
                  )}
                  {showManualImports ? "詳細を閉じる" : "詳細を表示"}
                </button>
              </div>
            </div>
          </div>

          {showManualImports && (
            <div
              id="manual-import-groups"
              className="border-t border-zinc-200 bg-white"
            >
              <FileGroupList
                groups={manualImportGroups}
                manualImport
                onShare={onShare}
                onShareClick={onShareClick}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
