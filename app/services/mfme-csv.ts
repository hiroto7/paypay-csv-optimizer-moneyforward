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

// 選択中のファイル順に、ファイルごとの解析結果をまとめる。
export const combineMfmeData = (
  files: readonly File[],
  dataByName: ReadonlyMap<string, MfmeParsedResult>,
): MfmeParsedResult | null => {
  const values = files.flatMap((file) => {
    const data = dataByName.get(file.name);
    return data ? [data] : [];
  });
  if (values.length === 0) return null;

  let startDate: Date | null = null;
  let endDate: Date | null = null;
  for (const { stats } of values) {
    for (const date of [stats.startDate, stats.endDate]) {
      if (date)
        [startDate, endDate] = updateDateRange(date, startDate, endDate);
    }
  }

  return {
    records: values.flatMap(({ records }) => records),
    stats: {
      count: values.reduce((total, { stats }) => total + stats.count, 0),
      startDate,
      endDate,
    },
  };
};
