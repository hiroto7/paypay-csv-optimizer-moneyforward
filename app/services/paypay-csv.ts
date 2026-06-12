import { parse } from "csv-parse/browser/esm/sync";
import { stringify } from "csv-stringify/browser/esm/sync";
import { type FileStats, parseDate, updateDateRange } from "./csv-date";
import {
  type CsvRecord,
  createTransactionKey,
  normalizeAmount,
  PAYPAY_COLUMNS,
} from "./csv-schema";

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

export type PayPayTransaction = {
  key: string;
  record: CsvRecord;
  paymentMethod: string;
  dateKey: string;
  amountKey: string;
  contentKey: string;
};

export function extractTransactionsFromPayPayCsv(payPayCsvContent: string): {
  transactions: PayPayTransaction[];
  stats: FileStats;
  headers: string[];
} {
  const records: CsvRecord[] = parse(payPayCsvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  const stats: FileStats = {
    count: records.length,
    startDate: null,
    endDate: null,
  };

  const headers = Object.keys(records[0] ?? {});

  if (records.length === 0) {
    return { transactions: [], stats, headers: [] };
  }

  const transactions: PayPayTransaction[] = [];

  for (const record of records) {
    const date = parseDate(record[PAYPAY_COLUMNS.date]);
    if (date) {
      [stats.startDate, stats.endDate] = updateDateRange(
        date,
        stats.startDate,
        stats.endDate,
      );
    }

    const isExpense = record[PAYPAY_COLUMNS.withdrawalAmount] !== "-";

    const createTransaction = (
      name: string,
      amountStr: string,
      transactionRecord: CsvRecord,
    ): PayPayTransaction => {
      const dateKey =
        transactionRecord[PAYPAY_COLUMNS.date]?.split(" ")[0] ?? "";
      const amountKey = isExpense ? `-${amountStr}` : amountStr;
      const contentKey = transactionRecord[PAYPAY_COLUMNS.merchant] ?? "";
      const key = createTransactionKey(dateKey, amountKey, name, contentKey);

      return {
        key,
        record: transactionRecord,
        paymentMethod: name,
        dateKey,
        amountKey,
        contentKey,
      };
    };

    const transactionMethod = record[PAYPAY_COLUMNS.paymentMethod];
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
          newRecord[PAYPAY_COLUMNS.paymentMethod] = name;
          newRecord[PAYPAY_COLUMNS.withdrawalAmount] = amount;
          transactions.push(createTransaction(name, amount, newRecord));
        }
      }
    } else {
      const amountValue = isExpense
        ? record[PAYPAY_COLUMNS.withdrawalAmount]
        : record[PAYPAY_COLUMNS.depositAmount];
      const amount = normalizeAmount(amountValue);

      if (amount) {
        transactions.push(createTransaction(transactionMethod, amount, record));
      }
    }
  }

  return { transactions, stats, headers };
}

export function filterTransactions(
  transactions: PayPayTransaction[],
  exclusionSet: Set<string>,
): {
  groupedRecords: { [paymentMethod: string]: CsvRecord[] };
  duplicates: number;
} {
  let duplicates = 0;
  const groupedRecords: { [paymentMethod: string]: CsvRecord[] } = {};

  for (const transaction of transactions) {
    if (exclusionSet.has(transaction.key)) {
      duplicates++;
      continue;
    }

    const existingRecords = groupedRecords[transaction.paymentMethod];
    if (existingRecords) {
      existingRecords.push(transaction.record);
    } else {
      groupedRecords[transaction.paymentMethod] = [transaction.record];
    }
  }

  return { groupedRecords, duplicates };
}

export function createChunksFromGroupedRecords(
  groupedRecords: { [paymentMethod: string]: CsvRecord[] },
  headers: string[],
): ProcessedResult {
  const chunks: ProcessedResult = {};
  const chunkSize = 100;

  for (const [name, allRecords] of Object.entries(groupedRecords)) {
    if (allRecords.length === 0) {
      continue;
    }

    chunks[name] = [];

    for (let i = 0; i < allRecords.length; i += chunkSize) {
      const chunkOfRecords = allRecords.slice(i, i + chunkSize);

      let minDate: Date | null = null;
      let maxDate: Date | null = null;
      for (const record of chunkOfRecords) {
        const date = parseDate(record[PAYPAY_COLUMNS.date]);
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

  return chunks;
}
