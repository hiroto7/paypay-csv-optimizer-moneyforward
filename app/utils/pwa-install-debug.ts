const DEBUG_QUERY = "debug-pwa-install";
const STORAGE_KEY = "pp2mf:pwa-install-debug";
const UPDATE_EVENT = "pp2mf:pwa-install-debug-updated";
const PAGE_ID =
  typeof window === "undefined"
    ? "server"
    : Math.round(performance.timeOrigin).toString(36);

export type PwaInstallDebugEntry = {
  recordedAt: string;
  pageId: string;
  name: string;
  eventType?: string;
  eventTimeStamp?: number;
  isTrusted?: boolean;
  visibility: DocumentVisibilityState;
  standalone: boolean;
  details?: Record<string, unknown>;
};

export const isPwaInstallDebugEnabled = () =>
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get(DEBUG_QUERY) === "1";

export const readPwaInstallDebugEntries = (): PwaInstallDebugEntry[] => {
  if (!isPwaInstallDebugEnabled()) return [];

  try {
    return JSON.parse(
      window.sessionStorage.getItem(STORAGE_KEY) ?? "[]",
    ) as PwaInstallDebugEntry[];
  } catch {
    return [];
  }
};

export const recordPwaInstallDebug = (
  name: string,
  event?: Event,
  details?: Record<string, unknown>,
) => {
  if (!isPwaInstallDebugEnabled()) return;

  const entry: PwaInstallDebugEntry = {
    recordedAt: new Date().toISOString(),
    pageId: PAGE_ID,
    name,
    ...(event
      ? {
          eventType: event.type,
          eventTimeStamp: Math.round(event.timeStamp),
          isTrusted: event.isTrusted,
        }
      : {}),
    visibility: document.visibilityState,
    standalone: window.matchMedia("(display-mode: standalone)").matches,
    ...(details ? { details } : {}),
  };
  const entries = [...readPwaInstallDebugEntries(), entry].slice(-100);
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new Event(UPDATE_EVENT));
  console.info("[PP2MF PWA debug]", entry);
};

export const subscribePwaInstallDebug = (listener: () => void) => {
  window.addEventListener(UPDATE_EVENT, listener);
  return () => window.removeEventListener(UPDATE_EVENT, listener);
};

export const clearPwaInstallDebugEntries = () => {
  window.sessionStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(UPDATE_EVENT));
};
