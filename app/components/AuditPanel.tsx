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
      className="border-t border-border"
      aria-labelledby="audit-panel-title"
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="audit-panel-content"
        onClick={() => setIsOpen((current) => !current)}
        className="button-quiet interactive flex min-h-11 w-full items-center justify-between gap-2 px-3 py-4 text-left sm:gap-4 sm:px-5"
      >
        <span className="flex min-w-0 items-start gap-3">
          <span className="surface-quiet hidden size-11 shrink-0 items-center justify-center text-foreground-subtle sm:flex">
            <Search className="size-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span
              id="audit-panel-title"
              className="block whitespace-nowrap text-xs font-bold text-foreground sm:text-sm"
            >
              重複登録・口座間違いを確認する
            </span>
            <span className="mt-0.5 hidden text-sm leading-5 text-foreground-subtle sm:block">
              PayPay明細と完全一致しない要確認明細を表示します
            </span>
          </span>
        </span>
        {isOpen ? (
          <ChevronUp
            className="size-5 shrink-0 text-foreground-subtle"
            aria-hidden="true"
          />
        ) : (
          <ChevronDown
            className="size-5 shrink-0 text-foreground-subtle"
            aria-hidden="true"
          />
        )}
      </button>

      {isOpen && (
        <div id="audit-panel-content" className="border-t border-border">
          {missingInputMessage ? (
            <div className="px-5 py-5 text-left">
              <p className="text-sm font-semibold text-foreground">
                {missingInputMessage}
              </p>
              <p className="mt-1 text-sm text-foreground-subtle">
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
