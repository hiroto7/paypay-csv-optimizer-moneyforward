import { CalendarDays, Check, Download, LoaderCircle } from "lucide-react";
import Button from "~/components/Button";
import FileStatsSummary from "~/components/FileStatsSummary";
import PeriodDisplay from "~/components/PeriodDisplay";
import type { AccountProgress } from "~/services/import-progress";
import { createPp2mfOutputFilename } from "~/utils/pp2mf-output-filename";

interface AccountImportCardProps {
  account: AccountProgress;
  filenameBase: string;
  // 次に取り込むチャンク。主な操作として強調する。
  nextChunkIndex: number | null;
  sharingFilename: string | null;
  onImport: (filename: string, index: number) => void;
}

export default function AccountImportCard({
  account,
  filenameBase,
  nextChunkIndex,
  sharingFilename,
  onImport,
}: AccountImportCardProps) {
  const { name, chunks, count, saved } = account;
  const isSplit = chunks.length > 1;
  const isNextAccount = nextChunkIndex !== null;

  return (
    <div
      className={`border ${
        isNextAccount
          ? "border-zinc-900 bg-white ring-1 ring-inset ring-zinc-900"
          : saved
            ? "border-zinc-200 bg-zinc-50"
            : "border-zinc-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 pt-3">
        <h3 className="text-sm font-bold text-zinc-950">{name}</h3>
        <span className="text-xs text-zinc-500">{count}件</span>
        {saved && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
            <Check className="size-3" aria-hidden="true" />
            保存済み
          </span>
        )}
      </div>
      <ul className="divide-y divide-zinc-200 px-3 pb-0.5">
        {chunks.map((chunk, index) => {
          const filename = createPp2mfOutputFilename(
            filenameBase,
            index,
            chunks.length,
          );
          const partLabel = isSplit ? `${index + 1} / ${chunks.length}` : null;
          const isSharing = sharingFilename === filename;
          const isNext = nextChunkIndex === index;
          return (
            <li
              key={filename}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <div
                className={`min-w-0 text-xs text-zinc-500 ${
                  chunk.saved ? "opacity-70" : ""
                }`}
              >
                {partLabel ? (
                  <>
                    <span className="mr-2 font-semibold text-zinc-700">
                      {partLabel}
                    </span>
                    <FileStatsSummary stats={chunk} />
                  </>
                ) : (
                  chunk.startDate &&
                  chunk.endDate && (
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3.5" aria-hidden="true" />
                      <PeriodDisplay
                        startDate={chunk.startDate}
                        endDate={chunk.endDate}
                      />
                    </span>
                  )
                )}
              </div>
              {chunk.saved ? (
                <button
                  type="button"
                  disabled
                  className="inline-flex min-h-9 shrink-0 cursor-default items-center justify-center gap-2 px-4 text-sm font-semibold text-emerald-700"
                >
                  <Check className="size-4" aria-hidden="true" />
                  保存済み
                </button>
              ) : (
                <Button
                  variant={isNext ? "primary" : "secondary"}
                  onClick={() => onImport(filename, index)}
                  disabled={sharingFilename !== null}
                  aria-label={`${name}${partLabel ? ` ${index + 1}/${chunks.length}` : ""}を取り込む`}
                >
                  {isSharing ? (
                    <LoaderCircle
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Download className="size-4" aria-hidden="true" />
                  )}
                  {isSharing ? "共有シートを表示中" : "取り込む"}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
