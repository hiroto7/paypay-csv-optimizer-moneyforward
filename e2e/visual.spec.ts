import { expect, type Page, test } from "@playwright/test";

const payPayHeader =
  "取引日,出金金額（円）,入金金額（円）,海外出金金額,通貨,変換レート（円）,利用国,取引内容,取引先,取引方法,支払い区分,利用者,取引番号";
const mfmeHeader =
  "計算対象,日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替,ID";

const payPayCsv = [
  payPayHeader,
  "2025/10/24 10:59:25,190,-,-,-,-,-,支払い,ダミーストアA,PayPay残高,-,-,00000000000000000001",
  '2025/09/29 14:54:12,410,-,-,-,-,-,支払い,ダミーストアB,"PayPayポイント (93円), PayPay残高 (317円)",-,-,00000000000000000002',
  "2025/10/24 13:17:35,72,-,-,-,-,-,支払い,ダミーストアD,VISA 1234,-,-,00000000000000000004",
].join("\n");

const auditMfmeCsv = [
  mfmeHeader,
  "1,2025/10/24,ダミーストアA,-190,別の口座,食費,食費,架空データ,,dummy-id-01",
  "1,2025/09/29,ダミーストアB,-93,PayPayポイント,食費,食費,架空データ,,dummy-id-02",
  "1,2025/09/29,ダミーストアB,-317,PayPay残高,食費,食費,架空データ,,dummy-id-03",
  "1,2025/09/29,ダミーストアB,-317,PayPay残高,食費,食費,架空データ,,dummy-id-04",
].join("\n");

const openCleanPage = async (page: Page) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "取り込み用CSVを作成" }),
  ).toBeVisible();
  await page.waitForTimeout(500);
};

const selectPayPayCsv = async (page: Page) => {
  await page.locator("#paypay-csv-input").setInputFiles({
    name: "paypay-history.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(payPayCsv),
  });
  await expect(
    page
      .getByRole("region", { name: "PayPay取引履歴" })
      .getByText("3件", { exact: true }),
  ).toBeVisible();
};

test.beforeEach(async ({ page }) => {
  await openCleanPage(page);
});

test("初期画面をデスクトップとモバイルで表示できる", async ({ page }) => {
  await expect(page).toHaveScreenshot("initial-desktop.png", {
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page).toHaveScreenshot("initial-mobile.png", {
    fullPage: true,
  });
});

test("変換結果と保存確認モーダルを表示できる", async ({ page }) => {
  await selectPayPayCsv(page);
  await page
    .getByRole("button", { name: "既存明細を除外せずにCSVを作成" })
    .click();

  await expect(page.getByRole("heading", { name: "変換結果" })).toBeVisible();
  await expect(page).toHaveScreenshot("conversion-result.png", {
    fullPage: true,
  });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "取り込む" }).first().click();
  await downloadPromise;
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveScreenshot("import-guide-modal.png", {
    fullPage: true,
  });
});

test("重複登録と口座間違いの候補を表示できる", async ({ page }) => {
  await page
    .getByRole("button", { name: "重複登録・口座間違いを確認" })
    .click();
  await selectPayPayCsv(page);
  await page.locator("#mfme-csv-input").setInputFiles({
    name: "moneyforward-history.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(auditMfmeCsv),
  });

  await expect(
    page.getByRole("heading", { name: "要確認明細 2件" }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("audit-candidates.png", {
    fullPage: true,
  });
});
