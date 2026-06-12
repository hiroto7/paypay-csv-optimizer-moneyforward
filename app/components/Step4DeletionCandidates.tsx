import type { DeletionCandidate } from "~/services/csv-processor";

interface Step4DeletionCandidatesProps {
  candidates: DeletionCandidate[];
  onDownload: () => void;
}

const reasonLabel = (reason: DeletionCandidate["reason"]) =>
  reason === "wrong-account" ? "別口座取り込み" : "重複取り込み";

export default function Step4DeletionCandidates({
  candidates,
  onDownload,
}: Step4DeletionCandidatesProps) {
  const wrongAccountCount = candidates.filter(
    (candidate) => candidate.reason === "wrong-account",
  ).length;
  const duplicateCount = candidates.length - wrongAccountCount;

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 shadow-lg p-6 md:p-8">
      <h2 className="text-2xl font-bold text-slate-100 mb-4">
        4. 削除候補の確認
      </h2>
      <p className="text-sm text-slate-400 mb-4">
        PayPay明細とマネーフォワード
        ME明細を突き合わせ、重複取り込みや別口座取り込みの可能性がある明細を探します。
      </p>

      {candidates.length === 0 ? (
        <div className="bg-emerald-900/30 border border-emerald-500/30 text-emerald-200 rounded-lg p-4">
          <p className="font-semibold">削除候補は見つかりませんでした</p>
          <p className="text-sm text-emerald-100/80 mt-1">
            読み込んだ範囲では、同じPayPay明細の重複や別口座への取り込みは検出されていません。
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
              <p className="text-sm text-slate-400">削除候補</p>
              <p className="text-2xl font-bold text-slate-100">
                {candidates.length}件
              </p>
            </div>
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
              <p className="text-sm text-slate-400">別口座取り込み</p>
              <p className="text-2xl font-bold text-yellow-200">
                {wrongAccountCount}件
              </p>
            </div>
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
              <p className="text-sm text-slate-400">重複取り込み</p>
              <p className="text-2xl font-bold text-red-200">
                {duplicateCount}件
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-700">
            <table className="min-w-full divide-y divide-slate-700 text-sm">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-300">
                    理由
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-300">
                    日付
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-300">
                    内容
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-300">
                    金額
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-300">
                    実際の口座
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-300">
                    期待される口座
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700 bg-slate-900/30">
                {candidates.slice(0, 20).map((candidate) => (
                  <tr key={candidate.key}>
                    <td className="px-3 py-2 text-slate-200">
                      {reasonLabel(candidate.reason)}
                    </td>
                    <td className="px-3 py-2 text-slate-300 whitespace-nowrap">
                      {candidate.date}
                    </td>
                    <td className="px-3 py-2 text-slate-300">
                      {candidate.content}
                    </td>
                    <td className="px-3 py-2 text-slate-300 text-right whitespace-nowrap">
                      {candidate.amount}
                    </td>
                    <td className="px-3 py-2 text-slate-300">
                      {candidate.actualInstitution}
                    </td>
                    <td className="px-3 py-2 text-slate-300">
                      {candidate.expectedInstitution}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {candidates.length > 20 && (
            <p className="text-sm text-slate-400">
              画面には先頭20件のみ表示しています。全件はCSVで確認してください。
            </p>
          )}

          <button
            type="button"
            onClick={onDownload}
            className="w-full sm:w-auto px-5 py-2.5 rounded-md font-semibold text-white transition-colors bg-red-600 hover:bg-red-500"
          >
            削除候補CSVをダウンロード
          </button>
        </div>
      )}
    </div>
  );
}
