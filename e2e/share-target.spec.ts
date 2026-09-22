import { expect, test } from "@playwright/test";
import {
  mfmeHeader,
  openCleanPage,
  payPayCsv,
  selectPayPayCsv,
  shareCsvThroughTarget,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await openCleanPage(page);
});

test("画面選択とShare TargetからMFME CSVを年ごとに追加できる", async ({
  page,
}) => {
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
  await expect(page.getByText("収入・支出詳細_2025.csv")).toBeVisible();

  await page.locator("#mfme-csv-input").setInputFiles({
    name: "収入・支出詳細_2026.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(mfme2026Csv),
  });
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
  await expect(page.getByText("収入・支出詳細_2025.csv")).toBeVisible();
  await expect(page.getByText("収入・支出詳細_2026.csv")).toBeVisible();

  await shareCsvThroughTarget(
    page,
    "shared-mfme-2026-again",
    "収入・支出詳細_2026.csv",
    mfme2026Csv,
  );
  await expect(
    page.getByRole("button", { name: "収入・支出詳細_2025.csvを削除" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "収入・支出詳細_2026.csvを削除" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "重複登録・口座間違いを確認する" })
    .click();
  await expect(
    page.getByRole("button", { name: "収入・支出詳細_2026.csvを削除" }),
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("button", { name: "収入・支出詳細_2026.csvを削除" }),
  ).toBeVisible();
});

test("PP2MFで作成したCSVの自己共有を拒否する", async ({ page }) => {
  await selectPayPayCsv(page);

  await shareCsvThroughTarget(
    page,
    "shared-pp2mf-output",
    "pp2mf-paypay残高.csv",
    payPayCsv,
  );

  await expect(page.getByRole("alert")).toHaveText(
    "PP2MFで作成したCSVは読み込みませんでした。共有先にはPP2MFではなくMoneyForward MEを選択してください。",
  );
  await expect(
    page
      .getByRole("region", { name: "PayPayから書き出した取引履歴" })
      .getByText("paypay-history.csv", { exact: true }),
  ).toBeVisible();

  await page.reload();
  await expect(
    page
      .getByRole("region", { name: "PayPayから書き出した取引履歴" })
      .getByText("paypay-history.csv", { exact: true }),
  ).toBeVisible();
});
