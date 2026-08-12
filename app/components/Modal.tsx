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
      className="dialog-panel surface m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%_-_2rem)] max-w-lg rounded-[var(--radius-dialog)] p-0 shadow-2xl open:flex open:flex-col"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={onClose}
    >
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div>
          <h2 id={titleId} className="text-base font-bold text-foreground">
            {title}
          </h2>
          <p id={descriptionId} className="mt-1 text-sm text-foreground-subtle">
            {description}
          </p>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="icon-control button-quiet interactive"
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
