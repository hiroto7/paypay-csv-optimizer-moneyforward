import { useState } from "react";
import AccountImportCard from "~/components/AccountImportCard";
import CsvFilePicker from "~/components/CsvFilePicker";
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

  // 選んだ取引履歴に取り込む明細がないのは完了ではないため、注意として示す。
  if (accounts.length === 0) {
    return (
      <StepCard
        number={3}
        title={TITLE}
        status="attention"
        summary="この取引履歴の明細は、すべて登録済みです"
      >
        <CsvFilePicker
          id="paypay-csv-input-next"
          label="新しい取引履歴を選ぶ"
          variant="primary"
          onFilesSelected={(files) => {
            const file = files?.[0];
            if (file) onNewFileSelected(file);
          }}
        />
      </StepCard>
    );
  }

  if (isComplete) {
    return (
      <StepCard
        number={3}
        title={TITLE}
        status="done"
        summary={`${savedAccountCount} / ${accounts.length} 口座を保存しました`}
      >
        <ImportCompletionCard
          title="取り込みが完了しました"
          description={
            savedBeforeCount + mfmeMatchedCount === 0
              ? `PayPayの取引履歴の${totalCount}件を取り込みました`
              : `PayPayの取引履歴の${totalCount}件のうち、未登録の${importedCount}件を取り込みました`
          }
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
