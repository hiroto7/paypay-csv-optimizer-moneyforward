import { parse } from "csv-parse/browser/esm/sync";
import { type FileStats, parseDate, updateDateRange } from "./csv-date";
import {
  type CsvRecord,
  createTransactionKey,
  MFME_COLUMNS,
} from "./csv-schema";

export type MfmeParsedResult = {
  exclusionCounts: Map<string, number>;
  exclusionStats: FileStats;
  stats: FileStats;
  records: CsvRecord[];
};

export const createMfmeExclusionSet = (
  mfmeCsvs: string[],
): MfmeParsedResult => {
  const exclusionCounts = new Map<string, number>();
  const allRecords: CsvRecord[] = [];
  let count = 0;
  let minDate: Date | null = null;
  let maxDate: Date | null = null;
  let exclusionCount = 0;
  let exclusionMinDate: Date | null = null;
  let exclusionMaxDate: Date | null = null;

  for (const csv of mfmeCsvs) {
    const records: CsvRecord[] = parse(csv, {
      columns: true,
      skip_empty_lines: true,
    });

    allRecords.push(...records);

    for (const record of records) {
      count++;
      const dateStr = record[MFME_COLUMNS.date];
      const amount = record[MFME_COLUMNS.amount];
      const institution = record[MFME_COLUMNS.institution];
      const content = record[MFME_COLUMNS.content];

      const date = parseDate(dateStr);
      if (date) {
        [minDate, maxDate] = updateDateRange(date, minDate, maxDate);
      }

      if (dateStr && amount && institution && content) {
        if (record[MFME_COLUMNS.included] === "0") {
          continue;
        }
        exclusionCount++;
        if (date) {
          [exclusionMinDate, exclusionMaxDate] = updateDateRange(
            date,
            exclusionMinDate,
            exclusionMaxDate,
          );
        }
        const key = createTransactionKey(dateStr, amount, institution, content);
        exclusionCounts.set(key, (exclusionCounts.get(key) ?? 0) + 1);
      }
    }
  }

  return {
    exclusionCounts,
    exclusionStats: {
      count: exclusionCount,
      startDate: exclusionMinDate,
      endDate: exclusionMaxDate,
    },
    stats: { count, startDate: minDate, endDate: maxDate },
    records: allRecords,
  };
};
