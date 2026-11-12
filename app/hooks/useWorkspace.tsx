import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import MfImportGuideModal from "~/components/MfImportGuideModal";
import MfmeChangeConfirmModal from "~/components/MfmeChangeConfirmModal";
import PendingImportModal from "~/components/PendingImportModal";
import Pp2mfShareTargetModal from "~/components/Pp2mfShareTargetModal";
import SharedFilesConfirmModal from "~/components/SharedFilesConfirmModal";
import {
  type MfmeChangePreview,
  type SharedFilesPreview,
  useInputFilesStore,
} from "~/hooks/useInputFilesStore";
import { useLocalImportRecords } from "~/hooks/useLocalImportRecords";
import { markSavedChunks } from "~/services/import-progress";
import {
  countExclusions,
  createBaselineCounts,
  createStatsFromTransactionCounts,
  getSavedCountsForFile,
} from "~/services/local-exclusion-store";
import {
  createChunksFromGroupedTransactions,
  filterTransactionsBySources,
} from "~/services/paypay-csv";
import { createImportCsvFile, shareCsv, shareFile } from "~/utils/csv-share";
import {
  createPp2mfOutputFilename,
  createUniqueFilenameBases,
} from "~/utils/pp2mf-output-filename";

type PendingConfirmation<T> = {
  preview: T;
  resolve: (confirmed: boolean) => void;
};

type WorkStartedListener = () => void;

// 入力ファイル・取り込み記録・確認画面の状態を求める。WorkspaceProviderから一度だけ呼ぶ。
function useWorkspaceState(notifyWorkStarted: WorkStartedListener) {
  const onWorkStartedRef = useRef<WorkStartedListener | undefined>(
    notifyWorkStarted,
  );
  onWorkStartedRef.current = notifyWorkStarted;
  const records = useLocalImportRecords();
  // 保存待ちのうち、今回の作業で共有したもの。再読み込み後は空になり、再訪時の確認として扱う。
  const [sessionShare, setSessionShare] = useState<{
    isSharing: boolean;
  } | null>(null);
  const [mfmeConfirmation, setMfmeConfirmation] =
    useState<PendingConfirmation<MfmeChangePreview> | null>(null);
  const [sharedFilesConfirmation, setSharedFilesConfirmation] =
    useState<PendingConfirmation<SharedFilesPreview> | null>(null);
  const { hasImportedRecords } = records;

  const confirmMfmeChange = useCallback(
    (preview: MfmeChangePreview) =>
      hasImportedRecords()
        ? new Promise<boolean>((resolve) =>
            setMfmeConfirmation({ preview, resolve }),
          )
        : Promise.resolve(true),
    [hasImportedRecords],
  );

  const confirmSharedFiles = useCallback(
    (preview: SharedFilesPreview) =>
      new Promise<boolean>((resolve) =>
        setSharedFilesConfirmation({ preview, resolve }),
      ),
    [],
  );

  const { changePayPayFile } = records;
  const handlePayPayFileChanged = useCallback(
    (payPayFingerprint: string | null) => {
      changePayPayFile(payPayFingerprint);
      if (payPayFingerprint !== null) onWorkStartedRef.current?.();
    },
    [changePayPayFile],
  );

  const inputs = useInputFilesStore({
    onPayPayFileChanged: handlePayPayFileChanged,
    onMfmeFilesChanged: records.resetImportedRecords,
    hasPendingImport: records.hasPendingImport,
    hasRecentPendingImport: records.hasRecentPendingImport,
    confirmMfmeChange,
    confirmSharedFiles,
  });
  const {
    payPayFile,
    payPayData,
    mfmeData,
    deferredShare,
    resumeDeferredShare,
    discardDeferredShare,
  } = inputs;
  const { state, discardPendingImport } = records;
  const { pendingImport } = state;
  const payPayFingerprint = payPayData?.fingerprint ?? null;

  const conversion = useMemo(() => {
    if (!payPayData) return null;
    return filterTransactionsBySources(
      payPayData.transactions,
      mfmeData?.records ?? [],
      createBaselineCounts(state, payPayFingerprint),
    );
  }, [payPayData, mfmeData, state, payPayFingerprint]);

  const progress = useMemo(() => {
    const chunks =
      payPayData && conversion
        ? createChunksFromGroupedTransactions(
            conversion.groupedTransactions,
            payPayData.headers,
          )
        : {};
    return markSavedChunks(
      chunks,
      getSavedCountsForFile(state, payPayFingerprint),
    );
  }, [payPayData, conversion, state, payPayFingerprint]);

  const recordStats = useMemo(
    () => createStatsFromTransactionCounts(state.localImportedCounts),
    [state.localImportedCounts],
  );

  const recordCount = countExclusions(state.localImportedCounts);

  // 保存待ちの確認が終わったら、後回しにしていた共有ファイルを読み込む。
  useEffect(() => {
    if (pendingImport || !deferredShare) return;
    if (deferredShare.kind === "pending") {
      resumeDeferredShare();
    } else {
      discardDeferredShare();
    }
  }, [pendingImport, deferredShare, resumeDeferredShare, discardDeferredShare]);

  const handleImport = async (
    filename: string,
    accountName: string,
    index: number,
  ) => {
    const chunk = progress.accounts.find(({ name }) => name === accountName)
      ?.chunks[index];
    if (!chunk) return;

    // 共有シートからMoneyForward MEへ移っている間にページが破棄されても確認できるよう、共有前に記録する。
    flushSync(() => {
      records.startPendingImport({
        accountName,
        sharedAt: Date.now(),
        payPayFingerprint,
        transactions: chunk.transactions,
      });
      setSessionShare({ isSharing: true });
    });
    try {
      const shared = await shareCsv(filename, chunk.data);
      if (!shared) {
        discardPendingImport();
        setSessionShare(null);
        return;
      }
      setSessionShare((current) => (current ? { isSharing: false } : null));
    } catch {
      discardPendingImport();
      setSessionShare(null);
    }
  };

  const handleShareAgain = async (file: File) => {
    setSessionShare({ isSharing: true });
    try {
      if (!(await shareFile(file))) {
        setSessionShare(null);
        return;
      }
      setSessionShare({ isSharing: false });
      discardDeferredShare();
    } catch {
      setSessionShare(null);
    }
  };

  const handleConfirmImport = () => {
    records.confirmPendingImport();
    setSessionShare(null);
    onWorkStartedRef.current?.();
  };

  const handleDiscardImport = () => {
    discardPendingImport();
    setSessionShare(null);
  };

  const isReady = records.isLoaded && inputs.isReady;
  // 両方のファイルがあるときだけ求められる、要確認明細の件数。
  const reviewCandidateCount =
    payPayData && mfmeData && conversion
      ? conversion.mfmeCandidates.length
      : null;

  // 保存待ちの取り込み用CSVを作り直す。受け取りに失敗して、共有されたファイルがないときに使う。
  const recreatePendingImportFile = (): File | null => {
    if (!pendingImport) return null;
    const { accounts } = progress;
    const accountIndex = accounts.findIndex(
      ({ name }) => name === pendingImport.accountName,
    );
    const account = accounts[accountIndex];
    if (!account) return null;
    const pendingKeys = pendingImport.transactions
      .map(({ key }) => key)
      .join("\n");
    const chunkIndex = account.chunks.findIndex(
      (chunk) =>
        chunk.transactions.map(({ key }) => key).join("\n") === pendingKeys,
    );
    const chunk = account.chunks[chunkIndex];
    if (!chunk) return null;
    const filenameBase =
      createUniqueFilenameBases(accounts.map(({ name }) => name))[
        accountIndex
      ] ?? account.name;
    return createImportCsvFile(
      createPp2mfOutputFilename(
        filenameBase,
        chunkIndex,
        account.chunks.length,
      ),
      chunk.data,
    );
  };

  const renderModal = () => {
    if (pendingImport && sessionShare) {
      return (
        <MfImportGuideModal
          accountName={pendingImport.accountName}
          isSharing={sessionShare.isSharing}
          onImported={handleConfirmImport}
          onCancel={handleDiscardImport}
        />
      );
    }
    const pp2mfOutput =
      deferredShare?.kind === "pp2mf-output"
        ? (deferredShare.file ?? recreatePendingImportFile())
        : null;
    if (pendingImport && pp2mfOutput) {
      return (
        <Pp2mfShareTargetModal
          fileName={pp2mfOutput.name}
          onShareAgain={() => void handleShareAgain(pp2mfOutput)}
          onCancel={handleDiscardImport}
        />
      );
    }
    if (pendingImport) {
      return (
        <PendingImportModal
          pendingImport={pendingImport}
          deferredFileNames={
            deferredShare?.kind === "pending" ? deferredShare.fileNames : []
          }
          onConfirm={handleConfirmImport}
          onDiscard={handleDiscardImport}
        />
      );
    }
    if (mfmeConfirmation) {
      const answer = (confirmed: boolean) => {
        mfmeConfirmation.resolve(confirmed);
        setMfmeConfirmation(null);
      };
      return (
        <MfmeChangeConfirmModal
          preview={mfmeConfirmation.preview}
          recordCount={recordCount}
          onConfirm={() => answer(true)}
          onCancel={() => answer(false)}
        />
      );
    }
    if (sharedFilesConfirmation) {
      const { preview } = sharedFilesConfirmation;
      const answer = (confirmed: boolean) => {
        sharedFilesConfirmation.resolve(confirmed);
        setSharedFilesConfirmation(null);
      };
      return (
        <SharedFilesConfirmModal
          preview={preview}
          recordCount={recordCount}
          onConfirm={() => answer(true)}
          onCancel={() => answer(false)}
        />
      );
    }
    return null;
  };

  const modals: ReactNode = renderModal();

  return {
    records,
    inputs,
    state,
    payPayFile,
    payPayData,
    mfmeData,
    conversion,
    progress,
    recordStats,
    reviewCandidateCount,
    isReady,
    handleImport,
    modals,
  };
}

type WorkspaceContextValue = {
  workspace: ReturnType<typeof useWorkspaceState>;
  workStartedListeners: Set<WorkStartedListener>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

// 作業画面と要確認明細のページで、入力ファイル・取り込み記録・確認画面を共有する。
// ページを移るたびに端末から読み込み直して画面が空になることを避けるため、状態はページより上で一度だけ持つ。
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workStartedListeners] = useState(() => new Set<WorkStartedListener>());
  const workspace = useWorkspaceState(() => {
    for (const listener of workStartedListeners) listener();
  });

  return (
    <WorkspaceContext value={{ workspace, workStartedListeners }}>
      {children}
    </WorkspaceContext>
  );
}

export function useWorkspace({
  onWorkStarted,
}: {
  // PayPayの取引履歴を選んだ・受け取ったときと、保存を確認したときに呼ぶ。
  onWorkStarted?: () => void;
} = {}) {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  const { workspace, workStartedListeners } = context;
  const onWorkStartedRef = useRef(onWorkStarted);
  onWorkStartedRef.current = onWorkStarted;

  useEffect(() => {
    const listener = () => onWorkStartedRef.current?.();
    workStartedListeners.add(listener);
    return () => {
      workStartedListeners.delete(listener);
    };
  }, [workStartedListeners]);

  return workspace;
}
