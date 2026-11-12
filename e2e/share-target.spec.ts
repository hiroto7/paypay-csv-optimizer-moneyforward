import { expect, test } from "@playwright/test";
import {
  addMfmeCsvs,
  answerNoMfmeHistory,
  auditMfmeCsv,
  countSharedFileRecords,
  importStep,
  mfmeHeader,
  openCleanPage,
  openSharedFiles,
  payPayCsv,
  payPayStep,
  putSharedFiles,
  readLocalState,
  readStoredInputFileNames,
  saveImport,
  selectPayPayCsv,
  shareCsvThroughTarget,
  sharedFilesDialog,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await openCleanPage(page);
});

const mfme2025Csv = [
  mfmeHeader,
  "1,2025/12/31,ダミーストア2025,-100,PayPay残高,食費,食費,架空データ,,dummy-2025",
].join("\n");
const mfme2026Csv = [
  mfmeHeader,
  "1,2026/01/01,ダミーストア2026,-200,PayPay残高,食費,食費,架空データ,,dummy-2026",
].join("\n");

test("画面選択とShare Targetから入出金履歴を年ごとに追加できる", async ({
  page,
}) => {
  await shareCsvThroughTarget(
    page,
    "shared-mfme-2025",
    "収入・支出詳細_2025.csv",
    mfme2025Csv,
  );
  await expect
    .poll(() => readStoredInputFileNames(page))
    .toEqual({ payPay: null, mfme: ["収入・支出詳細_2025.csv"] });

  await selectPayPayCsv(page);
  const registeredStep = page.getByRole("region", { name: "登録済みの明細" });
  await expect(registeredStep.getByText("入出金履歴 1ファイル")).toBeVisible();
  await addMfmeCsvs(page, [
    { name: "収入・支出詳細_2026.csv", csv: mfme2026Csv },
  ]);
  await expect(registeredStep.getByText("入出金履歴 2ファイル")).toBeVisible();
  await expect(
    registeredStep.getByText("2025/12/31～2026/01/01"),
  ).toBeVisible();

  await openSharedFiles(page, "shared-mfme-2026-again", [
    { name: "収入・支出詳細_2026.csv", csv: mfme2026Csv },
  ]);
  const dialog = sharedFilesDialog(page);
  await expect(
    dialog.getByText("同じ名前のファイルと置き換えます。"),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "読み込む", exact: true }).click();
  await expect(registeredStep.getByText("入出金履歴 2ファイル")).toBeVisible();

  await page.reload();
  await expect(registeredStep.getByText("入出金履歴 2ファイル")).toBeVisible();
  await expect
    .poll(() => readStoredInputFileNames(page))
    .toEqual({
      payPay: "paypay-history.csv",
      mfme: ["収入・支出詳細_2025.csv", "収入・支出詳細_2026.csv"],
    });
});

test("受け取ったファイルの扱いを確認し、やめれば何も変えない", async ({
  page,
}) => {
  await selectPayPayCsv(page);
  await answerNoMfmeHistory(page);
  await saveImport(page, "PayPay残高を取り込む");

  const files = [
    { name: "paypay-old.csv", csv: payPayCsv },
    {
      name: "paypay-new.csv",
      csv: `${payPayCsv}\n2025/11/24 09:00:00,500,-,-,-,-,-,支払い,ダミーストアE,PayPay残高,-,-,00000000000000000006`,
    },
    { name: "収入・支出詳細_2025.csv", csv: auditMfmeCsv },
    { name: "memo.csv", csv: "列A,列B\n1,2" },
    { name: "pp2mf-paypay残高.csv", csv: payPayCsv },
  ];
  await openSharedFiles(page, "shared-mixed", files);
  const dialog = sharedFilesDialog(page);
  await expect(dialog).toHaveAccessibleName("2件を読み込みますか？");
  await expect(dialog.getByText("paypay-new.csv")).toBeVisible();
  await expect(dialog).toContainText(
    "paypay-old.csv：期間が古い取引履歴です。",
  );
  await expect(dialog).toContainText(
    "memo.csv：対応していないCSVファイルです。",
  );
  await expect(dialog).toContainText(
    "pp2mf-paypay残高.csv：PP2MFで作成したCSVです。",
  );
  await expect(dialog).toContainText(
    "保存した明細の記録をリセットします入出金履歴を変更すると、「MoneyForward MEで保存した」記録（2件）をリセットします。正しく照合できるよう、今回のファイル以外も含めて、前回書き出したあとに変わった入出金履歴は、MoneyForward MEから最新のものを書き出し直して追加してください。",
  );
  await expect(page).toHaveScreenshot("shared-files-confirm.png", {
    fullPage: true,
  });

  await dialog.getByRole("button", { name: "やめる" }).click();
  await expect(dialog).toHaveCount(0);
  await page.waitForURL((url) => !url.searchParams.has("shared-files"));
  await expect.poll(() => countSharedFileRecords(page)).toBe(0);
  await expect
    .poll(() => readStoredInputFileNames(page))
    .toEqual({ payPay: "paypay-history.csv", mfme: [] });
  await expect
    .poll(async () => (await readLocalState(page))?.localImportedCounts.length)
    .toBe(2);

  await openSharedFiles(page, "shared-mixed-again", files);
  await sharedFilesDialog(page)
    .getByRole("button", { name: "リセットして読み込む" })
    .click();
  await expect(payPayStep(page).getByText("paypay-new.csv")).toBeVisible();
  await expect
    .poll(() => readStoredInputFileNames(page))
    .toEqual({ payPay: "paypay-new.csv", mfme: ["収入・支出詳細_2025.csv"] });
  await expect
    .poll(() => readLocalState(page))
    .toMatchObject({ localImportedCounts: [], currentWork: null });
});

test("保存待ちがなければ、PP2MFで作成したCSVを読み込まないファイルとして示す", async ({
  page,
}) => {
  await selectPayPayCsv(page);

  await openSharedFiles(page, "shared-pp2mf-output", [
    { name: "pp2mf-paypay残高.csv", csv: payPayCsv },
  ]);
  const dialog = sharedFilesDialog(page);
  await expect(dialog).toHaveAccessibleName(
    "共有されたファイルを読み込めませんでした",
  );
  await dialog.getByRole("button", { name: "閉じる" }).last().click();
  await expect(payPayStep(page).getByText("paypay-history.csv")).toBeVisible();

  await page.reload();
  await expect(payPayStep(page).getByText("paypay-history.csv")).toBeVisible();
});

test("保存待ちの確認が終わるまで受け取ったファイルを残し、答えたあとで読み込む", async ({
  page,
}) => {
  await selectPayPayCsv(page);
  await answerNoMfmeHistory(page);
  await importStep(page)
    .getByRole("button", { name: "PayPay残高を取り込む" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "MoneyForward MEに取り込む" }),
  ).toBeVisible();

  await openSharedFiles(page, "shared-while-pending", [
    { name: "収入・支出詳細_2025.csv", csv: mfme2025Csv },
  ]);
  const resumedDialog = page.getByRole("dialog", {
    name: "前回の取り込みを保存しましたか？",
  });
  const deferredNotice =
    "共有されたファイル（収入・支出詳細_2025.csv）は、この確認のあとで読み込みます。";
  await expect(resumedDialog.getByText(deferredNotice)).toBeVisible();
  expect(new URL(page.url()).searchParams.get("shared-files")).toBe(
    "shared-while-pending",
  );

  // 答える前にリロードしても、受け取ったファイルは残る。
  await page.reload();
  await expect(resumedDialog.getByText(deferredNotice)).toBeVisible();
  await resumedDialog.getByRole("button", { name: "保存していない" }).click();

  const dialog = sharedFilesDialog(page);
  await expect(dialog.getByText("収入・支出詳細_2025.csv")).toBeVisible();
  await dialog.getByRole("button", { name: "読み込む", exact: true }).click();
  await page.waitForURL((url) => !url.searchParams.has("shared-files"));
  await expect
    .poll(() => readStoredInputFileNames(page))
    .toEqual({
      payPay: "paypay-history.csv",
      mfme: ["収入・支出詳細_2025.csv"],
    });
  await expect.poll(() => countSharedFileRecords(page)).toBe(0);
});

test("保存待ちの間に取り込み用CSVを受け取ったら、共有先の誤りを案内して共有し直せる", async ({
  context,
  page,
}) => {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => true,
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async () => {
        (window as typeof window & { shareCount?: number }).shareCount =
          ((window as typeof window & { shareCount?: number }).shareCount ??
            0) + 1;
      },
    });
  });
  await page.reload();
  await selectPayPayCsv(page);
  await answerNoMfmeHistory(page);
  await importStep(page)
    .getByRole("button", { name: "PayPay残高を取り込む" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "MoneyForward MEに取り込む" }),
  ).toBeVisible();

  await openSharedFiles(page, "shared-own-output", [
    { name: "pp2mf-paypay残高.csv", csv: payPayCsv },
  ]);
  const dialog = page.getByRole("dialog", {
    name: "共有先にPP2MFが選ばれました",
  });
  await expect(dialog).toContainText("「pp2mf-paypay残高.csv」は");
  await expect(page).toHaveScreenshot("pp2mf-share-target.png", {
    fullPage: true,
  });

  await dialog.getByRole("button", { name: "もう一度共有する" }).click();
  await expect(
    page
      .getByRole("dialog", { name: "MoneyForward MEに取り込む" })
      .getByRole("button", { name: "MoneyForward MEで保存した" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as typeof window & { shareCount?: number }).shareCount,
      ),
    )
    .toBe(1);
  await page.waitForURL((url) => !url.searchParams.has("shared-files"));
  await expect.poll(() => countSharedFileRecords(page)).toBe(0);
});

test("読み込まれずに残った受け取りファイルを起動時に削除する", async ({
  page,
}) => {
  await putSharedFiles(page, "stale-share", [
    { name: "paypay-history.csv", csv: payPayCsv },
  ]);
  await expect.poll(() => countSharedFileRecords(page)).toBe(1);

  await page.reload();
  await expect.poll(() => countSharedFileRecords(page)).toBe(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("取り込み用CSVを共有した直後に受け取りに失敗したら、共有先の誤りを案内してCSVを作り直す", async ({
  context,
  page,
}) => {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => true,
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async ({ files }: { files: File[] }) => {
        const shared = window as typeof window & { sharedNames?: string[] };
        shared.sharedNames = [
          ...(shared.sharedNames ?? []),
          ...files.map(({ name }) => name),
        ];
      },
    });
  });
  await page.reload();
  await selectPayPayCsv(page);
  await answerNoMfmeHistory(page);
  await importStep(page)
    .getByRole("button", { name: "PayPay残高を取り込む" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "MoneyForward MEに取り込む" }),
  ).toBeVisible();

  // Androidで共有先にPP2MFを選ぶと、Service Workerが受け取りに失敗してこのURLに移る。
  await page.goto("/?share-error=no-file");
  const dialog = page.getByRole("dialog", {
    name: "共有先にPP2MFが選ばれました",
  });
  await expect(dialog).toContainText("「pp2mf-paypay残高.csv」は");
  await expect(
    page.getByText("共有されたCSVファイルを受け取れませんでした"),
  ).toHaveCount(0);

  await dialog.getByRole("button", { name: "もう一度共有する" }).click();
  await expect(
    page
      .getByRole("dialog", { name: "MoneyForward MEに取り込む" })
      .getByRole("button", { name: "MoneyForward MEで保存した" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { sharedNames?: string[] }).sharedNames,
      ),
    )
    .toEqual(["pp2mf-paypay残高.csv"]);
});

test("保存待ちがないときに受け取りに失敗したら、受け取れなかったことを示す", async ({
  page,
}) => {
  await page.goto("/?share-error=no-file");
  await expect(
    page.getByText(
      "共有されたCSVファイルを受け取れませんでした。通常のファイル選択をお試しください。",
    ),
  ).toBeVisible();
});
