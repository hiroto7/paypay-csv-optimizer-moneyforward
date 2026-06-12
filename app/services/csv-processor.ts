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

export const parseDate = (dateValue: string | undefined): Date | null => {
  if (!dateValue) return null;
  try {
    let dateStr = dateValue.replace(/\//g, "-");
    const hasTime = dateStr.includes(" ");

    if (hasTime) {
      // 時刻がある場合（PayPay CSV）はJSTとして扱う
      // `YYYY/MM/DD HH:mm:ss` → `YYYY-MM-DDTHH:mm:ss+09:00`
      dateStr = `${dateStr.replace(" ", "T")}+09:00`;
    } else {
      // 時刻がない場合（MFME CSV）はJST 00:00:00として扱う
      // `YYYY/MM/DD` → `YYYY-MM-DDT00:00:00+09:00`
      dateStr += "T00:00:00+09:00";
    }

    const date = new Date(dateStr);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

export const updateDateRange = (
  date: Date,
  minDate: Date | null,
  maxDate: Date | null,
): [Date | null, Date | null] => {
  const newMinDate = !minDate || date < minDate ? date : minDate;
  const newMaxDate = !maxDate || date > maxDate ? date : maxDate;
  return [newMinDate, newMaxDate];
};

export const createMfmeExclusionSet = (
  mfmeCsvs: string[],
): {
  exclusionSet: Set<string>;
  stats: Omit<MfFileStats, "duplicates">;
  records: Record[];
} => {
  const exclusionSet = new Set<string>();
  const allRecords: Record[] = [];
  let count = 0;
  let minDate: Date | null = null;
  let maxDate: Date | null = null;

  for (const csv of mfmeCsvs) {
    const records: Record[] = parse(csv, {
      columns: true,
      skip_empty_lines: true,
    });

    allRecords.push(...records);

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
    records: allRecords,
  };
};

export type PayPayTransaction = {
  key: string;
  record: Record;
  paymentMethod: string;
  dateKey: string;
  amountKey: string;
  contentKey: string;
};

export type DeletionCandidateReason =
  | "wrong-account"
  | "duplicate";

export type DeletionCandidate = {
  reason: DeletionCandidateReason;
  date: string;
  amount: string;
  content: string;
  expectedInstitution: string;
  actualInstitution: string;
  category: string;
  subCategory: string;
  memo: string;
  id: string;
};

/**
 * PayPayのCSVコンテンツを解析し、行を個別の取引に変換する。
 * 併用払いはここで分割される。
 * @param payPayCsvContent - PayPayからエクスポートされたCSVの文字列
 * @returns 抽出された取引の配列と、ファイル全体の統計情報
 */
export function extractTransactionsFromPayPayCsv(payPayCsvContent: string): {
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
        stats.endDate,
      );
    }

    const isExpense = record["出金金額（円）"] !== "-";

    const createTransaction = (
      name: string,
      amountStr: string,
      rec: Record,
    ): PayPayTransaction => {
      const dateKey = rec["取引日"]?.split(" ")[0] ?? ""; // YYYY/MM/DD
      const amountKey = isExpense ? `-${amountStr}` : amountStr;
      const contentKey = rec["取引先"] ?? "";
      const key = `${dateKey}_${amountKey}_${name}_${contentKey}`;

      return {
        key,
        record: rec,
        paymentMethod: name,
        dateKey,
        amountKey,
        contentKey,
      };
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
export function filterTransactions(
  transactions: PayPayTransaction[],
  exclusionSet: Set<string>,
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
 * グループ化されたレコードを100件ごとのチャンクに分割し、CSV文字列に変換する
 * @param groupedRecords - 支払い方法でグループ化されたレコード
 * @param headers - CSVのヘッダー
 * @returns チャンク化されたCSVデータ
 */
export function createChunksFromGroupedRecords(
  groupedRecords: { [paymentMethod: string]: Record[] },
  headers: string[],
): ProcessedResult {
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

  return chunks;
}

const normalizeAmount = (amount: string | undefined): string =>
  amount?.replace(/,/g, "") ?? "";

const createBaseMatchKey = (
  date: string | undefined,
  amount: string | undefined,
  content: string | undefined,
): string => `${date ?? ""}_${normalizeAmount(amount)}_${content ?? ""}`;

const createMfmeCandidateKey = (record: Record, fallbackIndex: number): string =>
  record["ID"] ??
  `${record["日付"] ?? ""}_${record["金額（円）"] ?? ""}_${record["保有金融機関"] ?? ""}_${record["内容"] ?? ""}_${fallbackIndex}`;

/**
 * PayPayの取引とMFMEの明細を突き合わせ、誤取り込み後に削除候補となるMFME明細を抽出する。
 *
 * - 日付・金額・内容がPayPay取引と一致するMFME明細を対象にする
 * - 期待口座（PayPayの支払い方法）と異なる口座に入っている明細は「別口座取り込み」候補
 * - 期待口座に同一明細が複数ある場合は、2件目以降を「重複取り込み」候補
 */
export function findMfmeDeletionCandidates(
  transactions: PayPayTransaction[],
  mfmeRecords: Record[],
): DeletionCandidate[] {
  const mfmeRecordsByBaseKey = new Map<string, Record[]>();

  for (const record of mfmeRecords) {
    if (record["計算対象"] === "0") {
      continue;
    }

    const key = createBaseMatchKey(
      record["日付"],
      record["金額（円）"],
      record["内容"],
    );
    const existingRecords = mfmeRecordsByBaseKey.get(key);
    if (existingRecords) {
      existingRecords.push(record);
    } else {
      mfmeRecordsByBaseKey.set(key, [record]);
    }
  }

  const candidates = new Map<string, DeletionCandidate>();

  for (const transaction of transactions) {
    const matches = mfmeRecordsByBaseKey.get(
      createBaseMatchKey(
        transaction.dateKey,
        transaction.amountKey,
        transaction.contentKey,
      ),
    );

    if (!matches) {
      continue;
    }

    const expectedMatches = matches.filter(
      (record) => record["保有金融機関"] === transaction.paymentMethod,
    );
    const duplicateExpectedRecords = new Set(expectedMatches.slice(1));

    matches.forEach((record, index) => {
      const actualInstitution = record["保有金融機関"] ?? "";
      const candidateKey = createMfmeCandidateKey(record, index);
      const isWrongAccount = actualInstitution !== transaction.paymentMethod;
      const isDuplicate = duplicateExpectedRecords.has(record);

      if (!isWrongAccount && !isDuplicate) {
        return;
      }

      candidates.set(candidateKey, {
        reason: isWrongAccount ? "wrong-account" : "duplicate",
        date: record["日付"] ?? "",
        amount: normalizeAmount(record["金額（円）"]),
        content: record["内容"] ?? "",
        expectedInstitution: transaction.paymentMethod,
        actualInstitution,
        category: record["大項目"] ?? "",
        subCategory: record["中項目"] ?? "",
        memo: record["メモ"] ?? "",
        id: record["ID"] ?? "",
      });
    });
  }

  return [...candidates.values()];
}

export function createDeletionCandidatesCsv(
  candidates: DeletionCandidate[],
): string {
  const rows = candidates.map((candidate) => ({
    削除候補理由:
      candidate.reason === "wrong-account" ? "別口座取り込み" : "重複取り込み",
    日付: candidate.date,
    内容: candidate.content,
    金額: candidate.amount,
    期待される口座: candidate.expectedInstitution,
    実際の口座: candidate.actualInstitution,
    大項目: candidate.category,
    中項目: candidate.subCategory,
    メモ: candidate.memo,
    MFME_ID: candidate.id,
  }));

  return stringify(rows, { header: true });
}
