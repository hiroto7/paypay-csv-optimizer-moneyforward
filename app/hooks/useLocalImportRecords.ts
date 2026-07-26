import { useCallback, useEffect, useRef, useState } from "react";
import {
  addCounts,
  clearLocalExclusionState,
  createCountsFromKeys,
  createEmptyLocalExclusionState,
  createStatsFromTransactionCounts,
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

  const addImportedRecords = useCallback(
    (keys: readonly string[], accountName: string, balanceDelta: number) => {
      const now = Date.now();
      const accountBalances = new Map(stateRef.current.accountBalances);
      const currentBalance = accountBalances.get(accountName);
      if (currentBalance) {
        accountBalances.set(accountName, {
          amount: currentBalance.amount + balanceDelta,
          updatedAt: now,
        });
      }

      const nextState = {
        localImportedCounts: addCounts(
          stateRef.current.localImportedCounts,
          createCountsFromKeys(keys),
        ),
        accountBalances,
        updatedAt: now,
      };
      stateRef.current = nextState;
      setState(nextState);
      saveLocalExclusionState(nextState);
    },
    [],
  );

  const setAccountBalance = useCallback(
    (accountName: string, amount: number) => {
      const now = Date.now();
      const accountBalances = new Map(stateRef.current.accountBalances);
      accountBalances.set(accountName, { amount, updatedAt: now });
      const nextState = {
        ...stateRef.current,
        accountBalances,
        updatedAt: now,
      };
      stateRef.current = nextState;
      setState(nextState);
      saveLocalExclusionState(nextState);
    },
    [],
  );

  const clearAccountBalance = useCallback((accountName: string) => {
    const accountBalances = new Map(stateRef.current.accountBalances);
    accountBalances.delete(accountName);
    const nextState = {
      ...stateRef.current,
      accountBalances,
      updatedAt: Date.now(),
    };
    stateRef.current = nextState;
    setState(nextState);
    if (
      nextState.localImportedCounts.size === 0 &&
      nextState.accountBalances.size === 0
    ) {
      clearLocalExclusionState();
    } else {
      saveLocalExclusionState(nextState);
    }
  }, []);

  const resetImportedRecords = useCallback((): boolean => {
    const hadRecords = stateRef.current.localImportedCounts.size > 0;
    const nextState = {
      ...stateRef.current,
      localImportedCounts: new Map<string, number>(),
      updatedAt: Date.now(),
    };
    stateRef.current = nextState;
    setState(nextState);
    setConversionCounts(new Map());
    if (nextState.accountBalances.size === 0) {
      clearLocalExclusionState();
    } else {
      saveLocalExclusionState(nextState);
    }
    return hadRecords;
  }, []);

  const refreshConversionCounts = useCallback(() => {
    setConversionCounts(new Map(stateRef.current.localImportedCounts));
  }, []);

  const recordStats = createStatsFromTransactionCounts(
    state.localImportedCounts,
  );

  return {
    conversionCounts,
    accountBalances: state.accountBalances,
    recordStats,
    addImportedRecords,
    setAccountBalance,
    clearAccountBalance,
    resetImportedRecords,
    refreshConversionCounts,
  };
}
