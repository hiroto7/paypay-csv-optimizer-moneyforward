import {
  Check,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  Rows3,
} from "lucide-react";
import { useState } from "react";
import AccountBalanceControl from "~/components/AccountBalanceControl";
import FileStatsSummary from "~/components/FileStatsSummary";
import type { AccountBalance } from "~/services/local-exclusion-store";
import type { ProcessedCsvChunk, ProcessedResult } from "~/services/paypay-csv";
import { sum } from "~/utils/array";
import { createPp2mfOutputFilename } from "~/utils/pp2mf-output-filename";

interface Step3FileListProps {
  chunks: ProcessedResult;
  importedChunkKeys: ReadonlySet<string>;
  hasMfmeData: boolean;
  excludedByMfme: number;
  excludedByImportedRecords: number;
  onImport: (
    filename: string,
    data: string,
    name: string,
    index: number,
  ) => Promise<void>;
  accountBalances: ReadonlyMap<string, AccountBalance>;
  onSetBalance: (accountName: string, amount: number) => void;
  onClearBalance: (accountName: string) => void;
}

type DisplayChunk = ProcessedCsvChunk & { imported: boolean };

type FileGroup = {
  name: string;
  chunks: DisplayChunk[];
  filenameBase: string;
};

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

const countRecords = (chunks: ProcessedCsvChunk[]) =>
  sum(chunks, (chunk) => chunk.count);

function FileGroupList({
  groups,
  sharingFilename,
  onImport,
  accountBalances,
  onSetBalance,
  onClearBalance,
}: {
  groups: FileGroup[];
  sharingFilename: string | null;
  onImport: (
    filename: string,
    data: string,
    name: string,
    index: number,
  ) => void;
  accountBalances: ReadonlyMap<string, AccountBalance>;
  onSetBalance: (accountName: string, amount: number) => void;
  onClearBalance: (accountName: string) => void;
}) {
  const isSharing = sharingFilename !== null;

  return (
    <div className="divide-y divide-zinc-200">
      {groups.map(({ name, chunks, filenameBase }) => (
        <div key={name} className="px-5 py-5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div className="flex min-h-8 flex-wrap items-center gap-x-3 gap-y-1">
              <h3 className="text-sm font-bold text-zinc-950">{name}</h3>
              <span className="text-xs text-zinc-500">
                {countRecords(chunks)}件
              </span>
            </div>
            <AccountBalanceControl
              accountName={name}
              pendingDelta={sum(chunks, (chunk) =>
                chunk.imported ? 0 : chunk.balanceDelta,
              )}
              balance={accountBalances.get(name)}
              onSetBalance={onSetBalance}
              onClearBalance={onClearBalance}
            />
          </div>

          <div className="divide-y divide-zinc-200 border-y border-zinc-200">
            {chunks.map((chunk, index) => {
              const filename = createPp2mfOutputFilename(
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
                    <div className="mt-1 text-xs text-zinc-500">
                      <FileStatsSummary stats={chunk} />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onImport(filename, chunk.data, name, index)}
                    disabled={chunk.imported || isSharing}
                    className={`inline-flex min-h-9 w-full items-center justify-center gap-2 px-4 py-2 text-sm font-semibold sm:w-auto ${
                      chunk.imported
                        ? "cursor-default bg-zinc-100 text-zinc-500"
                        : isSharing
                          ? "cursor-wait bg-zinc-200 text-zinc-500"
                          : "bg-zinc-900 text-white hover:bg-zinc-700"
                    }`}
                  >
                    {chunk.imported ? (
                      <Check className="size-4" aria-hidden="true" />
                    ) : sharingFilename === filename ? (
                      <LoaderCircle
                        className="size-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Download className="size-4" aria-hidden="true" />
                    )}
                    {chunk.imported
                      ? "取り込みました"
                      : sharingFilename === filename
                        ? "共有先を選択中"
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
  chunks,
  importedChunkKeys,
  hasMfmeData,
  excludedByMfme,
  excludedByImportedRecords,
  onImport,
  accountBalances,
  onSetBalance,
  onClearBalance,
}: Step3FileListProps) {
  const [sharingFilename, setSharingFilename] = useState<string | null>(null);
  const groupEntries = Object.entries(chunks).filter(
    ([, chunks]) => chunks.length > 0,
  );
  const uniqueFilenameBases = createUniqueFilenameBases(
    groupEntries.map(([name]) => name),
  );
  const groups = groupEntries.map(
    ([name, chunks], index): FileGroup => ({
      name,
      chunks: chunks.map((chunk, chunkIndex) => ({
        ...chunk,
        imported: importedChunkKeys.has(`${name}:${chunkIndex}`),
      })),
      filenameBase: uniqueFilenameBases[index] ?? name,
    }),
  );
  const totalFiles = sum(groups, ({ chunks }) => chunks.length);
  const totalRecords = sum(groups, ({ chunks }) => countRecords(chunks));
  const totalExcluded = excludedByMfme + excludedByImportedRecords;

  const handleImport = (
    filename: string,
    data: string,
    name: string,
    index: number,
  ) => {
    setSharingFilename(filename);
    void onImport(filename, data, name, index)
      .catch(() => undefined)
      .finally(() => setSharingFilename(null));
  };

  return (
    <section aria-labelledby="output-title">
      <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="output-title" className="text-base font-bold text-zinc-950">
            作成したファイル
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

      {!hasMfmeData && (
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-950">
          MoneyForward
          MEの入出金履歴を読み込んでいないため、PayPayの取引をすべて出力しています。
        </div>
      )}

      {totalExcluded > 0 && (
        <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-3">
          <p className="text-xs font-semibold text-zinc-800">
            登録済みの明細 {totalExcluded}件を除外しました
          </p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
            {excludedByMfme > 0 && (
              <span>入出金履歴との一致: {excludedByMfme}件</span>
            )}
            {excludedByImportedRecords > 0 && (
              <span>
                このアプリの取り込み記録との一致: {excludedByImportedRecords}件
              </span>
            )}
          </div>
        </div>
      )}

      <FileGroupList
        groups={groups}
        sharingFilename={sharingFilename}
        onImport={handleImport}
        accountBalances={accountBalances}
        onSetBalance={onSetBalance}
        onClearBalance={onClearBalance}
      />
    </section>
  );
}
