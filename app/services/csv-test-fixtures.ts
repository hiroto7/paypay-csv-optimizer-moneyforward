export const PAYPAY_CSV_HEADER =
  "取引日,出金金額（円）,入金金額（円）,海外出金金額,通貨,変換レート（円）,利用国,取引内容,取引先,取引方法,支払い区分,利用者,取引番号";

export const MFME_CSV_HEADER =
  "計算対象,日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替,ID";

export const SINGLE_PAYMENT_ROW =
  "2025/10/24 10:59:25,190,-,-,-,-,-,支払い,ダミーストアA,PayPay残高,-,-,00000000000000000001";

export const COMBINED_PAYMENT_ROW =
  '2025/09/29 14:54:12,410,-,-,-,-,-,支払い,ダミーストアB,"PayPayポイント (93円), PayPay残高 (317円)",-,-,00000000000000000002';

export const COMBINED_WITH_COMMA_AMOUNT_ROW =
  '2025/03/23 13:03:03,"2,600",-,-,-,-,-,支払い,ダミーストアC,"PayPayポイント (1円), PayPay残高 (2,599円)",-,-,00000000000000000003';

export const VISA_PAYMENT_ROW =
  "2025/10/24 13:17:35,72,-,-,-,-,-,支払い,ダミーストアD,VISA 1234,-,-,00000000000000000004";

export const createSecondSinglePaymentRow = () =>
  SINGLE_PAYMENT_ROW.replace("10:59:25", "18:00:00").replace(/0001$/, "0005");
