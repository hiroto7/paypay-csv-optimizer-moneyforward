import { useEffect, useState } from "react";
import {
  clearPwaInstallDebugEntries,
  isPwaInstallDebugEnabled,
  type PwaInstallDebugEntry,
  readPwaInstallDebugEntries,
  subscribePwaInstallDebug,
} from "~/utils/pwa-install-debug";

const formatEntry = (entry: PwaInstallDebugEntry) => {
  const time = entry.recordedAt.slice(11, 23);
  const event = entry.eventType ? ` event=${entry.eventType}` : "";
  const trusted =
    entry.isTrusted === undefined ? "" : ` trusted=${entry.isTrusted}`;
  const details = entry.details ? ` ${JSON.stringify(entry.details)}` : "";
  return `${time} page=${entry.pageId} ${entry.name}${event}${trusted} standalone=${entry.standalone} visibility=${entry.visibility}${details}`;
};

export default function PwaInstallDebugPanel() {
  const [entries, setEntries] = useState<PwaInstallDebugEntry[]>([]);
  const enabled = isPwaInstallDebugEnabled();

  useEffect(() => {
    if (!enabled) return;

    const refresh = () => setEntries(readPwaInstallDebugEntries());
    refresh();
    return subscribePwaInstallDebug(refresh);
  }, [enabled]);

  if (!enabled) return null;

  const log = entries.map(formatEntry).join("\n");

  return (
    <details open className="border border-amber-400 bg-zinc-950 text-zinc-100">
      <summary className="cursor-pointer px-3 py-2 text-xs font-bold text-amber-300">
        PWAインストール診断ログ（{entries.length}件）
      </summary>
      <div className="border-t border-zinc-700 p-3">
        <div className="mb-2 flex gap-2">
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(log)}
            className="min-h-8 border border-zinc-600 px-3 text-xs font-semibold"
          >
            コピー
          </button>
          <button
            type="button"
            onClick={clearPwaInstallDebugEntries}
            className="min-h-8 border border-zinc-600 px-3 text-xs font-semibold"
          >
            消去
          </button>
        </div>
        <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-all text-[10px] leading-4">
          {log || "まだイベントはありません"}
        </pre>
      </div>
    </details>
  );
}
