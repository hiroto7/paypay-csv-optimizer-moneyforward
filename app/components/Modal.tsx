import { X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef } from "react";

interface ModalProps {
  title: string;
  description?: string;
  onClose?: () => void;
  // falseのときは×ボタン・Escキー・戻る操作で閉じず、呼び出し側が表示をやめるまで開き続ける。
  dismissible?: boolean;
  children: ReactNode;
}

export default function Modal({
  title,
  description,
  onClose,
  dismissible = true,
  children,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialog?.showModal();
    // 閉じるボタンがないため、最初のボタンに焦点が当たってEnterキーで誤って答えないようにする。
    if (!dismissible) dialog?.focus();

    return () => previouslyFocusedElement?.focus();
  }, [dismissible]);

  return (
    <dialog
      ref={dialogRef}
      tabIndex={dismissible ? undefined : -1}
      className="m-auto outline-none max-h-[calc(100dvh-2rem)] w-[calc(100%_-_2rem)] max-w-lg border border-zinc-200 bg-white p-0 shadow-2xl backdrop:bg-zinc-950/50 open:flex open:flex-col"
      aria-labelledby={titleId}
      aria-describedby={description === undefined ? undefined : descriptionId}
      onCancel={(event) => {
        if (!dismissible) event.preventDefault();
      }}
      onClose={() => {
        if (dismissible) {
          onClose?.();
          return;
        }
        // 連続したEscキーなど、取り消せないcancelで閉じられた場合は開き直す。
        const dialog = dialogRef.current;
        if (dialog?.isConnected) {
          dialog.showModal();
          dialog.focus();
        }
      }}
    >
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
        <div>
          <h2 id={titleId} className="text-base font-bold text-zinc-950">
            {title}
          </h2>
          {description !== undefined && (
            <p id={descriptionId} className="mt-1 text-xs text-zinc-500">
              {description}
            </p>
          )}
        </div>
        {dismissible && (
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="inline-flex size-8 shrink-0 items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="閉じる"
            title="閉じる"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {children}
    </dialog>
  );
}
