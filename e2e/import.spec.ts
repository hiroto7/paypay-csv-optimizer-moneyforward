import { expect, test } from "@playwright/test";
import {
  addMfmeCsvs,
  answerNoMfmeHistory,
  auditMfmeCsv,
  createChunkedPayPayCsv,
  holdShareSheet,
  importStep,
  openCleanPage,
  payPayCsv,
  readLocalState,
  resolveShareSheet,
  saveImport,
  selectPayPayCsv,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await openCleanPage(page);
});

test("作成結果と共有・保存確認モーダルを表示できる", async ({ page }) => {
  await selectPayPayCsv(page);
  await answerNoMfmeHistory(page);

  const step = importStep(page);
  await expect(
    step.getByText("取り込み対象の明細3件を取り込みます", { exact: true }),
  ).toBeVisible();
  await expect(step.getByText("0 / 2 口座")).toBeVisible();
  await expect(page).toHaveScreenshot("conversion-result.png", {
    fullPage: true,
  });

  await holdShareSheet(page);
  await step.getByRole("button", { name: "PayPay残高を取り込む" }).click();
  const importDialog = page.getByRole("dialog", {
    name: "MoneyForward MEに取り込む",
  });
  await expect(importDialog).toBeVisible();
  await expect(
    importDialog.getByText("共有シートでMoneyForward MEを選ぶ"),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("share-guide-modal.png", {
    fullPage: true,
  });

  await resolveShareSheet(page);
  await expect(
    importDialog.getByRole("button", { name: "MoneyForward MEで保存した" }),
  ).toBeVisible();
  await expect(
    importDialog.getByText(
      "この2件をこの端末に記録し、次回からは自動で除外します。押さないと、次回も取り込み用CSVに含まれます。",
    ),
  ).toBeVisible();
  await expect(
    importDialog.getByRole("button", { name: "取り込みをやめる" }),
  ).toBeVisible();
  await expect(
    importDialog.getByRole("button", { name: "閉じる" }),
  ).toHaveCount(0);
  await expect(page).toHaveScreenshot("import-guide-modal.png", {
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page).toHaveScreenshot("import-guide-modal-mobile.png", {
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });

  // 連続したEscキーは取り消せないcancelになるため、2回押しても閉じないことを確かめる。
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(importDialog).toBeVisible();
});

test("共有後に再読み込みすると保存待ちの確認を強制表示し、保存済みを復元する", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-07-25T06:00:00.000Z"));
  await selectPayPayCsv(page);
  await answerNoMfmeHistory(page);
  await importStep(page)
    .getByRole("button", { name: "PayPay残高を取り込む" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "MoneyForward MEに取り込む" }),
  ).toBeVisible();

  await page.reload();
  const resumedDialog = page.getByRole("dialog", {
    name: "前回の取り込みを保存しましたか？",
  });
  await expect(resumedDialog).toBeVisible();
  await expect(
    resumedDialog.getByText(
      "覚えていない場合は、MoneyForward MEで「PayPay残高」の明細を開き、次の明細があるか確かめてください。",
    ),
  ).toBeVisible();
  await expect(
    resumedDialog.getByText(
      "7月25日 15:00に「PayPay残高」の明細2件を共有しましたが、「MoneyForward MEで保存した」が押されていません。",
    ),
  ).toBeVisible();
  const transactionRows = resumedDialog.getByRole("listitem");
  await expect(transactionRows).toHaveCount(2);
  await expect(transactionRows.nth(0)).toHaveText(
    "2025/10/24ダミーストアA-190円",
  );
  await expect(transactionRows.nth(1)).toHaveText(
    "2025/09/29ダミーストアB-317円",
  );
  await expect(page).toHaveScreenshot("import-confirmation-resumed.png", {
    fullPage: true,
  });

  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(resumedDialog).toBeVisible();

  await resumedDialog
    .getByRole("button", { name: "MoneyForward MEで保存した" })
    .click();
  await expect(resumedDialog).toHaveCount(0);
  const step = importStep(page);
  await expect(step.getByText("1 / 2 口座")).toBeVisible();
  await expect(
    step.getByRole("button", { name: "PayPay残高を取り込む" }),
  ).toHaveCount(0);
  await expect(
    step.getByRole("button", { name: "PayPayポイントを取り込む" }),
  ).toBeVisible();

  await page.reload();
  await expect(step.getByText("1 / 2 口座")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("「取り込みをやめる」を選ぶと記録せずに出力へ残す", async ({ page }) => {
  await selectPayPayCsv(page);
  await answerNoMfmeHistory(page);
  await importStep(page)
    .getByRole("button", { name: "PayPay残高を取り込む" })
    .click();
  await page.getByRole("button", { name: "取り込みをやめる" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    importStep(page).getByRole("button", { name: /を取り込む$/ }),
  ).toHaveCount(2);
  await expect
    .poll(() => readLocalState(page))
    .toMatchObject({ localImportedCounts: [], pendingImport: null });

  await page.reload();
  await expect(
    importStep(page).getByRole("button", { name: /を取り込む$/ }),
  ).toHaveCount(2);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("共有シートを閉じると保存待ちを残さない", async ({ page }) => {
  await selectPayPayCsv(page);
  await answerNoMfmeHistory(page);
  await page.evaluate(() => {
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => true,
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: () =>
        Promise.reject(new DOMException("Share canceled", "AbortError")),
    });
  });

  await importStep(page)
    .getByRole("button", { name: "PayPay残高を取り込む" })
    .click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect
    .poll(() => readLocalState(page))
    .toMatchObject({ pendingImport: null });
  await page.reload();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("保存した口座はリロード後も保存済みのまま、すべて保存すると完了を表示する", async ({
  page,
}) => {
  await selectPayPayCsv(page);
  await answerNoMfmeHistory(page);
  const step = importStep(page);
  await saveImport(page, "PayPay残高を取り込む");
  await expect(step.getByText("1 / 2 口座")).toBeVisible();

  await page.reload();
  await expect(step.getByText("1 / 2 口座")).toBeVisible();
  await expect(step.getByText("保存済み").first()).toBeVisible();
  const registeredStep = page.getByRole("region", { name: "登録済みの明細" });
  await expect(registeredStep.getByText("保存した明細 2件")).toBeVisible();
  await registeredStep.getByRole("button", { name: "管理" }).click();
  await expect(
    registeredStep.getByText("2025/09/29～2025/10/24"),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("registered-record-breakdown.png", {
    fullPage: true,
  });

  await saveImport(page, "PayPayポイントを取り込む");
  await expect(
    step.getByText("取り込みが完了しました", { exact: true }),
  ).toBeVisible();
  await expect(step.getByText("2 / 2 口座を保存しました")).toBeVisible();
  await page.reload();
  await expect(
    step.getByText("取り込みが完了しました", { exact: true }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("import-complete.png", {
    fullPage: true,
  });

  // 次の取引履歴は、保存した明細を除外して新しい明細だけを作る。
  await page.locator("#paypay-csv-input-next").setInputFiles({
    name: "paypay-history-next.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      `${payPayCsv}\n2025/10/26 09:00:00,500,-,-,-,-,-,支払い,ダミーストアE,PayPay残高,-,-,00000000000000000006`,
    ),
  });
  await expect(
    step.getByText("取り込み対象の明細4件のうち、1件を取り込みます", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(step.getByText("前回までに保存した明細")).toBeVisible();
  await expect(step.getByText("0 / 1 口座")).toBeVisible();
});

test("分割した取り込み用CSVの一部を保存しても、残りを維持する", async ({
  page,
}) => {
  await selectPayPayCsv(
    page,
    createChunkedPayPayCsv(157),
    "paypay-history-157.csv",
  );
  await answerNoMfmeHistory(page);
  const step = importStep(page);
  await expect(
    step.getByRole("button", { name: "PayPay残高 1/2を取り込む" }),
  ).toBeVisible();

  await saveImport(page, "PayPay残高 1/2を取り込む");

  await expect(
    step.getByRole("button", { name: "PayPay残高 1/2を取り込む" }),
  ).toHaveCount(0);
  await expect(
    step.getByRole("button", { name: "PayPay残高 2/2を取り込む" }),
  ).toBeVisible();

  await saveImport(page, "PayPay残高 2/2を取り込む");
  await expect(
    step.getByText("取り込みが完了しました", { exact: true }),
  ).toBeVisible();
});

test("途中のファイルで離脱しても、再起動後に保存状況を復元する", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-07-25T06:00:00.000Z"));
  await selectPayPayCsv(
    page,
    createChunkedPayPayCsv(257),
    "paypay-history-257.csv",
  );
  await answerNoMfmeHistory(page);
  const step = importStep(page);

  await saveImport(page, "PayPay残高 1/3を取り込む");
  await step.getByRole("button", { name: "PayPay残高 2/3を取り込む" }).click();
  await expect(
    page.getByRole("dialog", { name: "MoneyForward MEに取り込む" }),
  ).toBeVisible();

  await page.reload();
  const resumedDialog = page.getByRole("dialog", {
    name: "前回の取り込みを保存しましたか？",
  });
  await expect(
    resumedDialog.getByText(
      "7月25日 15:00に「PayPay残高」の明細100件を共有しましたが、「MoneyForward MEで保存した」が押されていません。",
    ),
  ).toBeVisible();
  // 新しい順の3件だけを示し、残りは同じ一覧の続きとして開く。
  await expect(resumedDialog.getByRole("listitem")).toHaveCount(3);
  await expect(page).toHaveScreenshot("import-confirmation-resumed-many.png", {
    fullPage: true,
  });
  await resumedDialog.getByRole("button", { name: "残り97件を表示" }).click();
  await expect(resumedDialog.getByRole("listitem")).toHaveCount(100);
  await resumedDialog
    .getByRole("button", { name: "MoneyForward MEで保存した" })
    .click();

  await expect(
    step.getByRole("button", { name: "PayPay残高 1/3を取り込む" }),
  ).toHaveCount(0);
  await expect(
    step.getByRole("button", { name: "PayPay残高 2/3を取り込む" }),
  ).toHaveCount(0);
  await expect(
    step.getByRole("button", { name: "PayPay残高 3/3を取り込む" }),
  ).toBeVisible();
});

test("PayPayの取引履歴を先に選んでも実際の除外件数を表示する", async ({
  page,
}) => {
  await selectPayPayCsv(page);
  await addMfmeCsvs(page, [
    { name: "moneyforward-history.csv", csv: auditMfmeCsv },
  ]);

  const step = importStep(page);
  await expect(
    step.getByText("取り込み対象の明細3件のうち、1件を取り込みます", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    step
      .getByRole("listitem")
      .filter({ hasText: "入出金履歴に登録済みの明細" }),
  ).toContainText("2件を除外");

  await page.reload();

  await expect(
    step.getByText("取り込み対象の明細3件のうち、1件を取り込みます", {
      exact: true,
    }),
  ).toBeVisible();
});
