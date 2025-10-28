import { parse } from "csv-parse/browser/esm/sync";
import { stringify } from "csv-stringify/browser/esm/sync";

// csv-parseの出力するレコードの型。列が存在しない可能性を考慮し、値はundefinedになりうる
export type Record = { [key: string]: string | undefined };

export type ProcessedCsvChunk = {
  data: string;
  count: number;
  startDate: Date | null;
  endDate: Date | null;
  imported: boolean;
};

export type ProcessedResult = {
  [paymentMethod: string]: ProcessedCsvChunk[];
};

export type FileStats = {
  count: number;
  startDate: Date | null;
  endDate: Date | null;
};

export type MfFileStats = FileStats & {
  duplicates: number;
};

export type ProcessOutput = {
  chunks: ProcessedResult;
  paypayStats: FileStats;
  mfStats: MfFileStats;
};

const parseDate = (dateValue: string | undefined): Date | null => {
  if (!dateValue) return null;
  try {
    // `YYYY/MM/DD HH:mm:ss` を `YYYY-MM-DDTHH:mm:ss` に変換
    const dateStr = dateValue.replace(/\//g, "-").replace(" ", "T");
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

const updateDateRange = (
  date: Date,
  minDate: Date | null,
  maxDate: Date | null
): [Date | null, Date | null] => {
  const newMinDate = !minDate || date < minDate ? date : minDate;
  const newMaxDate = !maxDate || date > maxDate ? date : maxDate;
  return [newMinDate, newMaxDate];
};

const createMfmeExclusionSet = (
  mfmeCsvs: string[]
): {
  exclusionSet: Set<string>;
  stats: Omit<MfFileStats, "duplicates">;
} => {
  const exclusionSet = new Set<string>();
  let count = 0;
  let minDate: Date | null = null;
  let maxDate: Date | null = null;

  for (const csv of mfmeCsvs) {
    const records: Record[] = parse(csv, {
      columns: true,
      skip_empty_lines: true,
    });

    for (const record of records) {
      count++;
      const dateStr = record["日付"];
      const amount = record["金額（円）"];
      const institution = record["保有金融機関"];
      const content = record["内容"];

      const date = parseDate(dateStr);
      if (date) {
        [minDate, maxDate] = updateDateRange(date, minDate, maxDate);
      }

      if (dateStr && amount && institution && content) {
        if (record["計算対象"] === "0") {
          continue;
        }
        const key = `${dateStr}_${amount}_${institution}_${content}`;
        exclusionSet.add(key);
      }
    }
  }

  return {
    exclusionSet,
    stats: { count, startDate: minDate, endDate: maxDate },
  };
};

export function processPayPayCsv(
  payPayCsvContent: string,
  mfmeCsvs: string[]
): ProcessOutput {
  const { exclusionSet, stats: mfStats } = createMfmeExclusionSet(mfmeCsvs);
  let duplicates = 0;

  const records: Record[] = parse(payPayCsvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  const paypayStats: FileStats = {
    count: records.length,
    startDate: null,
    endDate: null,
  };

  if (records.length === 0) {
    return {
      chunks: {},
      paypayStats,
      mfStats: { ...mfStats, duplicates },
    };
  }

  const localProcessedRecords: { [key: string]: Record[] } = {};

  for (const record of records) {
    const date = parseDate(record["取引日"]);
    if (date) {
      [paypayStats.startDate, paypayStats.endDate] = updateDateRange(
        date,
        paypayStats.startDate,
        paypayStats.endDate
      );
    }

    const isExpense = record["出金金額（円）"] !== "-";

    const processAndAddRecord = (
      name: string,
      amountStr: string,
      rec: Record
    ) => {
      const date = rec["取引日"]?.split(" ")[0];
      const amount = isExpense ? `-${amountStr}` : amountStr;
      const content = rec["取引先"];

      const key = `${date}_${amount}_${name}_${content}`;

      if (exclusionSet.has(key)) {
        duplicates++;
        return;
      }

      if (!localProcessedRecords[name]) {
        localProcessedRecords[name] = [];
      }
      localProcessedRecords[name].push(rec);
    };

    const transactionMethod = record["取引方法"];
    if (!transactionMethod) {
      continue;
    }

    const combinedPaymentRegex = /([^,]+?)\s*\((\d+|[\d,]+)円\)/g;
    const matches = [...transactionMethod.matchAll(combinedPaymentRegex)];

    if (matches.length > 0) {
      for (const match of matches) {
        const name = match[1]?.trim();
        const amount = match[2]?.replace(/,/g, "");

        if (name && amount) {
          const newRecord = { ...record };
          newRecord["取引方法"] = name;
          newRecord["出金金額（円）"] = amount;
          processAndAddRecord(name, amount, newRecord);
        }
      }
    } else {
      const amountValue = isExpense
        ? record["出金金額（円）"]
        : record["入金金額（円）"];
      const amount = amountValue?.replace(/,/g, "");

      if (amount) {
        processAndAddRecord(transactionMethod, amount, record);
      }
    }
  }

  const headers = Object.keys(records[0] ?? {});
  const chunks: ProcessedResult = {};
  const chunkSize = 100;

  for (const name in localProcessedRecords) {
    if (Object.prototype.hasOwnProperty.call(localProcessedRecords, name)) {
      const allRecords = localProcessedRecords[name];
      if (allRecords && allRecords.length > 0) {
        chunks[name] = [];

        for (let i = 0; i < allRecords.length; i += chunkSize) {
          const chunkOfRecords = allRecords.slice(i, i + chunkSize);

          let minDate: Date | null = null;
          let maxDate: Date | null = null;
          for (const record of chunkOfRecords) {
            const date = parseDate(record["取引日"]);
            if (date) {
              [minDate, maxDate] = updateDateRange(date, minDate, maxDate);
            }
          }

          const csvString = stringify(chunkOfRecords, {
            header: true,
            columns: headers,
          });

          chunks[name].push({
            data: csvString,
            count: chunkOfRecords.length,
            startDate: minDate,
            endDate: maxDate,
            imported: false,
          });
        }
      }
    }
  }

  return {
    chunks,
    paypayStats,
    mfStats: { ...mfStats, duplicates },
  };
}
