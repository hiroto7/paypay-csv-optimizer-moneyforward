import { parse } from "csv-parse/browser/esm/sync";
import { stringify } from "csv-stringify/browser/esm/sync";

export type Record = { [key: string]: string };

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

  if (records.length === 0) {
    return {};
  }

  const localProcessedRecords: { [key: string]: Record[] } = {};

  for (const record of records) {
    if (importedIds.has(record["取引番号"])) {
      continue;
    }

    const transactionMethod = record["取引方法"];

    const addRecord = (name: string, rec: Record) => {
      if (!localProcessedRecords[name]) {
        localProcessedRecords[name] = [];
      }
      localProcessedRecords[name].push(rec);
    };

    const combinedPaymentRegex = /([^,]+?)\s*\((\d+|[\d,]+)円\)/g;
    const matches = [...transactionMethod.matchAll(combinedPaymentRegex)];

    if (matches.length > 0) {
      for (const match of matches) {
        const newRecord = { ...record };
        const name = match[1].trim();
        const amount = match[2].replace(/,/g, "");
        newRecord["取引方法"] = name;
        newRecord["出金金額（円）"] = amount;
        addRecord(name, newRecord);
      }
    } else {
      addRecord(transactionMethod, record);
    }
  }

  const headers = Object.keys(records[0]);
  const newChunks: ProcessedResult = {};
  const chunkSize = 100;

  for (const name in localProcessedRecords) {
    if (Object.prototype.hasOwnProperty.call(localProcessedRecords, name)) {
      const allRecords = localProcessedRecords[name];
      if (!newChunks[name]) {
        newChunks[name] = [];
      }

      for (let i = 0; i < allRecords.length; i += chunkSize) {
        const chunkOfRecords = allRecords.slice(i, i + chunkSize);

        let minDate: Date | null = null;
        let maxDate: Date | null = null;
        for (const record of chunkOfRecords) {
          try {
            const dateStr = record['取引日'].replace(/\//g, '-').replace(' ', 'T');
            const currentDate = new Date(dateStr);
            if (!isNaN(currentDate.getTime())) {
              if (!minDate || currentDate < minDate) minDate = currentDate;
              if (!maxDate || currentDate > maxDate) maxDate = currentDate;
            }
          } catch (dateErr) { /* ignore */ }
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

  return newChunks;
}
