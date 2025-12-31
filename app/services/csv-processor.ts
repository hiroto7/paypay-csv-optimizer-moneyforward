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
    let dateStr = dateValue.replace(/\//g, "-");
    const hasTime = dateStr.includes(" ");

    if (hasTime) {
      // 時刻がある場合（PayPay CSV）はJSTとして扱う
      // `YYYY/MM/DD HH:mm:ss` → `YYYY-MM-DDTHH:mm:ss+09:00`
      dateStr = dateStr.replace(" ", "T") + "+09:00";
    } else {
      // 時刻がない場合（MFME CSV）はJST 00:00:00として扱う
      // `YYYY/MM/DD` → `YYYY-MM-DDT00:00:00+09:00`
      dateStr += "T00:00:00+09:00";
    }

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

type PayPayTransaction = {
  key: string;
  record: Record;
  paymentMethod: string;
};

/**
 * PayPayのCSVコンテンツを解析し、行を個別の取引に変換する。
 * 併用払いはここで分割される。
 * @param payPayCsvContent - PayPayからエクスポートされたCSVの文字列
 * @returns 抽出された取引の配列と、ファイル全体の統計情報
 */
function extractTransactionsFromPayPayCsv(payPayCsvContent: string): {
  transactions: PayPayTransaction[];
  stats: FileStats;
  headers: string[];
} {
  const records: Record[] = parse(payPayCsvContent, {
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
    const date = parseDate(record["取引日"]);
    if (date) {
      [stats.startDate, stats.endDate] = updateDateRange(
        date,
        stats.startDate,
        stats.endDate
      );
    }

    const isExpense = record["出金金額（円）"] !== "-";

    const createTransaction = (
      name: string,
      amountStr: string,
      rec: Record
    ): PayPayTransaction => {
      const dateKey = rec["取引日"]?.split(" ")[0]; // YYYY/MM/DD
      const amountKey = isExpense ? `-${amountStr}` : amountStr;
      const contentKey = rec["取引先"];
      const key = `${dateKey}_${amountKey}_${name}_${contentKey}`;

      return { key, record: rec, paymentMethod: name };
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
          transactions.push(createTransaction(name, amount, newRecord));
        }
      }
    } else {
      const amountValue = isExpense
        ? record["出金金額（円）"]
        : record["入金金額（円）"];
      const amount = amountValue?.replace(/,/g, "");

      if (amount) {
        transactions.push(createTransaction(transactionMethod, amount, record));
      }
    }
  }

  return { transactions, stats, headers };
}

/**
 * MFの除外設定を基に、PayPayの取引リストをフィルタリングする
 * @param transactions - PayPayの取引リスト
 * @param exclusionSet - MFの取引から生成された除外キーのセット
 * @returns フィルタリングされ、支払い方法でグループ化されたレコードと、重複した件数
 */
function filterTransactions(
  transactions: PayPayTransaction[],
  exclusionSet: Set<string>
): {
  groupedRecords: { [paymentMethod: string]: Record[] };
  duplicates: number;
} {
  let duplicates = 0;
  const groupedRecords: { [paymentMethod: string]: Record[] } = {};

  for (const tx of transactions) {
    if (exclusionSet.has(tx.key)) {
      duplicates++;
      continue;
    }

    const existingRecords = groupedRecords[tx.paymentMethod];
    if (existingRecords) {
      existingRecords.push(tx.record);
    } else {
      groupedRecords[tx.paymentMethod] = [tx.record];
    }
  }

  return { groupedRecords, duplicates };
}

/**
 * PayPay CSVとMoneyForward ME CSVを受け取り、MFME形式に変換・最適化されたCSVチャンクを生成する。
 *
 * @param payPayCsvContent - PayPayからエクスポートされた生のCSV文字列
 * @param mfmeCsvs - MoneyForward MEからエクスポートされたCSV文字列の配列（重複除外用）
 * @returns 支払い方法ごとに分割・チャンク化されたCSVデータと、処理統計
 */
export function processPayPayCsv(
  payPayCsvContent: string,
  mfmeCsvs: string[]
): ProcessOutput {
  // 1. MFME CSVから重複除外用のセットを作成
  const { exclusionSet, stats: mfStats } = createMfmeExclusionSet(mfmeCsvs);

  // 2. PayPay CSVを解析し、取引リストに変換（併用払いの分割など）
  const {
    transactions,
    stats: paypayStats,
    headers,
  } = extractTransactionsFromPayPayCsv(payPayCsvContent);

  if (transactions.length === 0) {
    return {
      chunks: {},
      paypayStats,
      mfStats: { ...mfStats, duplicates: 0 },
    };
  }

  // 3. 重複を除外
  const { groupedRecords, duplicates } = filterTransactions(
    transactions,
    exclusionSet
  );

  // 4. フィルタリング後のレコードを100件ごとのチャンクに分割し、CSV文字列に変換
  const chunks: ProcessedResult = {};
  const chunkSize = 100;

  for (const [name, allRecords] of Object.entries(groupedRecords)) {
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

  return {
    chunks,
    paypayStats,
    mfStats: { ...mfStats, duplicates },
  };
}
