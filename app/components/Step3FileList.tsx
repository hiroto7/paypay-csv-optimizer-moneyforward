import { useState } from "react";
import AccountImportCard from "~/components/AccountImportCard";
import ExclusionBreakdown from "~/components/ExclusionBreakdown";
import ImportCompletionCard from "~/components/ImportCompletionCard";
import StepCard from "~/components/StepCard";
import type { ImportProgress } from "~/services/import-progress";
import { createUniqueFilenameBases } from "~/utils/pp2mf-output-filename";

type Step3FileListProps =
  | { lockedReason: string }
  | {
      lockedReason: null;
      progress: ImportProgress;
      totalCount: number;
      savedBeforeCount: number;
      mfmeMatchedCount: number;
      recordedCount: number;
      onImport: (
        filename: string,
        accountName: string,
        index: number,
      ) => Promise<void>;
      onNewFileSelected: (file: File) => void;
    };

const TITLE = "MoneyForward MEへ取り込む";

export default function Step3FileList(props: Step3FileListProps) {
  const [sharingFilename, setSharingFilename] = useState<string | null>(null);

  if (props.lockedReason !== null) {
    return (
      <StepCard
        number={3}
        title={TITLE}
        status="locked"
        summary={props.lockedReason}
      />
    );
  }

  const {
    progress,
    totalCount,
    savedBeforeCount,
    mfmeMatchedCount,
    recordedCount,
    onImport,
    onNewFileSelected,
  } = props;
  const { accounts, savedAccountCount, importedCount, isComplete } = progress;
  const breakdown = (
    <ExclusionBreakdown
      totalCount={totalCount}
      savedBeforeCount={savedBeforeCount}
      mfmeMatchedCount={mfmeMatchedCount}
    />
  );

  if (accounts.length === 0 || isComplete) {
    return (
      <StepCard
        number={3}
        title={TITLE}
        status="done"
        summary={
          accounts.length === 0
            ? "この取引履歴の明細は、すべて登録済みです"
            : `${savedAccountCount} / ${accounts.length} 口座を保存しました`
        }
      >
        <ImportCompletionCard
          title={
            accounts.length === 0
              ? "取り込む明細はありません"
              : "取り込みが完了しました"
          }
          importedCount={importedCount}
          excludedCount={savedBeforeCount + mfmeMatchedCount}
          recordedCount={recordedCount}
          onNewFileSelected={onNewFileSelected}
        />
      </StepCard>
    );
  }

  const filenameBases = createUniqueFilenameBases(
    accounts.map(({ name }) => name),
  );
  const nextAccountIndex = accounts.findIndex(({ saved }) => !saved);

  return (
    <StepCard
      number={3}
      title={TITLE}
      status="current"
      summary={
        <div className="mt-1 flex items-center gap-2">
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200"
            role="progressbar"
            aria-label="保存した口座"
            aria-valuemin={0}
            aria-valuemax={accounts.length}
            aria-valuenow={savedAccountCount}
          >
            <div
              className="h-full bg-emerald-600"
              style={{
                width: `${(savedAccountCount / accounts.length) * 100}%`,
              }}
            />
          </div>
          <span className="shrink-0 font-bold text-zinc-800">
            {savedAccountCount} / {accounts.length} 口座
          </span>
        </div>
      }
    >
      <div className="space-y-4">
        {breakdown}
        <ul className="space-y-2">
          {accounts.map((account, accountIndex) => {
            const nextChunkIndex =
              accountIndex === nextAccountIndex
                ? account.chunks.findIndex(({ saved }) => !saved)
                : null;
            const filenameBase = filenameBases[accountIndex] ?? account.name;
            return (
              <li key={account.name}>
                <AccountImportCard
                  account={account}
                  filenameBase={filenameBase}
                  nextChunkIndex={nextChunkIndex}
                  sharingFilename={sharingFilename}
                  onImport={(filename, index) => {
                    setSharingFilename(filename);
                    void onImport(filename, account.name, index)
                      .catch(() => undefined)
                      .finally(() => setSharingFilename(null));
                  }}
                />
              </li>
            );
          })}
        </ul>
        <p className="text-xs leading-5 text-zinc-500">
          取り込んだら「MoneyForward
          MEで保存した」を押してください。押した明細はこの端末に記録し、次回から自動で除外します。
        </p>
      </div>
    </StepCard>
  );
}
