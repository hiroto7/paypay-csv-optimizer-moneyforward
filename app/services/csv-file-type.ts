import { parse } from "csv-parse/browser/esm/sync";
import { MFME_COLUMNS, PAYPAY_COLUMNS } from "./csv-schema";

export type CsvFileType = "paypay" | "mfme" | "unknown";

const hasAllHeaders = (
  headers: ReadonlySet<string>,
  requiredHeaders: readonly string[],
): boolean => requiredHeaders.every((header) => headers.has(header));

export const detectCsvFileType = (content: string): CsvFileType => {
  let rows: string[][];

  try {
    rows = parse(content, {
      bom: true,
      relax_column_count: true,
      skip_empty_lines: true,
      to_line: 1,
    });
  } catch {
    return "unknown";
  }

  const headers = new Set(rows[0]?.map((header) => header.trim()) ?? []);

  if (
    hasAllHeaders(headers, [
      PAYPAY_COLUMNS.date,
      PAYPAY_COLUMNS.withdrawalAmount,
      PAYPAY_COLUMNS.depositAmount,
      PAYPAY_COLUMNS.merchant,
      PAYPAY_COLUMNS.paymentMethod,
    ])
  ) {
    return "paypay";
  }

  if (
    hasAllHeaders(headers, [
      MFME_COLUMNS.date,
      MFME_COLUMNS.content,
      MFME_COLUMNS.amount,
      MFME_COLUMNS.institution,
    ])
  ) {
    return "mfme";
  }

  return "unknown";
};
