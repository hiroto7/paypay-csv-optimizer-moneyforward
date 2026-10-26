import { Check } from "lucide-react";
import { type ReactNode, useId } from "react";

type StepStatus = "current" | "done" | "locked";

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
      className={`bg-white ${
        status === "current"
          ? "border-2 border-zinc-900"
          : "border border-zinc-200"
      }`}
    >
      <div className="flex items-start gap-3 px-4 py-3.5">
        <span
          className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            status === "done"
              ? "bg-emerald-600 text-white"
              : status === "locked"
                ? "bg-zinc-200 text-zinc-500"
                : "bg-zinc-900 text-white"
          }`}
        >
          {status === "done" ? (
            <Check className="size-4" aria-label="完了" />
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
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
      {children !== undefined && <div className="px-4 pb-4">{children}</div>}
    </section>
  );
}

// 手順のあいだをつなぐ縦線。
export function StepConnector() {
  return (
    <div
      className="ml-[29px] h-3 border-l-2 border-dashed border-zinc-300"
      aria-hidden="true"
    />
  );
}
