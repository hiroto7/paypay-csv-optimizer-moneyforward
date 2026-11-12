import { useSyncExternalStore } from "react";

type InstallChoice = {
  outcome: "accepted" | "dismissed";
  platform: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

// beforeinstallpromptはページを開いた直後に一度だけ届くことがあるため、
// 案内の部品が表示される前でも受け取れるよう、ページ全体で保持する。
let installPromptEvent: BeforeInstallPromptEvent | null = null;
let isCapturing = false;
const listeners = new Set<() => void>();

const notify = () => {
  for (const listener of listeners) listener();
};

export const startInstallPromptCapture = () => {
  if (isCapturing || typeof window === "undefined") return;
  isCapturing = true;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPromptEvent = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    installPromptEvent = null;
    notify();
  });
};

export const clearInstallPrompt = () => {
  installPromptEvent = null;
  notify();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useInstallPrompt = () =>
  useSyncExternalStore(
    subscribe,
    () => installPromptEvent,
    () => null,
  );
