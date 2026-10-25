import { expect, test } from "@playwright/test";
import {
  auditMfmeCsv,
  createChunkedPayPayCsv,
  openCleanPage,
  selectPayPayCsv,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await openCleanPage(page);
});

test("作成結果と共有・保存確認モーダルを表示できる", async ({ page }) => {
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
  const importDialog = page.getByRole("dialog", {
    name: "MoneyForward MEに取り込む",
  });
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

test("共有後に再読み込みすると保存待ちの確認を強制表示する", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-07-25T06:00:00.000Z"));
  await selectPayPayCsv(page);
  await page.getByRole("button", { name: "取り込む" }).first().click();
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
  await expect(
    page.getByText("このアプリの取り込み記録との一致: 2件", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("pp2mf-paypay残高.csv", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("1ファイル中0ファイルを取り込みました", { exact: true }),
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByText("このアプリの取り込み記録との一致: 2件", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("「取り込みをやめる」を選ぶと記録せずに出力へ残す", async ({ page }) => {
  await selectPayPayCsv(page);
  await page.getByRole("button", { name: "取り込む" }).first().click();
  await page.getByRole("button", { name: "取り込みをやめる" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "取り込む" })).toHaveCount(2);
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("paypay-csv-optimizer:local-exclusion-state:v1"),
      ),
    )
    .toBeNull();

  await page.reload();
  await expect(page.getByRole("button", { name: "取り込む" })).toHaveCount(2);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("共有シートを閉じると保存待ちを残さない", async ({ page }) => {
  await selectPayPayCsv(page);
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

  await page.getByRole("button", { name: "取り込む" }).first().click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("paypay-csv-optimizer:local-exclusion-state:v1"),
      ),
    )
    .toBeNull();
  await page.reload();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("保存確認後の取り込み記録を再読み込みして表示できる", async ({ page }) => {
  await selectPayPayCsv(page);
  await page.getByRole("button", { name: "取り込む" }).first().click();

  await page.getByRole("button", { name: "MoneyForward MEで保存した" }).click();
  await expect(
    page.getByRole("button", { name: "取り込みました" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "重複登録・口座間違いを確認する" })
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

test("口座ごとに現在残高と取り込み後の見込みを管理できる", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-07-25T06:00:00.000Z"));
  await selectPayPayCsv(page);

  const outputRegion = page.getByRole("region", { name: "作成したファイル" });
  const balanceGroup = outputRegion
    .getByRole("heading", { name: "PayPay残高" })
    .locator("../..");
  await expect(
    outputRegion.getByRole("heading", { name: "PayPayポイント" }),
  ).toBeVisible();
  await expect(
    outputRegion.getByRole("button", {
      name: "VISA 1234の現在残高を設定",
    }),
  ).toHaveCount(0);

  await balanceGroup
    .getByRole("button", { name: "PayPay残高の現在残高を設定" })
    .click();
  const balanceInput = balanceGroup.getByLabel("MoneyForward MEの現在残高");
  await balanceInput.fill("1.5");
  await balanceGroup.getByRole("button", { name: "保存" }).click();
  await expect(balanceGroup.getByRole("alert")).toHaveText(
    "残高は整数で入力してください。",
  );
  await balanceInput.fill("5,000");
  await balanceGroup.getByRole("button", { name: "保存" }).click();

  await expect(balanceGroup.getByText("￥5,000")).toBeVisible();
  await expect(balanceGroup.getByText("￥4,493")).toBeVisible();
  await expect(page).toHaveScreenshot("account-balances.png", {
    fullPage: true,
  });
});

test("残高設定の解除と取り込み後の保存を反映する", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-07-25T06:00:00.000Z"));
  await selectPayPayCsv(page);
  const balanceGroup = page
    .getByRole("region", { name: "作成したファイル" })
    .getByRole("heading", { name: "PayPay残高" })
    .locator("../..");
  await balanceGroup
    .getByRole("button", { name: "PayPay残高の現在残高を設定" })
    .click();
  await balanceGroup.getByLabel("MoneyForward MEの現在残高").fill("5,000");
  await balanceGroup.getByRole("button", { name: "保存" }).click();

  await balanceGroup
    .getByRole("button", { name: "PayPay残高の現在残高を編集" })
    .click();
  await balanceGroup
    .getByRole("button", { name: "PayPay残高の残高設定を解除" })
    .click();
  await balanceGroup
    .getByRole("button", { name: "PayPay残高の現在残高を設定" })
    .click();
  await balanceGroup.getByLabel("MoneyForward MEの現在残高").fill("5,000");
  await balanceGroup.getByRole("button", { name: "保存" }).click();

  await expect(
    page.getByRole("region", { name: "作成したファイル" }).getByRole("button", {
      name: "VISA 1234の現在残高を設定",
    }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "取り込む" }).first().click();
  await page.getByRole("button", { name: "MoneyForward MEで保存した" }).click();

  await expect(balanceGroup.getByText("￥4,493")).toHaveCount(1);

  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const value = localStorage.getItem(
          "paypay-csv-optimizer:local-exclusion-state:v1",
        );
        if (!value) return null;
        return (
          JSON.parse(value) as {
            accountBalances: [string, { amount: number; updatedAt: number }][];
          }
        ).accountBalances;
      }),
    )
    .toMatchObject([["PayPay残高", { amount: 4493 }]]);
});

test("分割チャンクの一部を取り込んでも残りのチャンクを維持する", async ({
  page,
}) => {
  await page.locator("#paypay-csv-input").setInputFiles({
    name: "paypay-history-157.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(createChunkedPayPayCsv(157)),
  });
  await expect(
    page.getByText("pp2mf-paypay残高_part1.csv", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("pp2mf-paypay残高_part2.csv", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("2ファイル中0ファイルを取り込みました", { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "取り込む" }).first().click();
  await page.getByRole("button", { name: "MoneyForward MEで保存した" }).click();

  await expect(
    page.getByText("pp2mf-paypay残高_part1.csv", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("pp2mf-paypay残高_part2.csv", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "取り込みました" }),
  ).toHaveCount(1);
  await expect(page.getByRole("button", { name: "取り込む" })).toHaveCount(1);
  await expect(
    page.getByText("2ファイル中1ファイルを取り込みました", { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "取り込む" }).click();
  await expect(
    page.getByRole("button", { name: "MoneyForward MEで保存した" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "MoneyForward MEで保存した" }).click();
  await expect(
    page.getByRole("button", { name: "取り込みました" }),
  ).toHaveCount(2);
  await expect(
    page.getByText("すべてのファイルを取り込みました", { exact: true }),
  ).toBeVisible();
});

test("途中のファイルで離脱しても再起動後に残りのファイルだけを作り直す", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-07-25T06:00:00.000Z"));
  await page.locator("#paypay-csv-input").setInputFiles({
    name: "paypay-history-257.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(createChunkedPayPayCsv(257)),
  });
  await expect(
    page.getByText("3ファイル中0ファイルを取り込みました", { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "取り込む" }).first().click();
  await page.getByRole("button", { name: "MoneyForward MEで保存した" }).click();
  await page.getByRole("button", { name: "取り込む" }).first().click();
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
    page.getByText("このアプリの取り込み記録との一致: 200件", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("pp2mf-paypay残高.csv", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("1ファイル中0ファイルを取り込みました", { exact: true }),
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
