import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { useState } from "react";
import AuditResults from "~/components/AuditResults";
import type { MfmeReviewCandidate } from "~/services/mfme-reconciliation";

interface AuditPanelProps {
  hasPayPay: boolean;
  hasMfme: boolean;
  candidates: MfmeReviewCandidate[];
}

export default function AuditPanel({
  hasPayPay,
  hasMfme,
  candidates,
}: AuditPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const missingInputMessage = !hasPayPay
    ? "PayPayから書き出した取引履歴を選んでください。"
    : !hasMfme
      ? "MoneyForward MEから書き出した入出金履歴を選んでください。"
      : null;

  return (
    <section
      className="border border-zinc-200 bg-white"
      aria-labelledby="audit-panel-title"
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="audit-panel-content"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-zinc-50"
      >
        <span className="flex min-w-0 items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center bg-zinc-100 text-zinc-600">
            <Search className="size-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span
              id="audit-panel-title"
              className="block text-sm font-bold text-zinc-950"
            >
              重複登録・口座間違いを確認する
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-zinc-500">
              PayPay明細と完全一致しない要確認明細を表示します
            </span>
          </span>
        </span>
        {isOpen ? (
          <ChevronUp
            className="size-5 shrink-0 text-zinc-500"
            aria-hidden="true"
          />
        ) : (
          <ChevronDown
            className="size-5 shrink-0 text-zinc-500"
            aria-hidden="true"
          />
        )}
      </button>

      {isOpen && (
        <div id="audit-panel-content" className="border-t border-zinc-200">
          {missingInputMessage ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm font-semibold text-zinc-800">
                {missingInputMessage}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                左の入力欄からファイルを選ぶと、ここに結果を表示します。
              </p>
            </div>
          ) : (
            <AuditResults candidates={candidates} />
          )}
        </div>
      )}
    </section>
  );
}
