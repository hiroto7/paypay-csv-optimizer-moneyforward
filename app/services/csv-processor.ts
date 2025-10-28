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

const createMfmeExclusionSet = (mfmeCsvs: string[]): Set<string> => {
  const exclusionSet = new Set<string>();

  for (const csv of mfmeCsvs) {
    const records: Record[] = parse(csv, {
      columns: true,
      skip_empty_lines: true,
    });

    for (const record of records) {
      const date = record["日付"];
      const amount = record["金額（円）"];
      const institution = record["保有金融機関"];
      const content = record["内容"];

      if (date && amount && institution && content) {
        // MFMEの「計算対象」が0のレコードは除外
        if (record["計算対象"] === "0") {
          continue;
        }
        const key = `${date}_${amount}_${institution}_${content}`;
        exclusionSet.add(key);
      }
    }
  }

  return exclusionSet;
};

export function processPayPayCsv(
  payPayCsvContent: string,
  mfmeCsvs: string[]
): ProcessedResult {
  const exclusionSet = createMfmeExclusionSet(mfmeCsvs);

  const records: Record[] = parse(payPayCsvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  const firstRecord = records[0];
  if (!firstRecord) {
    return {};
  }

  const localProcessedRecords: { [key: string]: Record[] } = {};

  for (const record of records) {
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
        return; // 除外リストに含まれていれば処理を中断
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

  const headers = Object.keys(firstRecord);
  const newChunks: ProcessedResult = {};
  const chunkSize = 100;

  for (const name in localProcessedRecords) {
    if (Object.prototype.hasOwnProperty.call(localProcessedRecords, name)) {
      const allRecords = localProcessedRecords[name];
      if (allRecords && allRecords.length > 0) {
        newChunks[name] = [];

        for (let i = 0; i < allRecords.length; i += chunkSize) {
          const chunkOfRecords = allRecords.slice(i, i + chunkSize);

          let minDate: Date | null = null;
          let maxDate: Date | null = null;
          for (const record of chunkOfRecords) {
            const dateValue = record["取引日"];
            if (dateValue) {
              try {
                const dateStr = dateValue.replace(/\//g, "-").replace(" ", "T");
                const currentDate = new Date(dateStr);
                if (!isNaN(currentDate.getTime())) {
                  if (!minDate || currentDate < minDate) minDate = currentDate;
                  if (!maxDate || currentDate > maxDate) maxDate = currentDate;
                }
              } catch (dateErr) {
                /* ignore */
              }
            }
          }

          const csvString = stringify(chunkOfRecords, {
            header: true,
            columns: headers,
          });

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
