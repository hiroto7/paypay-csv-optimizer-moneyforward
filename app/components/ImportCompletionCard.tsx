import { CheckCircle2 } from "lucide-react";
import CsvFilePicker from "~/components/CsvFilePicker";

interface ImportCompletionCardProps {
  title: string;
  description: string | null;
  onNewFileSelected: (file: File) => void;
}

export default function ImportCompletionCard({
  title,
  description,
  onNewFileSelected,
}: ImportCompletionCardProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <CheckCircle2
          className="mx-auto size-10 text-emerald-600"
          aria-hidden="true"
        />
        <p className="mt-2 text-base font-bold text-zinc-950">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-zinc-600">{description}</p>
        )}
      </div>
      <div>
        <p className="text-xs font-bold text-zinc-800">次回の使い方</p>
        <ol className="mt-1 space-y-1 text-xs leading-5 text-zinc-600">
          <li>
            1.
            PayPayの取引履歴をダウンロードする（期間は前回と重なっても大丈夫です）
          </li>
          <li>2. PP2MFで選んで、口座ごとに取り込む</li>
        </ol>
        <p className="mt-1 text-xs leading-5 text-zinc-600">
          MoneyForward MEの入出金履歴を追加し直す必要はありません。
        </p>
      </div>
      <CsvFilePicker
        id="paypay-csv-input-next"
        label="新しい取引履歴を選ぶ"
        variant="primary"
        onFilesSelected={(files) => {
          const file = files?.[0];
          if (file) onNewFileSelected(file);
        }}
      />
    </div>
  );
}
