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
    page.getByRole("heading", {
      name: "MoneyForward MEに取り込むファイルを作る",
    }),
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
      .getByRole("region", { name: "PayPayから書き出した取引履歴" })
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
  await page.waitForURL((url) => !url.searchParams.has("shared-files"));
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

test("作成結果と保存確認モーダルを表示できる", async ({ page }) => {
  await selectPayPayCsv(page);

  await expect(
    page.getByRole("heading", { name: "作成したファイル" }),
  ).toBeVisible();
  await expect(
    page.getByText("PayPayの取引をすべて出力しています"),
  ).toBeVisible();
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
    page.getByRole("heading", {
      name: "MoneyForward MEに取り込む",
      exact: true,
    }),
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

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page).toHaveScreenshot("import-guide-modal-mobile.png", {
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.getByRole("button", { name: "MoneyForward MEで保存した" }).click();
  await expect(
    page.getByRole("button", { name: "取り込みました" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "重複登録・口座間違いを探す" })
    .click();
  await expect(
    page.getByRole("button", { name: "取り込みました" }),
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByText("このアプリの取り込み記録との一致: 2件", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "内訳を見る" }).click();
  const importedRecordDetails = page
    .getByText("このアプリの取り込み記録", { exact: true })
    .locator("..");
  await expect(importedRecordDetails).toBeVisible();
  await expect(
    importedRecordDetails.getByText("2025/09/29～2025/10/24"),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("registered-record-breakdown.png", {
    fullPage: true,
  });
  await expect(
    page.getByRole("button", { name: "取り込みました" }),
  ).toHaveCount(0);
});

test("分割チャンクの一部を取り込んでも残りのチャンクを維持する", async ({
  page,
}) => {
  await page.locator("#paypay-csv-input").setInputFiles({
    name: "paypay-history-157.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(createChunkedPayPayCsv(157)),
  });
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

test("MoneyForward MEの入出金履歴を先に選んでもPayPayの取引履歴を案内する", async ({
  page,
}) => {
  await page.locator("#mfme-csv-input").setInputFiles({
    name: "moneyforward-history.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(auditMfmeCsv),
  });

  await expect(
    page.getByText("moneyforward-history.csv", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "PayPayから書き出した取引履歴を選んでください",
    }),
  ).toBeVisible();
  await expect(page.getByText("登録済みとして扱う明細")).toBeVisible();
  await expect(page).toHaveScreenshot("mfme-loaded-before-paypay.png", {
    fullPage: true,
  });

  await page.reload();

  await expect(
    page.getByText("moneyforward-history.csv", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "PayPayから書き出した取引履歴を選んでください",
    }),
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
    "MoneyForward MEから書き出した入出金履歴を読み込めませんでした",
  );
  await page
    .getByRole("region", {
      name: "MoneyForward MEから書き出した入出金履歴",
    })
    .getByRole("button", { name: "削除", exact: true })
    .click();

  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator("#mfme-csv-input")).toBeAttached();
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
  await expect(
    page
      .getByText("登録済みとして扱う明細")
      .locator("..")
      .getByText("1件", { exact: true }),
  ).toBeVisible();

  await shareCsvThroughTarget(
    page,
    "shared-mfme-2026",
    "収入・支出詳細_2026.csv",
    mfme2026Csv,
  );
  await expect(
    page
      .getByText("登録済みとして扱う明細")
      .locator("..")
      .getByText("2件", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByText("登録済みとして扱う明細")
      .locator("..")
      .getByText("2025/12/31～2026/01/01"),
  ).toBeVisible();

  await shareCsvThroughTarget(
    page,
    "shared-mfme-2026-again",
    "収入・支出詳細_2026.csv",
    mfme2026Csv,
  );
  await expect(page.getByText("2ファイル", { exact: true })).toBeVisible();

  await page
    .getByRole("button", { name: "重複登録・口座間違いを探す" })
    .click();
  await expect(page.getByText("2ファイル", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByText("2ファイル", { exact: true })).toBeVisible();
});

test("Share Target復元中のPayPay選択を上書きしない", async ({ page }) => {
  await shareCsvThroughTarget(
    page,
    "shared-mfme-concurrent-input",
    "収入・支出詳細.csv",
    auditMfmeCsv,
  );

  await page.locator("#paypay-csv-input").setInputFiles({
    name: "paypay-selected-during-restore.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(payPayCsv),
  });

  await expect(page.getByText("収入・支出詳細.csv")).toBeVisible();
  await expect(
    page.getByText("paypay-selected-during-restore.csv"),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("収入・支出詳細.csv")).toBeVisible();
  await expect(
    page.getByText("paypay-selected-during-restore.csv"),
  ).toBeVisible();
});

test("MFME CSVの入れ替えで保存済み記録をリセットする", async ({ page }) => {
  await selectPayPayCsv(page);
  await page.getByRole("button", { name: "取り込む" }).first().click();
  await page.getByRole("button", { name: "MoneyForward MEで保存した" }).click();

  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("paypay-csv-optimizer:local-exclusion-state:v1"),
      ),
    )
    .not.toBeNull();

  await page.locator("#mfme-csv-input").setInputFiles({
    name: "moneyforward-history.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(auditMfmeCsv),
  });

  await expect(page.getByRole("status")).toContainText(
    "以前の「保存した」記録をリセットしました",
  );
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("paypay-csv-optimizer:local-exclusion-state:v1"),
      ),
    )
    .toBeNull();
});

test("同じMFME CSVの再共有では保存済み記録を維持する", async ({ page }) => {
  await shareCsvThroughTarget(
    page,
    "shared-mfme-before-import",
    "収入・支出詳細.csv",
    auditMfmeCsv,
  );
  await expect(page.getByText("収入・支出詳細.csv")).toBeVisible();
  await selectPayPayCsv(page);
  await page.getByRole("button", { name: "取り込む" }).first().click();
  await page.getByRole("button", { name: "MoneyForward MEで保存した" }).click();

  const savedState = await page.evaluate(() =>
    localStorage.getItem("paypay-csv-optimizer:local-exclusion-state:v1"),
  );
  expect(savedState).not.toBeNull();

  await shareCsvThroughTarget(
    page,
    "shared-mfme-duplicate",
    "名前だけ変更.csv",
    auditMfmeCsv,
  );

  await expect(page.getByText("収入・支出詳細.csv")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("paypay-csv-optimizer:local-exclusion-state:v1"),
      ),
    )
    .toBe(savedState);
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
    .getByRole("button", { name: "重複登録・口座間違いを探す" })
    .click();

  await expect(
    page.getByRole("heading", { name: "要確認明細 2件" }),
  ).toBeVisible();
});

test("PayPayの取引履歴を先に選んでも実際の除外件数を表示する", async ({
  page,
}) => {
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
    page.getByText("入出金履歴との一致: 2件", { exact: true }),
  ).toBeVisible();

  await page.reload();

  await expect(
    page.getByText("登録済みの明細 2件を除外しました", { exact: true }),
  ).toBeVisible();
});

test("同一ページの作成結果と修正候補で同じ入出金履歴を使用する", async ({
  page,
}) => {
  await page.locator("#mfme-csv-input").setInputFiles({
    name: "saved-moneyforward-history.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(auditMfmeCsv),
  });
  await page
    .getByRole("button", { name: "重複登録・口座間違いを探す" })
    .click();
  await expect(page.getByText("saved-moneyforward-history.csv")).toBeVisible();
  await expect(
    page.getByText("MoneyForward MEから書き出した入出金履歴"),
  ).toBeVisible();
});

test("重複登録と口座間違いの候補を表示できる", async ({ page }) => {
  await page
    .getByRole("button", { name: "重複登録・口座間違いを探す" })
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
