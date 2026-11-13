import { AlertTriangle, Check } from "lucide-react";
import { type ReactNode, useId } from "react";

// attentionは、手順は終わったが確認してほしい結果があることを示す。
type StepStatus = "current" | "done" | "attention" | "locked";

interface StepCardProps {
  number: number;
  title: string;
  status: StepStatus;
  summary?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}

export default function StepCard({
  number,
  title,
  status,
  summary,
  actions,
  children,
}: StepCardProps) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      // 進行中の強調は内側の線で描き、枠線の太さで中身の位置が変わらないようにする。
      className={`border bg-white ${
        status === "current"
          ? "border-zinc-900 ring-1 ring-inset ring-zinc-900"
          : "border-zinc-200"
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        <span
          className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            status === "done"
              ? "bg-emerald-600 text-white"
              : status === "attention"
                ? "bg-amber-500 text-white"
                : status === "locked"
                  ? "bg-zinc-200 text-zinc-500"
                  : "bg-zinc-900 text-white"
          }`}
        >
          {status === "done" ? (
            <Check className="size-4" aria-label="完了" />
          ) : status === "attention" ? (
            <AlertTriangle className="size-4" aria-label="要確認" />
          ) : (
            number
          )}
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h2
            id={titleId}
            className={`text-sm font-bold leading-6 ${
              status === "locked" ? "text-zinc-400" : "text-zinc-950"
            }`}
          >
            {title}
          </h2>
          {summary !== undefined && (
            <div className="mt-0.5 text-xs leading-5 text-zinc-600">
              {summary}
            </div>
          )}
        </div>
        {actions !== undefined && (
          <div className="flex h-7 shrink-0 items-center gap-4">{actions}</div>
        )}
      </div>
      {children !== undefined && <div className="px-4 pb-4">{children}</div>}
    </section>
  );
}

// 手順のあいだをつなぐ縦線。番号の丸の中央を通す。
export function StepConnector() {
  return (
    <div
      className="ml-[30px] h-3 border-l-2 border-dashed border-zinc-300"
      aria-hidden="true"
    />
  );
}
