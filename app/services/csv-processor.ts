import { parse } from "csv-parse/browser/esm/sync";
import { stringify } from "csv-stringify/browser/esm/sync";

// csv-parseの出力するレコードの型。列が存在しない可能性を考慮し、値はundefinedになりうる
export type Record = { [key: string]: string | undefined };

export type ProcessedCsvChunk = {
  data: string;
  count: number;
  startDate: Date | null;
  endDate: Date | null;
};

export type ProcessedResult = {
  [paymentMethod: string]: ProcessedCsvChunk[];
};

export function processPayPayCsv(
  csvContent: string,
  importedIds: Set<string>
): ProcessedResult {
  const records: Record[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  const firstRecord = records[0];
  if (!firstRecord) {
    return {};
  }

  const localProcessedRecords: { [key: string]: Record[] } = {};

  for (const record of records) {
    const transactionId = record["取引番号"];
    if (transactionId && importedIds.has(transactionId)) {
      continue;
    }

    const transactionMethod = record["取引方法"];
    if (!transactionMethod) {
      continue;
    }

    const addRecord = (name: string, rec: Record) => {
      if (!localProcessedRecords[name]) {
        localProcessedRecords[name] = [];
      }
      // 型推論により、この時点で localProcessedRecords[name] は Record[] 型になる
      localProcessedRecords[name].push(rec);
    };

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
          addRecord(name, newRecord);
        }
      }
    } else {
      addRecord(transactionMethod, record);
    }
  }

  const headers = Object.keys(firstRecord);
  const newChunks: ProcessedResult = {};
  const chunkSize = 100;

  for (const name in localProcessedRecords) {
    // for...in ループなので、hasOwnPropertyチェックは良い習慣
    if (Object.prototype.hasOwnProperty.call(localProcessedRecords, name)) {
      const allRecords = localProcessedRecords[name];
      if (allRecords) {
        newChunks[name] = [];

        for (let i = 0; i < allRecords.length; i += chunkSize) {
          const chunkOfRecords = allRecords.slice(i, i + chunkSize);

          let minDate: Date | null = null;
          let maxDate: Date | null = null;
          for (const record of chunkOfRecords) {
            const dateValue = record['取引日'];
            if (dateValue) {
              try {
                const dateStr = dateValue.replace(/\//g, '-').replace(' ', 'T');
                const currentDate = new Date(dateStr);
                if (!isNaN(currentDate.getTime())) {
                  if (!minDate || currentDate < minDate) minDate = currentDate;
                  if (!maxDate || currentDate > maxDate) maxDate = currentDate;
                }
              } catch (dateErr) { /* ignore */ }
            }
          }

          const csvString = stringify(chunkOfRecords, { header: true, columns: headers });

          newChunks[name].push({
            data: csvString,
            count: chunkOfRecords.length,
            startDate: minDate,
            endDate: maxDate,
          });
        }
      }
    }
  }

  return newChunks;
}