import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyConfirmedImport,
  createEmptyLocalExclusionState,
  forgetOtherFileWork,
  type LocalExclusionState,
  loadLocalExclusionState,
  type PendingImport,
  persistLocalExclusionState,
  resetImportedRecords as resetRecords,
} from "~/services/local-exclusion-store";

const RECENT_SHARE_MS = 10 * 60 * 1000;

export function useLocalImportRecords() {
  const [state, setState] = useState<LocalExclusionState>(() =>
    createEmptyLocalExclusionState(),
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const stateRef = useRef(state);

  useEffect(() => {
    const savedState = loadLocalExclusionState();
    stateRef.current = savedState;
    setState(savedState);
    setIsLoaded(true);
  }, []);

  const commit = useCallback((nextState: LocalExclusionState) => {
    if (nextState === stateRef.current) return;
    stateRef.current = nextState;
    setState(nextState);
    persistLocalExclusionState(nextState);
  }, []);

  const startPendingImport = useCallback(
    (pendingImport: PendingImport) => {
      commit({ ...stateRef.current, pendingImport, updatedAt: Date.now() });
    },
    [commit],
  );

  const confirmPendingImport = useCallback(() => {
    commit(applyConfirmedImport(stateRef.current, Date.now()));
  }, [commit]);

  const discardPendingImport = useCallback(() => {
    if (!stateRef.current.pendingImport) return;
    commit({ ...stateRef.current, pendingImport: null, updatedAt: Date.now() });
  }, [commit]);

  const hasPendingImport = useCallback(
    () => stateRef.current.pendingImport !== null,
    [],
  );

  // 取り込み用CSVを共有してから間もないか。共有先の誤りを判断するために使う。
  const hasRecentPendingImport = useCallback(() => {
    const sharedAt = stateRef.current.pendingImport?.sharedAt;
    return sharedAt !== undefined && Date.now() - sharedAt < RECENT_SHARE_MS;
  }, []);

  const hasImportedRecords = useCallback(
    () => stateRef.current.localImportedCounts.size > 0,
    [],
  );

  const resetImportedRecords = useCallback((): boolean => {
    const hadRecords = stateRef.current.localImportedCounts.size > 0;
    commit(resetRecords(stateRef.current, Date.now()));
    return hadRecords;
  }, [commit]);

  const changePayPayFile = useCallback(
    (payPayFingerprint: string | null) => {
      commit(
        forgetOtherFileWork(stateRef.current, payPayFingerprint, Date.now()),
      );
    },
    [commit],
  );

  const setHasNoMfmeHistory = useCallback(
    (hasNoMfmeHistory: boolean) => {
      if (stateRef.current.hasNoMfmeHistory === hasNoMfmeHistory) return;
      commit({ ...stateRef.current, hasNoMfmeHistory, updatedAt: Date.now() });
    },
    [commit],
  );

  return {
    state,
    isLoaded,
    startPendingImport,
    confirmPendingImport,
    discardPendingImport,
    hasPendingImport,
    hasRecentPendingImport,
    hasImportedRecords,
    resetImportedRecords,
    changePayPayFile,
    setHasNoMfmeHistory,
  };
}
