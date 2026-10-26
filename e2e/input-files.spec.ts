import { expect, test } from "@playwright/test";
import { SHARED_FILE_DATABASE_NAME } from "../app/utils/shared-file-store";
import {
  addMfmeCsvs,
  answerNoMfmeHistory,
  auditMfmeCsv,
  importStep,
  mfmeHeader,
  openCleanPage,
  payPayCsv,
  readLocalState,
  readStoredInputFileNames,
  saveImport,
  selectPayPayCsv,
  startHeading,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await openCleanPage(page);
});

const registeredStep = (page: import("@playwright/test").Page) =>
  page.getByRole("region", { name: "登録済みの明細" });

test("入出金履歴のOKとNGを同時選択するとOKだけ保存する", async ({ page }) => {
  await selectPayPayCsv(page);
  await addMfmeCsvs(page, [
    { name: "valid-moneyforward.csv", csv: auditMfmeCsv },
    { name: "wrong-moneyforward.csv", csv: payPayCsv },
  ]);

  const region = registeredStep(page);
  await expect(
    region.getByRole("button", { name: "valid-moneyforward.csvを削除" }),
  ).toBeVisible();
  await expect(region.getByRole("alert")).toContainText(
    "wrong-moneyforward.csv",
  );
  await expect
    .poll(() => readStoredInputFileNames(page))
    .toEqual({
      payPay: "paypay-history.csv",
      mfme: ["valid-moneyforward.csv"],
    });

  await page.reload();
  await expect(region.getByText("入出金履歴 1ファイル")).toBeVisible();
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
  // PayPayの取引履歴が読み込めないため、最初の画面でエラーと読み込めた入出金履歴を示す。
  await expect(page.getByRole("heading", { name: startHeading })).toBeVisible();
  await expect(page.getByRole("main").getByRole("alert").last()).toContainText(
    "wrong-paypay.csv",
  );
  await expect(
    page.getByText(
      "MoneyForward MEの入出金履歴は1ファイルを読み込み済みです。",
    ),
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
  await answerNoMfmeHistory(page);
  await saveImport(page, "PayPay残高を取り込む");
  await expect
    .poll(async () => (await readLocalState(page))?.localImportedCounts.length)
    .toBe(2);

  await addMfmeCsvs(page, [{ name: "wrong-moneyforward.csv", csv: payPayCsv }]);
  await expect(registeredStep(page).getByRole("alert")).toContainText(
    "wrong-moneyforward.csv",
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect
    .poll(async () => (await readLocalState(page))?.localImportedCounts.length)
    .toBe(2);
});

test("記録がなければ確認せずに、入出金履歴をファイルごとに追加・削除する", async ({
  page,
}) => {
  const firstCsv = `${mfmeHeader}\n1,2025/12/31,架空商店A,-100,PayPay残高,食費,食費,メモ,,id-2025`;
  const secondCsv = `${mfmeHeader}\n1,2026/01/01,架空商店B,-200,PayPay残高,食費,食費,メモ,,id-2026`;
  await selectPayPayCsv(page);
  await addMfmeCsvs(page, [
    { name: "year-2025.csv", csv: firstCsv },
    { name: "year-2026.csv", csv: secondCsv },
  ]);
  const region = registeredStep(page);
  await expect(region.getByText("入出金履歴 2ファイル")).toBeVisible();
  await region.getByRole("button", { name: "管理" }).click();
  await expect(region.getByText("2025/12/31", { exact: true })).toBeVisible();
  await expect(region.getByText("2026/01/01", { exact: true })).toBeVisible();
  await region.getByRole("button", { name: "year-2025.csvを削除" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    region.getByRole("button", { name: "year-2025.csvを削除" }),
  ).toHaveCount(0);
  await expect(
    region.getByRole("button", { name: "year-2026.csvを削除" }),
  ).toBeVisible();
  await expect(region.getByText("入出金履歴 1ファイル")).toBeVisible();
  await expect
    .poll(() => readStoredInputFileNames(page))
    .toEqual({
      payPay: "paypay-history.csv",
      mfme: ["year-2026.csv"],
    });
});

test("記録があるときは入出金履歴の変更を確認し、やめれば何も変えない", async ({
  page,
}) => {
  await selectPayPayCsv(page);
  await addMfmeCsvs(page, [
    { name: "moneyforward-history.csv", csv: auditMfmeCsv },
  ]);
  await saveImport(page, "PayPay残高を取り込む");
  await expect
    .poll(async () => (await readLocalState(page))?.localImportedCounts.length)
    .toBe(1);

  // 同名・同内容でも入出金履歴の変更として扱う。
  await addMfmeCsvs(page, [
    { name: "moneyforward-history.csv", csv: auditMfmeCsv },
  ]);
  const dialog = page.getByRole("dialog", {
    name: "保存した明細の記録をリセットしますか？",
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText(
      "記録1件のうち0件は、変更後の入出金履歴に含まれています。",
    ),
  ).toBeVisible();
  await expect(
    dialog.getByText(/含まれていない1件（2025\/10\/24）/),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("mfme-change-confirm.png", {
    fullPage: true,
  });

  await dialog.getByRole("button", { name: "やめる" }).click();
  await expect(dialog).toHaveCount(0);
  await expect
    .poll(async () => (await readLocalState(page))?.localImportedCounts.length)
    .toBe(1);
  await expect(
    importStep(page).getByText("取り込みが完了しました", { exact: true }),
  ).toBeVisible();

  await registeredStep(page)
    .getByRole("button", { name: "moneyforward-history.csvを削除" })
    .click();
  await dialog.getByRole("button", { name: "リセットして削除する" }).click();
  await expect(page.getByRole("status")).toContainText(
    "以前の「保存した」記録をリセットしました",
  );
  // 記録・保存待ち・回答のどれも残らないため、保存値ごと削除される。
  await expect.poll(() => readLocalState(page)).toBeNull();
  await expect
    .poll(() => readStoredInputFileNames(page))
    .toEqual({ payPay: "paypay-history.csv", mfme: [] });
});

test("「ない」の回答はリロード後も残り、「ある」では入出金履歴を追加するまで手順3を表示しない", async ({
  page,
}) => {
  await selectPayPayCsv(page);
  await answerNoMfmeHistory(page);

  await page.reload();
  const region = registeredStep(page);
  await expect(
    region.getByText("登録したことはありません（すべての明細を取り込みます）"),
  ).toBeVisible();
  await expect(
    importStep(page).getByRole("button", { name: "PayPay残高を取り込む" }),
  ).toBeVisible();

  await region.getByRole("button", { name: "変更" }).click();
  await page.getByRole("radio", { name: /^ある/ }).check();
  await expect(
    importStep(page).getByText(
      "手順2で答えるか、入出金履歴を追加すると表示されます",
    ),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("step2-question.png", {
    fullPage: true,
  });

  await page.locator("#mfme-csv-input").setInputFiles({
    name: "moneyforward-history.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(auditMfmeCsv),
  });
  await expect(
    importStep(page).getByRole("button", { name: "PayPay残高を取り込む" }),
  ).toBeVisible();
});
