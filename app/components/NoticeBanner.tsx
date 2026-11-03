import { AlertCircle, UploadCloud, X } from "lucide-react";
import type { SharedFileNotice } from "~/hooks/useInputFilesStore";

interface NoticeBannerProps {
  notice: SharedFileNotice | null;
  onDismiss: () => void;
}

export default function NoticeBanner({ notice, onDismiss }: NoticeBannerProps) {
  if (!notice) return null;

  return (
    <div
      className={`mb-5 flex items-center justify-between gap-3 border px-4 py-2.5 text-sm ${
        notice.tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-red-200 bg-red-50 text-red-800"
      }`}
      role={notice.tone === "error" ? "alert" : "status"}
    >
      <div className="flex min-w-0 items-center gap-2">
        {notice.tone === "success" ? (
          <UploadCloud className="size-4 shrink-0" aria-hidden="true" />
        ) : (
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
        )}
        <p className="leading-5">{notice.message}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="inline-flex size-7 shrink-0 items-center justify-center hover:bg-black/5"
        aria-label="通知を閉じる"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
