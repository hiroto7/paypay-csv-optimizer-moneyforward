import { useCallback, useEffect, useRef, useState } from "react";
import {
  addCounts,
  clearLocalExclusionState,
  createCountsFromKeys,
  createEmptyLocalExclusionState,
  type LocalExclusionState,
  loadLocalExclusionState,
  saveLocalExclusionState,
} from "~/services/local-exclusion-store";

export function useLocalImportRecords() {
  const [state, setState] = useState<LocalExclusionState>(() =>
    createEmptyLocalExclusionState(),
  );
  const [conversionCounts, setConversionCounts] = useState<Map<string, number>>(
    () => new Map(),
  );
  const stateRef = useRef(state);

  useEffect(() => {
    const savedState = loadLocalExclusionState();
    stateRef.current = savedState;
    setState(savedState);
    setConversionCounts(new Map(savedState.localImportedCounts));
  }, []);

  const addImportedRecords = useCallback((keys: readonly string[]) => {
    const nextState = {
      localImportedCounts: addCounts(
        stateRef.current.localImportedCounts,
        createCountsFromKeys(keys),
      ),
      updatedAt: Date.now(),
    };
    stateRef.current = nextState;
    setState(nextState);
    saveLocalExclusionState(nextState);
  }, []);

  const resetImportedRecords = useCallback((): boolean => {
    const hadRecords = stateRef.current.localImportedCounts.size > 0;
    const nextState = createEmptyLocalExclusionState();
    stateRef.current = nextState;
    setState(nextState);
    setConversionCounts(new Map());
    clearLocalExclusionState();
    return hadRecords;
  }, []);

  const refreshConversionCounts = useCallback(() => {
    setConversionCounts(new Map(stateRef.current.localImportedCounts));
  }, []);

  const recordCount = Array.from(state.localImportedCounts.values()).reduce(
    (total, count) => total + count,
    0,
  );

  return {
    conversionCounts,
    recordCount,
    addImportedRecords,
    resetImportedRecords,
    refreshConversionCounts,
  };
}
