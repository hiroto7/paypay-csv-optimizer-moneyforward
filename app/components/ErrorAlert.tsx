import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

interface ErrorAlertProps {
  className?: string;
  children: ReactNode;
}

export default function ErrorAlert({
  className = "",
  children,
}: ErrorAlertProps) {
  return (
    <div
      className={`flex gap-2 border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-800 ${className}`}
      role="alert"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
