import { parse } from "csv-parse/browser/esm/sync";
import { type FileStats, parseDate, updateDateRange } from "./csv-date";
import { type CsvRecord, MFME_COLUMNS } from "./csv-schema";

export type MfmeParsedResult = {
  stats: FileStats;
  records: CsvRecord[];
};

export const parseMfmeCsvs = (mfmeCsvs: string[]): MfmeParsedResult => {
  const allRecords: CsvRecord[] = [];
  let recordCount = 0;
  let minDate: Date | null = null;
  let maxDate: Date | null = null;

  for (const csv of mfmeCsvs) {
    const records: CsvRecord[] = parse(csv, {
      columns: true,
      skip_empty_lines: true,
    });

    allRecords.push(...records);

    for (const record of records) {
      const dateStr = record[MFME_COLUMNS.date];
      const amount = record[MFME_COLUMNS.amount];
      const institution = record[MFME_COLUMNS.institution];
      const content = record[MFME_COLUMNS.content];

      if (dateStr && amount && institution && content) {
        recordCount++;
        const date = parseDate(dateStr);
        if (date) {
          [minDate, maxDate] = updateDateRange(date, minDate, maxDate);
        }
      }
    }
  }

  return {
    stats: {
      count: recordCount,
      startDate: minDate,
      endDate: maxDate,
    },
    records: allRecords,
  };
};
