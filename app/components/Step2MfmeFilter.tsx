import { AlertCircle } from "lucide-react";
import { useState } from "react";
import CsvFilePicker from "~/components/CsvFilePicker";
import FileStatsSummary from "~/components/FileStatsSummary";
import SelectedFileCard from "~/components/SelectedFileCard";
import StepCard from "~/components/StepCard";
import type { RejectedInputFile } from "~/hooks/useInputFilesStore";
import type { FileStats } from "~/services/csv-date";

interface Step2MfmeFilterProps {
  files: readonly File[];
  fileStatsByName: ReadonlyMap<string, FileStats>;
  mfmeStats: FileStats | null;
  recordStats: FileStats;
  hasNoMfmeHistory: boolean;
  errors: RejectedInputFile[];
  onFilesAdded: (files: File[]) => void;
  onFileRemoved: (name: string) => void;
  onNoMfmeHistoryChange: (hasNoMfmeHistory: boolean) => void;
}

const linkButtonClassName =
  "inline-flex min-h-9 items-center px-1 text-xs font-semibold text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950";

function AnswerOption({
  checked,
  title,
  description,
  onSelect,
}: {
  checked: boolean;
  title: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer gap-3 p-3 ${
        checked
          ? "border-2 border-zinc-900 bg-zinc-50"
          : "border border-zinc-300 bg-white hover:bg-zinc-50"
      }`}
    >
      <input
        type="radio"
        name="mfme-history-answer"
        checked={checked}
        onChange={onSelect}
        className="mt-1 size-4 shrink-0 accent-zinc-900"
      />
      <span>
        <span className="block text-sm font-bold text-zinc-950">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-zinc-600">
          {description}
        </span>
      </span>
    </label>
  );
}

function MfmeFileManager({
  files,
  fileStatsByName,
  errors,
  onFilesAdded,
  onFileRemoved,
}: Pick<
  Step2MfmeFilterProps,
  "files" | "fileStatsByName" | "errors" | "onFilesAdded" | "onFileRemoved"
>) {
  return (
    <div className="space-y-2">
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file) => (
            <li key={file.name}>
              <SelectedFileCard
                fileName={file.name}
                stats={fileStatsByName.get(file.name) ?? null}
                onRemove={() => onFileRemoved(file.name)}
              />
            </li>
          ))}
        </ul>
      )}
      <CsvFilePicker
        id="mfme-csv-input"
        multiple
        label="入出金履歴を追加"
        onFilesSelected={(selectedFiles) => {
          const nextFiles = Array.from(selectedFiles ?? []);
          if (nextFiles.length > 0) onFilesAdded(nextFiles);
        }}
      />
      {errors.length > 0 && (
        <div
          className="flex gap-2 border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <ul className="min-w-0 space-y-1">
            {errors.map(({ name, reason }) => (
              <li key={`${name}:${reason}`} className="break-words">
                {name}: {reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function Step2MfmeFilter(props: Step2MfmeFilterProps) {
  const {
    files,
    mfmeStats,
    recordStats,
    hasNoMfmeHistory,
    errors,
    onNoMfmeHistoryChange,
  } = props;
  const [hasHistory, setHasHistory] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const hasRecords = recordStats.count > 0;
  const hasFiles = files.length > 0;

  // 記録か入出金履歴があれば、登録済みの明細を除外できる状態として完了にする。
  if (hasRecords || hasFiles) {
    const summaryParts = [
      hasRecords ? `保存した明細 ${recordStats.count}件` : null,
      hasFiles ? `入出金履歴 ${files.length}ファイル` : null,
    ].filter((part): part is string => part !== null);

    return (
      <StepCard
        number={2}
        title="登録済みの明細"
        status="done"
        summary={summaryParts.join("・")}
        actions={
          <button
            type="button"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((current) => !current)}
            className={linkButtonClassName}
          >
            {isExpanded ? "閉じる" : "管理"}
          </button>
        }
      >
        {isExpanded || errors.length > 0 ? (
          <div className="space-y-4">
            {hasRecords && (
              <div className="border border-blue-200 bg-blue-50 px-3 py-3 text-xs leading-5 text-zinc-700">
                <p className="font-semibold text-blue-950">
                  「MoneyForward MEで保存した」明細
                </p>
                <div className="mt-1">
                  <FileStatsSummary stats={recordStats} />
                </div>
                <p className="mt-1">
                  この端末に記録しています。次回以降も自動で除外するので、入出金履歴を追加し直す必要はありません。
                </p>
              </div>
            )}
            <div>
              <p className="mb-2 text-xs font-semibold text-zinc-700">
                MoneyForward MEの入出金履歴
                {mfmeStats && (
                  <span className="ml-2 font-normal text-zinc-500">
                    <FileStatsSummary stats={mfmeStats} />
                  </span>
                )}
              </p>
              <MfmeFileManager {...props} />
            </div>
          </div>
        ) : undefined}
      </StepCard>
    );
  }

  if (hasNoMfmeHistory && !isExpanded) {
    return (
      <StepCard
        number={2}
        title="登録済みの明細"
        status="done"
        summary="登録したことはありません（すべての明細を取り込みます）"
        actions={
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className={linkButtonClassName}
          >
            変更
          </button>
        }
      />
    );
  }

  return (
    <StepCard number={2} title="登録済みの明細を除外する" status="current">
      <fieldset className="space-y-2">
        <legend className="mb-3 text-sm font-bold leading-6 text-zinc-950">
          MoneyForward MEに、PayPayの明細を登録したことはありますか？
        </legend>
        <AnswerOption
          checked={hasHistory && !hasNoMfmeHistory}
          title="ある"
          description="MoneyForward MEの入出金履歴を追加すると、登録済みの明細を除外して重複を防げます。"
          onSelect={() => {
            setHasHistory(true);
            onNoMfmeHistoryChange(false);
          }}
        />
        {hasHistory && !hasNoMfmeHistory && (
          <div className="py-1 pl-7">
            <MfmeFileManager {...props} />
          </div>
        )}
        <AnswerOption
          checked={hasNoMfmeHistory}
          title="ない（初めて登録する）"
          description="この手順はとばして、すべての明細を取り込みます。"
          onSelect={() => {
            setHasHistory(false);
            setIsExpanded(false);
            onNoMfmeHistoryChange(true);
          }}
        />
      </fieldset>
    </StepCard>
  );
}
