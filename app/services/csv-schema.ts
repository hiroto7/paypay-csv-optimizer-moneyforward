export type CsvRecord = { [key: string]: string | undefined };

export const PAYPAY_COLUMNS = {
  date: "取引日",
  withdrawalAmount: "出金金額（円）",
  depositAmount: "入金金額（円）",
  merchant: "取引先",
  paymentMethod: "取引方法",
} as const;

export const MFME_COLUMNS = {
  included: "計算対象",
  date: "日付",
  content: "内容",
  amount: "金額（円）",
  institution: "保有金融機関",
  category: "大項目",
  subCategory: "中項目",
  memo: "メモ",
  id: "ID",
} as const;

export const normalizeAmount = (amount: string | undefined): string =>
  amount?.replace(/,/g, "") ?? "";

export const createTransactionKey = (
  date: string | undefined,
  amount: string | undefined,
  institution: string | undefined,
  content: string | undefined,
): string =>
  `${date ?? ""}_${amount ?? ""}_${institution ?? ""}_${content ?? ""}`;

export const createBaseMatchKey = (
  date: string | undefined,
  amount: string | undefined,
  content: string | undefined,
): string => `${date ?? ""}_${normalizeAmount(amount)}_${content ?? ""}`;
