import { useCallback, useEffect, useRef, useState } from "react";
import {
  addCounts,
  createCountsFromKeys,
  createEmptyLocalExclusionState,
  createStatsFromTransactionCounts,
  type LocalExclusionState,
  loadLocalExclusionState,
  type PendingImport,
  persistLocalExclusionState,
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

  const commit = useCallback((nextState: LocalExclusionState) => {
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
    const { pendingImport } = stateRef.current;
    if (!pendingImport) return;

    const now = Date.now();
    const accountBalances = new Map(stateRef.current.accountBalances);
    const currentBalance = accountBalances.get(pendingImport.accountName);
    if (currentBalance) {
      accountBalances.set(pendingImport.accountName, {
        amount: currentBalance.amount + pendingImport.balanceDelta,
        updatedAt: now,
      });
    }

    commit({
      localImportedCounts: addCounts(
        stateRef.current.localImportedCounts,
        createCountsFromKeys(pendingImport.transactions.map(({ key }) => key)),
      ),
      accountBalances,
      pendingImport: null,
      updatedAt: now,
    });
  }, [commit]);

  const discardPendingImport = useCallback(() => {
    if (!stateRef.current.pendingImport) return;
    commit({ ...stateRef.current, pendingImport: null, updatedAt: Date.now() });
  }, [commit]);

  const hasPendingImport = useCallback(
    () => stateRef.current.pendingImport !== null,
    [],
  );

  const setAccountBalance = useCallback(
    (accountName: string, amount: number) => {
      const now = Date.now();
      const accountBalances = new Map(stateRef.current.accountBalances);
      accountBalances.set(accountName, { amount, updatedAt: now });
      commit({ ...stateRef.current, accountBalances, updatedAt: now });
    },
    [commit],
  );

  const clearAccountBalance = useCallback(
    (accountName: string) => {
      const accountBalances = new Map(stateRef.current.accountBalances);
      accountBalances.delete(accountName);
      commit({ ...stateRef.current, accountBalances, updatedAt: Date.now() });
    },
    [commit],
  );

  const resetImportedRecords = useCallback((): boolean => {
    const hadRecords = stateRef.current.localImportedCounts.size > 0;
    // 保存待ちはMoneyForward MEの入出金履歴からは確定できないため、記録だけをリセットする。
    commit({
      ...stateRef.current,
      localImportedCounts: new Map<string, number>(),
      updatedAt: Date.now(),
    });
    setConversionCounts(new Map());
    return hadRecords;
  }, [commit]);

  const refreshConversionCounts = useCallback(() => {
    setConversionCounts(new Map(stateRef.current.localImportedCounts));
  }, []);

  const recordStats = createStatsFromTransactionCounts(
    state.localImportedCounts,
  );

  return {
    conversionCounts,
    accountBalances: state.accountBalances,
    pendingImport: state.pendingImport,
    recordStats,
    startPendingImport,
    confirmPendingImport,
    discardPendingImport,
    hasPendingImport,
    setAccountBalance,
    clearAccountBalance,
    resetImportedRecords,
    refreshConversionCounts,
  };
}
