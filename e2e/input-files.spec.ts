import { expect, test } from "@playwright/test";
import { SHARED_FILE_DATABASE_NAME } from "../app/utils/shared-file-store";
import {
  auditMfmeCsv,
  mfmeHeader,
  openCleanPage,
  payPayCsv,
  readStoredInputFileNames,
  selectPayPayCsv,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await openCleanPage(page);
});

test("入出金履歴のOKとNGを同時選択するとOKだけ保存する", async ({ page }) => {
  await page.locator("#mfme-csv-input").setInputFiles([
    {
      name: "valid-moneyforward.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(auditMfmeCsv),
    },
    {
      name: "wrong-moneyforward.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(payPayCsv),
    },
  ]);

  const region = page.getByRole("region", {
    name: "MoneyForward MEから書き出した入出金履歴",
  });
  await expect(
    region.getByRole("button", { name: "valid-moneyforward.csvを削除" }),
  ).toBeVisible();
  await expect(region.getByRole("alert")).toContainText(
    "wrong-moneyforward.csv",
  );
  await expect
    .poll(() => readStoredInputFileNames(page))
    .toEqual({
      payPay: null,
      mfme: ["valid-moneyforward.csv"],
    });

  await page.reload();
  await expect(
    region.getByRole("button", { name: "valid-moneyforward.csvを削除" }),
  ).toBeVisible();
  await expect(region.getByRole("alert")).toHaveCount(0);
});

test("以前に保存されたNGファイルを再読み込み時に除外する", async ({ page }) => {
  await page.evaluate(
    async ({ databaseName, payPayContent, mfmeContent }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(databaseName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        await new Promise<void>((resolve, reject) => {
          const transaction = database.transaction("input-files", "readwrite");
          transaction.objectStore("input-files").put({
            id: "current",
            payPayFile: new File([mfmeContent], "wrong-paypay.csv"),
            mfmeFiles: [
              new File([mfmeContent], "valid-moneyforward.csv"),
              new File([payPayContent], "wrong-moneyforward.csv"),
            ],
            updatedAt: Date.now(),
          });
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        });
      } finally {
        database.close();
      }
    },
    {
      databaseName: SHARED_FILE_DATABASE_NAME,
      payPayContent: payPayCsv,
      mfmeContent: auditMfmeCsv,
    },
  );

  await page.reload();
  await expect(
    page
      .getByRole("region", { name: "PayPayから書き出した取引履歴" })
      .getByRole("alert"),
  ).toContainText("wrong-paypay.csv");
  await expect(
    page
      .getByRole("region", {
        name: "MoneyForward MEから書き出した入出金履歴",
      })
      .getByRole("button", { name: "valid-moneyforward.csvを削除" }),
  ).toBeVisible();
  await expect
    .poll(() => readStoredInputFileNames(page))
    .toEqual({
      payPay: null,
      mfme: ["valid-moneyforward.csv"],
    });
});

test("NGの入出金履歴だけを選んでも保存済みの記録を維持する", async ({
  page,
}) => {
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
    name: "wrong-moneyforward.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(payPayCsv),
  });
  await expect(
    page
      .getByRole("region", {
        name: "MoneyForward MEから書き出した入出金履歴",
      })
      .getByRole("alert"),
  ).toContainText("wrong-moneyforward.csv");
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("paypay-csv-optimizer:local-exclusion-state:v1"),
      ),
    )
    .not.toBeNull();
});

test("入出金履歴をファイルごとに削除して集計を更新する", async ({ page }) => {
  const firstCsv = `${mfmeHeader}\n1,2025/12/31,架空商店A,-100,PayPay残高,食費,食費,メモ,,id-2025`;
  const secondCsv = `${mfmeHeader}\n1,2026/01/01,架空商店B,-200,PayPay残高,食費,食費,メモ,,id-2026`;
  await page.locator("#mfme-csv-input").setInputFiles([
    {
      name: "year-2025.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(firstCsv),
    },
    {
      name: "year-2026.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(secondCsv),
    },
  ]);
  const region = page.getByRole("region", {
    name: "MoneyForward MEから書き出した入出金履歴",
  });
  await expect(region.getByText("2025/12/31", { exact: true })).toBeVisible();
  await expect(region.getByText("2026/01/01", { exact: true })).toBeVisible();
  await region.getByRole("button", { name: "year-2025.csvを削除" }).click();
  await expect(
    region.getByRole("button", { name: "year-2025.csvを削除" }),
  ).toHaveCount(0);
  await expect(
    region.getByRole("button", { name: "year-2026.csvを削除" }),
  ).toBeVisible();
  await expect(
    page.getByText("登録済みとして扱う明細").locator("..").getByText("1件"),
  ).toBeVisible();
  await expect
    .poll(() => readStoredInputFileNames(page))
    .toEqual({
      payPay: null,
      mfme: ["year-2026.csv"],
    });
});

test("同名・同内容のMFME CSV追加でも保存済み記録をリセットする", async ({
  page,
}) => {
  await selectPayPayCsv(page);
  await page.locator("#mfme-csv-input").setInputFiles({
    name: "moneyforward-history.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(auditMfmeCsv),
  });
  await page
    .getByRole("region", { name: "作成したファイル" })
    .getByRole("button", { name: "PayPay残高の現在残高を設定" })
    .click();
  await page.getByLabel("MoneyForward MEの現在残高").fill("5,000");
  await page.getByRole("button", { name: "保存" }).click();
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
      page.evaluate(() => {
        const value = localStorage.getItem(
          "paypay-csv-optimizer:local-exclusion-state:v1",
        );
        if (!value) return null;
        return JSON.parse(value) as {
          localImportedCounts: [string, number][];
          accountBalances: [string, { amount: number; updatedAt: number }][];
        };
      }),
    )
    .toMatchObject({
      localImportedCounts: [],
      accountBalances: [["PayPay残高", { amount: 4810 }]],
    });
  const mfmeInputRegion = page.getByRole("region", {
    name: "MoneyForward MEから書き出した入出金履歴",
  });
  await expect(
    mfmeInputRegion.getByRole("button", {
      name: "moneyforward-history.csvを削除",
    }),
  ).toBeVisible();
  await expect(page.getByText("moneyforward-history.csv")).toBeVisible();
});
