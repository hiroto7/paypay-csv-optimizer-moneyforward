import { ArrowRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface FlowFigureProps {
  label: string;
  className?: string;
  children: ReactNode;
}

// ファイルやアプリのあいだの流れを、3つの項目と矢印で示す図。
export function FlowFigure({
  label,
  className = "",
  children,
}: FlowFigureProps) {
  return (
    <figure
      className={`grid grid-cols-[1fr_auto_1fr_auto_1fr] items-start gap-2 ${className}`}
      aria-label={label}
    >
      {children}
    </figure>
  );
}

interface FlowNodeProps {
  label: string;
  // 省略すると、PP2MFのアイコンを表示する。
  icon?: LucideIcon;
  highlighted?: boolean;
}

export function FlowNode({
  label,
  icon: Icon,
  highlighted = false,
}: FlowNodeProps) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      {Icon ? (
        <span
          className={`flex size-12 items-center justify-center bg-white shadow-sm ${
            highlighted
              ? "ring-2 ring-red-600 ring-offset-2"
              : "ring-1 ring-zinc-200"
          }`}
        >
          <Icon className="size-6 text-zinc-600" aria-hidden="true" />
        </span>
      ) : (
        <img src="/pwa-icon.svg" alt="" className="size-12 shadow-sm" />
      )}
      <span className="text-xs font-semibold leading-4 text-zinc-700">
        {label}
      </span>
    </div>
  );
}

// 項目のアイコン（size-12）の中央にそろえる。
export function FlowArrow() {
  return (
    <ArrowRight
      className="mt-4 size-4 shrink-0 text-zinc-400"
      aria-hidden="true"
    />
  );
}
