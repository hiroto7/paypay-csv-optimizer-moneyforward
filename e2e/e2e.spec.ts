import { expect, type Page, test } from "@playwright/test";
import {
  SHARED_FILE_DATABASE_NAME,
  SHARED_FILE_DATABASE_VERSION,
} from "../app/utils/shared-file-store";

const payPayHeader =
  "取引日,出金金額（円）,入金金額（円）,海外出金金額,通貨,変換レート（円）,利用国,取引内容,取引先,取引方法,支払い区分,利用者,取引番号";
const mfmeHeader =
  "計算対象,日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替,ID";
const pageTitle = "PayPayの決済をMoneyForward MEにストレスなく取り込み | PP2MF";
const heroDescription =
  "PayPayとMoneyForward MEの履歴を自動で照合し、二重登録することなく、新しい取引だけをスムーズに家計簿へ登録できます。";
const pageDescription =
  "PayPayとMoneyForward MEの履歴を自動で照合し、二重登録することなく、新しい取引だけをスムーズに家計簿へ登録できます。PayPayポイントで支払った分はPayPay残高とは別の口座として登録でき、ポイントと残高を併用した支払いも自動で分けて整理します。明細が多くても、上限に合わせて取り込み用ファイルを自動で分割します。";
const canonicalUrl = "https://pp2mf.vercel.app/";

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
      return `${formattedDate} 12:00:00,100,-,-,-,-,-,支払い,ダミーストア${index + 1},PayPay残高,-,-,${transactionId}`;
    }),
  ].join("\n");

const openCleanPage = async (page: Page) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await expect(
    page.getByRole("heading", {
      name: "PayPayの決済を、MoneyForward MEにストレスなく取り込み。",
    }),
  ).toBeVisible();
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

const dispatchInstallPrompt = async (page: Page, trackPrompt = false) => {
  await page.evaluate((shouldTrackPrompt) => {
    let resolveInstallChoice:
      | ((choice: {
          outcome: "accepted" | "dismissed";
          platform: string;
        }) => void)
      | undefined;
    const userChoice = new Promise<{
      outcome: "accepted" | "dismissed";
      platform: string;
    }>((resolve) => {
      resolveInstallChoice = resolve;
    });
    const testWindow = window as typeof window & {
      installPromptCalled?: boolean;
      resolveInstallChoice?: (outcome: "accepted" | "dismissed") => void;
    };
    testWindow.resolveInstallChoice = (outcome) =>
      resolveInstallChoice?.({ outcome, platform: "web" });

    window.dispatchEvent(
      Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
        prompt: async () => {
          if (shouldTrackPrompt) testWindow.installPromptCalled = true;
        },
        userChoice,
      }),
    );
  }, trackPrompt);
};

const resolveInstallChoice = async (
  page: Page,
  outcome: "accepted" | "dismissed",
) => {
  await page.evaluate((selectedOutcome) => {
    (
      window as typeof window & {
        resolveInstallChoice?: (outcome: "accepted" | "dismissed") => void;
      }
    ).resolveInstallChoice?.(selectedOutcome);
  }, outcome);
};

test.beforeEach(async ({ page }) => {
  await openCleanPage(page);
});

test("初期画面をデスクトップとモバイルで表示できる", async ({ page }) => {
  await expect(page).toHaveTitle(pageTitle);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    pageDescription,
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    canonicalUrl,
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    pageTitle,
  );
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
    "content",
    pageDescription,
  );
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
    "content",
    "website",
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    canonicalUrl,
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary",
  );
  await expect(page.getByText(heroDescription)).toBeVisible();
  await expect(
    page.getByText(
      "選んだ明細を支払い方法ごとに分け、MoneyForward MEに取り込めるファイルを作ります。",
    ),
  ).toBeVisible();
  await expect(
    page.getByText(
      "PayPay残高とPayPayポイントを併用した支払いは、支払い方法ごとの明細に分けて、それぞれ別の口座へ登録できます。",
    ),
  ).toBeVisible();
  await expect(
    page.getByText(
      "明細が多い場合は、取り込み用ファイルを100件ごとに分割します。",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "使い方を見る" }),
  ).toHaveAttribute("href", "/guide");

  await expect(page).toHaveScreenshot("initial-desktop.png", {
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page).toHaveScreenshot("initial-mobile.png", {
    fullPage: true,
  });
});

test("3ページで共通ヘッダーと情報ページの戻る導線を表示できる", async ({
  context,
  page,
}) => {
  await page.goto("/");
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    "content",
    "width=device-width, initial-scale=1, viewport-fit=cover",
  );

  for (const path of ["/", "/guide", "/privacy"]) {
    await page.goto(path);
    const header = page.getByRole("banner");

    await expect(header.locator('img[src="/pwa-icon.svg"]')).toBeVisible();
    await expect(header.getByText("PP2MF", { exact: true })).toBeVisible();
    await expect(
      header.getByText("PayPay CSV Optimizer for MoneyForward ME", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      header.getByText("ブラウザ内で処理", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.locator("main h1")).toHaveCount(1);

    if (path !== "/") {
      await expect(page).toHaveScreenshot(`${path.slice(1)}-page.png`, {
        fullPage: true,
      });
    }
  }

  const client = await context.newCDPSession(page);
  await client.send("Emulation.setSafeAreaInsetsOverride", {
    insets: { bottom: 34 },
  });

  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/", "/guide", "/privacy"]) {
    await page.goto(path);
    const footer = page.getByRole("contentinfo");
    const footerContent = footer.locator(":scope > div");

    await footer.scrollIntoViewIfNeeded();
    await expect(footerContent).toHaveCSS("padding-bottom", "50px");
    await expect(footer.getByRole("link", { name: "使い方" })).toBeVisible();
    await expect(
      footer.getByRole("link", { name: "プライバシーについて" }),
    ).toBeVisible();
    await expect(footer.getByRole("link", { name: "GitHub" })).toBeVisible();
  }

  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("/");
  await expect(page.getByRole("contentinfo").locator(":scope > div")).toHaveCSS(
    "padding-bottom",
    "16px",
  );

  await page.goto("/guide");
  await page.getByRole("link", { name: "アプリに戻る" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/privacy");
  await page.getByRole("link", { name: "アプリに戻る" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("CSVを共有して読み込む方法とインストール案内を確認できる", async ({
  page,
}) => {
  const guideButton = page.getByRole("button", {
    name: "CSVを共有して読み込む方法",
  });
  await expect(guideButton).toBeVisible();

  await guideButton.click();
  const dialog = page.getByRole("dialog", {
    name: "CSVを共有して読み込む",
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText(
      "PayPayやMoneyForward MEからダウンロードしたCSVを、保存先から探し直さずに読み込めます",
    ),
  ).toBeVisible();
  await expect(
    dialog.getByRole("figure", {
      name: "ダウンロードしたCSVをPP2MFで読み込む流れ",
    }),
  ).toBeVisible();
  const headerCloseButton = dialog.getByTitle("閉じる");
  const footerCloseButton = dialog
    .getByRole("button", { name: "閉じる" })
    .last();
  await expect(headerCloseButton).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(footerCloseButton).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(headerCloseButton).toBeFocused();
  await expect(
    dialog.getByText("PayPayまたはMoneyForward MEからCSVをダウンロードする"),
  ).toBeVisible();
  await expect(dialog.getByText("共有シートでPP2MFを選ぶ")).toBeVisible();
  await expect(
    dialog.getByText(
      "端末・OS・ブラウザによっては、PP2MFが共有先に表示されない場合があります。",
    ),
  ).toBeVisible();
  await expect(
    dialog.getByText(
      "ブラウザのメニューから「アプリをインストール」または「ホーム画面に追加」を選んでください。",
    ),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("csv-share-guide-modal.png", {
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page).toHaveScreenshot("csv-share-guide-modal-mobile.png", {
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(guideButton).toBeFocused();

  await dispatchInstallPrompt(page, true);

  await guideButton.click();
  await expect(
    dialog.getByRole("button", { name: "インストールする" }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("csv-share-guide-modal-installable.png", {
    fullPage: true,
  });
  await dialog.getByRole("button", { name: "インストールする" }).click();
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "インストール中" }),
  ).toBeDisabled();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as typeof window & {
              installPromptCalled?: boolean;
            }
          ).installPromptCalled,
      ),
    )
    .toBe(true);

  await resolveInstallChoice(page, "dismissed");
  await expect(
    dialog.getByText(
      "ブラウザのメニューから「アプリをインストール」または「ホーム画面に追加」を選んでください。",
    ),
  ).toBeVisible();

  await dispatchInstallPrompt(page);
  await dialog.getByRole("button", { name: "インストールする" }).click();
  await expect(
    dialog.getByRole("button", { name: "インストール中" }),
  ).toBeDisabled();
  await resolveInstallChoice(page, "accepted");
  await expect(
    dialog.getByRole("button", { name: "インストール中" }),
  ).toBeDisabled();

  await page.evaluate(() => {
    Object.defineProperty(navigator, "getInstalledRelatedApps", {
      configurable: true,
      value: async () =>
        (
          window as typeof window & {
            isTestPwaInstalled?: boolean;
          }
        ).isTestPwaInstalled
          ? [
              {
                platform: "webapp",
                url: `${window.location.origin}/manifest.webmanifest`,
              },
            ]
          : [],
    });
  });

  // Android Chromeで観察した承認直後のappinstalledでは、まだ完了扱いにしない。
  await page.evaluate(() => {
    window.dispatchEvent(new Event("appinstalled"));
  });
  await expect(
    dialog.getByRole("button", { name: "インストール中" }),
  ).toBeDisabled();

  // 実インストール後のappinstalledで登録を確認できたら完了表示にする。
  await page.evaluate(() => {
    (
      window as typeof window & {
        isTestPwaInstalled?: boolean;
      }
    ).isTestPwaInstalled = true;
    window.dispatchEvent(new Event("appinstalled"));
  });
  await expect(dialog.getByText("PP2MFはインストール済みです")).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "インストールする" }),
  ).toHaveCount(0);
  await dialog.getByTitle("閉じる").click();
  await expect(dialog).toHaveCount(0);
  await expect(guideButton).toBeFocused();

  await page.addInitScript(() => {
    Object.defineProperty(navigator, "getInstalledRelatedApps", {
      configurable: true,
      value: async () => [
        {
          platform: "webapp",
          url: `${window.location.origin}/manifest.webmanifest`,
        },
      ],
    });
  });
  await page.reload();
  await guideButton.click();
  await expect(dialog.getByText("PP2MFはインストール済みです")).toBeVisible();
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
  await expect(
    page
      .getByRole("dialog", { name: "MoneyForward MEに取り込む" })
      .getByRole("button", { name: "閉じる" })
      .last(),
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
    outputRegion.getByRole("button", {
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

  await page.getByRole("button", { name: "取り込む" }).click();
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

  await expect(page.getByText("moneyforward-history.csv")).toBeVisible();
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

  await expect(page.getByText("moneyforward-history.csv")).toBeVisible();
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
    .getByRole("button", { name: "すべて削除", exact: true })
    .click();

  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator("#mfme-csv-input")).toBeAttached();
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
  await expect(page.getByText("2ファイル", { exact: true })).toBeVisible();

  await page
    .getByRole("button", { name: "重複登録・口座間違いを確認する" })
    .click();
  await expect(page.getByText("2ファイル", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByText("2ファイル", { exact: true })).toBeVisible();
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
    mfmeInputRegion.getByText("1ファイル", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("moneyforward-history.csv")).toBeVisible();
});

test("別名のMFME CSVは同じ内容でも追加して保存済み記録をリセットする", async ({
  page,
}) => {
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

  await shareCsvThroughTarget(
    page,
    "shared-mfme-duplicate",
    "名前だけ変更.csv",
    auditMfmeCsv,
  );

  await expect(
    page
      .getByRole("region", {
        name: "MoneyForward MEから書き出した入出金履歴",
      })
      .getByText("2ファイル", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("paypay-csv-optimizer:local-exclusion-state:v1"),
      ),
    )
    .toBeNull();
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
    .getByRole("button", { name: "重複登録・口座間違いを確認する" })
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
    .getByRole("button", { name: "重複登録・口座間違いを確認する" })
    .click();
  await expect(page.getByText("saved-moneyforward-history.csv")).toBeVisible();
  await expect(
    page.getByText("MoneyForward MEから書き出した入出金履歴"),
  ).toBeVisible();
});

test("重複登録と口座間違いの候補を表示できる", async ({ page }) => {
  await page
    .getByRole("button", { name: "重複登録・口座間違いを確認する" })
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
