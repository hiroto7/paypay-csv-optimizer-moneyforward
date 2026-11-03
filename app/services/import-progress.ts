import { createCountsFromKeys, subtractCounts } from "./local-exclusion-store";
import type { ProcessedCsvChunk, ProcessedResult } from "./paypay-csv";

type ChunkProgress = ProcessedCsvChunk & { saved: boolean };

export type AccountProgress = {
  name: string;
  chunks: ChunkProgress[];
  count: number;
  saved: boolean;
};

export type ImportProgress = {
  accounts: AccountProgress[];
  savedAccountCount: number;
  importedCount: number;
  isComplete: boolean;
};

const containsCounts = (
  counts: ReadonlyMap<string, number>,
  available: ReadonlyMap<string, number>,
): boolean =>
  [...counts].every(([key, count]) => (available.get(key) ?? 0) >= count);

// 保存したチャンクの明細キーから、チャンクごとの保存済みを求める。
// 同じキーの明細がチャンクの境目をまたぐことがあるため、順番に割り当てず、
// チャンクのキーがすべて残っているときだけ保存済みとして差し引く。
export const markSavedChunks = (
  chunks: ProcessedResult,
  savedCounts: ReadonlyMap<string, number>,
): ImportProgress => {
  let remainingCounts = new Map(savedCounts);
  const accounts = Object.entries(chunks)
    .filter(([, accountChunks]) => accountChunks.length > 0)
    .map(([name, accountChunks]): AccountProgress => {
      const chunkProgress = accountChunks.map((chunk): ChunkProgress => {
        const chunkCounts = createCountsFromKeys(
          chunk.transactions.map(({ key }) => key),
        );
        const saved = containsCounts(chunkCounts, remainingCounts);
        if (saved) {
          remainingCounts = subtractCounts(remainingCounts, chunkCounts);
        }
        return { ...chunk, saved };
      });

      return {
        name,
        chunks: chunkProgress,
        count: chunkProgress.reduce((total, chunk) => total + chunk.count, 0),
        saved: chunkProgress.every((chunk) => chunk.saved),
      };
    });

  return {
    accounts,
    savedAccountCount: accounts.filter((account) => account.saved).length,
    importedCount: accounts.reduce(
      (total, account) =>
        total +
        account.chunks.reduce(
          (sum, chunk) => sum + (chunk.saved ? chunk.count : 0),
          0,
        ),
      0,
    ),
    isComplete: accounts.length > 0 && accounts.every(({ saved }) => saved),
  };
};
