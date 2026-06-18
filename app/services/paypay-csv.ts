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
  transactionKeys: string[];
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
  exclusionCounts: ReadonlyMap<string, number>,
): {
  groupedRecords: { [paymentMethod: string]: CsvRecord[] };
  groupedTransactions: { [paymentMethod: string]: PayPayTransaction[] };
  duplicates: number;
} {
  let duplicates = 0;
  const groupedRecords: { [paymentMethod: string]: CsvRecord[] } = {};
  const groupedTransactions: { [paymentMethod: string]: PayPayTransaction[] } =
    {};
  const remainingExclusionCounts = new Map(exclusionCounts);

  for (const transaction of transactions) {
    const remainingCount = remainingExclusionCounts.get(transaction.key) ?? 0;
    if (remainingCount > 0) {
      duplicates++;
      if (remainingCount === 1) {
        remainingExclusionCounts.delete(transaction.key);
      } else {
        remainingExclusionCounts.set(transaction.key, remainingCount - 1);
      }
      continue;
    }

    const existingRecords = groupedRecords[transaction.paymentMethod];
    if (existingRecords) {
      existingRecords.push(transaction.record);
    } else {
      groupedRecords[transaction.paymentMethod] = [transaction.record];
    }

    const existingTransactions = groupedTransactions[transaction.paymentMethod];
    if (existingTransactions) {
      existingTransactions.push(transaction);
    } else {
      groupedTransactions[transaction.paymentMethod] = [transaction];
    }
  }

  return { groupedRecords, groupedTransactions, duplicates };
}

export function filterTransactionsBySources(
  transactions: PayPayTransaction[],
  mfmeCounts: ReadonlyMap<string, number>,
  importedCounts: ReadonlyMap<string, number>,
): {
  groupedTransactions: { [paymentMethod: string]: PayPayTransaction[] };
  duplicates: number;
  mfmeDuplicates: number;
  importedDuplicates: number;
} {
  const mfmeResult = filterTransactions(transactions, mfmeCounts);
  const transactionsAfterMfme = Object.values(
    mfmeResult.groupedTransactions,
  ).flat();
  const importedResult = filterTransactions(
    transactionsAfterMfme,
    importedCounts,
  );

  return {
    groupedTransactions: importedResult.groupedTransactions,
    duplicates: mfmeResult.duplicates + importedResult.duplicates,
    mfmeDuplicates: mfmeResult.duplicates,
    importedDuplicates: importedResult.duplicates,
  };
}

export function createChunksFromGroupedTransactions(
  groupedTransactions: { [paymentMethod: string]: PayPayTransaction[] },
  headers: string[],
): ProcessedResult {
  const chunks: ProcessedResult = {};
  const chunkSize = 100;

  for (const [name, allTransactions] of Object.entries(groupedTransactions)) {
    if (allTransactions.length === 0) {
      continue;
    }

    chunks[name] = [];

    for (let i = 0; i < allTransactions.length; i += chunkSize) {
      const chunkOfTransactions = allTransactions.slice(i, i + chunkSize);
      const chunkOfRecords = chunkOfTransactions.map(
        (transaction) => transaction.record,
      );

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
        transactionKeys: chunkOfTransactions.map(
          (transaction) => transaction.key,
        ),
      });
    }
  }

  return chunks;
}

export function createChunksFromGroupedRecords(
  groupedRecords: { [paymentMethod: string]: CsvRecord[] },
  headers: string[],
): ProcessedResult {
  const groupedTransactions = Object.fromEntries(
    Object.entries(groupedRecords).map(([name, records]) => [
      name,
      records.map(
        (record): PayPayTransaction => ({
          key: "",
          record,
          paymentMethod: name,
          dateKey: "",
          amountKey: "",
          contentKey: "",
        }),
      ),
    ]),
  );

  return createChunksFromGroupedTransactions(groupedTransactions, headers);
}
