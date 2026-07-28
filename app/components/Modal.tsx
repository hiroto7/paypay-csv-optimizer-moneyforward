import { X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef } from "react";

interface ModalProps {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}

export default function Modal({
  title,
  description,
  onClose,
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

    return () => previouslyFocusedElement?.focus();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%_-_2rem)] max-w-lg border border-zinc-200 bg-white p-0 shadow-2xl backdrop:bg-zinc-950/50 open:flex open:flex-col"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={onClose}
    >
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
        <div>
          <h2 id={titleId} className="text-base font-bold text-zinc-950">
            {title}
          </h2>
          <p id={descriptionId} className="mt-1 text-xs text-zinc-500">
            {description}
          </p>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="inline-flex size-8 shrink-0 items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          aria-label="閉じる"
          title="閉じる"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      {children}
    </dialog>
  );
}
