import { parse } from "csv-parse/browser/esm/sync";
import { type FileStats, parseDate, updateDateRange } from "./csv-date";
import {
  type CsvRecord,
  createTransactionKey,
  MFME_COLUMNS,
} from "./csv-schema";

export type MfFileStats = FileStats & {
  duplicates: number;
};

export type MfmeParsedResult = {
  exclusionSet: Set<string>;
  stats: Omit<MfFileStats, "duplicates">;
  records: CsvRecord[];
};

export const createMfmeExclusionSet = (
  mfmeCsvs: string[],
): MfmeParsedResult => {
  const exclusionSet = new Set<string>();
  const allRecords: CsvRecord[] = [];
  let count = 0;
  let minDate: Date | null = null;
  let maxDate: Date | null = null;

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
        exclusionSet.add(
          createTransactionKey(dateStr, amount, institution, content),
        );
      }
    }
  }

  return {
    exclusionSet,
    stats: { count, startDate: minDate, endDate: maxDate },
    records: allRecords,
  };
};
