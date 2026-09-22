import { useMemo } from "react";
import { useInputFilesStore } from "~/hooks/useInputFilesStore";
import type { FileStats } from "~/services/csv-date";
import type { MfmeParsedResult } from "~/services/mfme-csv";

type InputWorkspaceCallbacks = {
  onPayPayFileChanged: () => void;
  onMfmeFilesChanged: () => boolean;
};

export function useInputWorkspace({
  onPayPayFileChanged,
  onMfmeFilesChanged,
}: InputWorkspaceCallbacks) {
  const files = useInputFilesStore({
    onPayPayFileChanged,
    onMfmeFilesChanged,
  });

  const mfmeFileStatsByName = useMemo<ReadonlyMap<string, FileStats>>(
    () =>
      new Map(
        [...files.mfmeDataByName].map(([name, data]) => [name, data.stats]),
      ),
    [files.mfmeDataByName],
  );

  const mfmeData = useMemo<MfmeParsedResult | null>(() => {
    if (files.mfmeFiles.length === 0) return null;
    const values = files.mfmeFiles.flatMap((file) => {
      const data = files.mfmeDataByName.get(file.name);
      return data ? [data] : [];
    });
    if (values.length === 0) return null;

    const dates = values.flatMap(({ stats }) =>
      stats.startDate && stats.endDate ? [stats.startDate, stats.endDate] : [],
    );
    return {
      records: values.flatMap(({ records }) => records),
      stats: {
        count: values.reduce((total, { stats }) => total + stats.count, 0),
        startDate:
          dates.length > 0
            ? new Date(Math.min(...dates.map((date) => date.getTime())))
            : null,
        endDate:
          dates.length > 0
            ? new Date(Math.max(...dates.map((date) => date.getTime())))
            : null,
      },
    };
  }, [files.mfmeDataByName, files.mfmeFiles]);

  return { ...files, mfmeData, mfmeFileStatsByName };
}
