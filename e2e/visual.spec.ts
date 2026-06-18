import { expect, type Page, test } from "@playwright/test";
import {
  SHARED_FILE_DATABASE_NAME,
  SHARED_FILE_DATABASE_VERSION,
} from "../app/utils/shared-file-store";

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

const createChunkedPayPayCsv = (count: number) =>
  [
    payPayHeader,
    ...Array.from({ length: count }, (_, index) => {
      const date = new Date(Date.UTC(2026, 4, 11 - index));
      const formattedDate = date
        .toISOString()
        .slice(0, 10)
        .replaceAll("-", "/");
      const transactionId = String(index + 1).padStart(20, "0");
      return `${formattedDate} 12:00:00,100,-,-,-,-,-,支払い,ダミーストア${index + 1},VISA 1234,-,-,${transactionId}`;
    }),
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

const shareCsvThroughTarget = async (
  page: Page,
  id: string,
  name: string,
  csv: string,
) => {
  await page.evaluate(
    async ({ id, name, csv, databaseName, databaseVersion }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(databaseName, databaseVersion);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction("shared-files", "readwrite");
        transaction.objectStore("shared-files").put({
          id,
          files: [new File([csv], name, { type: "text/csv" })],
          receivedAt: Date.now(),
        });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      database.close();
    },
    {
      id,
      name,
      csv,
      databaseName: SHARED_FILE_DATABASE_NAME,
      databaseVersion: SHARED_FILE_DATABASE_VERSION,
    },
  );

  await page.goto(`/?shared-files=${encodeURIComponent(id)}`);
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
  await page.getByRole("button", { name: "今回は除外せずに進む" }).click();

  await expect(page.getByRole("heading", { name: "変換結果" })).toBeVisible();
  await expect(page).toHaveScreenshot("conversion-result.png", {
    fullPage: true,
  });

  await page.evaluate(() => {
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => true,
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: () =>
        new Promise<void>((resolve) => {
          (
            window as typeof window & {
              resolveShare?: () => void;
            }
          ).resolveShare = resolve;
        }),
    });
  });

  await page.getByRole("button", { name: "取り込む" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "MoneyForward MEに取り込む" }),
  ).toBeVisible();
  await expect(
    page.getByText("共有シートでMoneyForward MEを選ぶ"),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("share-guide-modal.png", {
    fullPage: true,
  });

  await page.evaluate(() => {
    (
      window as typeof window & {
        resolveShare?: () => void;
      }
    ).resolveShare?.();
  });
  await expect(
    page.getByRole("button", { name: "MoneyForward MEで保存した" }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("import-guide-modal.png", {
    fullPage: true,
  });

  await page.getByRole("button", { name: "MoneyForward MEで保存した" }).click();
  await expect(
    page.getByRole("button", { name: "取り込みました" }),
  ).toBeVisible();
});

test("分割チャンクの一部を取り込んでも残りのチャンクを維持する", async ({
  page,
}) => {
  await page.locator("#paypay-csv-input").setInputFiles({
    name: "paypay-history-157.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(createChunkedPayPayCsv(157)),
  });
  await page.getByRole("button", { name: "今回は除外せずに進む" }).click();
  await page.getByRole("button", { name: "詳細を表示" }).click();

  await expect(
    page.getByText("paypay-visa-1234_part1.csv", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("paypay-visa-1234_part2.csv", { exact: true }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "手動登録が必要なので取り込む" })
    .first()
    .click();
  await page.getByRole("button", { name: "MoneyForward MEで保存した" }).click();

  await expect(
    page.getByText("paypay-visa-1234_part1.csv", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("paypay-visa-1234_part2.csv", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "取り込みました" }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "手動登録が必要なので取り込む" }),
  ).toHaveCount(1);

  await page
    .getByRole("button", { name: "手動登録が必要なので取り込む" })
    .click();
  await expect(
    page.getByRole("button", { name: "MoneyForward MEで保存した" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "MoneyForward MEで保存した" }).click();
  await expect(
    page.getByRole("button", { name: "取り込みました" }),
  ).toHaveCount(2);
});

test("MoneyForward ME CSVを先に選んでもPayPay CSVを案内する", async ({
  page,
}) => {
  await page.locator("#mfme-csv-input").setInputFiles({
    name: "moneyforward-history.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(auditMfmeCsv),
  });

  await expect(
    page.getByText("MoneyForward ME CSVを読み込み済み", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "PayPay CSVを選択してください" }),
  ).toBeVisible();
  await expect(page.getByText("読み込んだ明細", { exact: true })).toBeVisible();
  await expect(page.getByText("4件", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "今回は除外せずに進む" }),
  ).toHaveCount(0);
  await expect(page).toHaveScreenshot("mfme-loaded-before-paypay.png", {
    fullPage: true,
  });

  await page.reload();

  await expect(
    page.getByText("MoneyForward ME CSVを読み込み済み", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "PayPay CSVを選択してください" }),
  ).toBeVisible();
});

test("読み込めない任意のMFME CSVを解除して除外なしで進める", async ({
  page,
}) => {
  await selectPayPayCsv(page);
  await page.locator("#mfme-csv-input").setInputFiles({
    name: "invalid-moneyforward.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("これはMoneyForward ME CSVではありません"),
  });

  await expect(page.getByRole("alert")).toContainText(
    "MoneyForward MEの明細を読み込めませんでした",
  );
  await page
    .getByRole("region", { name: "既存明細の除外" })
    .getByRole("button", { name: "ファイルの選択を解除" })
    .click();

  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "今回は除外せずに進む" }),
  ).toBeVisible();
});

test("Share TargetからMFME CSVを年ごとに追加できる", async ({ page }) => {
  const mfme2025Csv = [
    mfmeHeader,
    "1,2025/12/31,ダミーストア2025,-100,PayPay残高,食費,食費,架空データ,,dummy-2025",
  ].join("\n");
  const mfme2026Csv = [
    mfmeHeader,
    "1,2026/01/01,ダミーストア2026,-200,PayPay残高,食費,食費,架空データ,,dummy-2026",
  ].join("\n");

  await shareCsvThroughTarget(
    page,
    "shared-mfme-2025",
    "収入・支出詳細_2025.csv",
    mfme2025Csv,
  );
  await expect(page.getByText("読み込んだ明細", { exact: true })).toBeVisible();
  await expect(page.getByText("1件", { exact: true })).toBeVisible();

  await shareCsvThroughTarget(
    page,
    "shared-mfme-2026",
    "収入・支出詳細_2026.csv",
    mfme2026Csv,
  );
  await expect(page.getByText("2件", { exact: true })).toBeVisible();
  await expect(page.getByText("2025/12/31～2026/01/01")).toBeVisible();

  await shareCsvThroughTarget(
    page,
    "shared-mfme-2026-again",
    "収入・支出詳細_2026.csv",
    mfme2026Csv,
  );
  await expect(page.getByText("2件", { exact: true })).toBeVisible();

  await page
    .getByRole("button", { name: "重複登録・口座間違いを確認" })
    .click();
  await page.getByRole("button", { name: "取り込み用CSVの作成に戻る" }).click();
  await expect(page.getByText("2件", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByText("2件", { exact: true })).toBeVisible();
});

test("Share Targetから渡したMFME CSVを監査に利用できる", async ({ page }) => {
  await selectPayPayCsv(page);
  await shareCsvThroughTarget(
    page,
    "shared-mfme-for-audit",
    "収入・支出詳細_監査用.csv",
    auditMfmeCsv,
  );

  await page
    .getByRole("button", { name: "重複登録・口座間違いを確認" })
    .click();

  await expect(
    page.getByRole("heading", { name: "要確認明細 2件" }),
  ).toBeVisible();
});

test("PayPay CSVを先に選んでも実際の除外件数を表示する", async ({ page }) => {
  await selectPayPayCsv(page);
  await page.locator("#mfme-csv-input").setInputFiles({
    name: "moneyforward-history.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(auditMfmeCsv),
  });

  await expect(
    page.getByText("登録済みの明細 2件を除外しました", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("MoneyForward ME CSV: 2件", { exact: true }),
  ).toBeVisible();

  await page.reload();

  await expect(
    page.getByText("登録済みの明細 2件を除外しました", { exact: true }),
  ).toBeVisible();
});

test("監査用のMoneyForward ME CSVで保存済みの除外情報を置き換えない", async ({
  page,
}) => {
  await page.locator("#mfme-csv-input").setInputFiles({
    name: "saved-moneyforward-history.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(auditMfmeCsv),
  });
  await page
    .getByRole("button", { name: "重複登録・口座間違いを確認" })
    .click();
  await page.locator("#mfme-csv-input").setInputFiles({
    name: "audit-only-moneyforward-history.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      [
        mfmeHeader,
        "1,2025/10/24,ダミーストアA,-190,別の口座,食費,食費,架空データ,,audit-only-id",
      ].join("\n"),
    ),
  });
  await page.getByRole("button", { name: "取り込み用CSVの作成に戻る" }).click();

  await expect(page.getByText("読み込んだ明細", { exact: true })).toBeVisible();
  await expect(page.getByText("4件", { exact: true })).toBeVisible();
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
