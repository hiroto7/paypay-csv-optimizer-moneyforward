import { expect, test } from "@playwright/test";
import {
  auditMfmeCsv,
  canonicalUrl,
  dispatchInstallPrompt,
  heroDescription,
  mfmeHeader,
  openCleanPage,
  pageDescription,
  pageTitle,
  resolveInstallChoice,
  selectPayPayCsv,
} from "./helpers";

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
  expect(
    await page
      .locator('label[for="paypay-csv-input"]')
      .evaluate((element) => element.getBoundingClientRect().height),
  ).toBe(36);
  await expect(page).toHaveScreenshot("initial-mobile.png", {
    fullPage: true,
  });
});

test("選択済みファイルの操作をモバイルで表示できる", async ({ page }) => {
  await selectPayPayCsv(page);
  await page.locator("#mfme-csv-input").setInputFiles([
    {
      name: "収入・支出詳細_2025-01-01_2025-12-31.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        `${mfmeHeader}\n1,2025/01/01,架空商店A,-100,PayPay残高,食費,食費,メモ,,id-2025`,
      ),
    },
    {
      name: "収入・支出詳細_2026-01-01_2026-12-31.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        `${mfmeHeader}\n1,2026/01/01,架空商店B,-200,PayPay残高,食費,食費,メモ,,id-2026`,
      ),
    },
  ]);

  await expect(page).toHaveScreenshot("selected-files-desktop.png", {
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const payPayRegion = page.getByRole("region", {
    name: "PayPayから書き出した取引履歴",
  });
  const mfmeRegion = page.getByRole("region", {
    name: "MoneyForward MEから書き出した入出金履歴",
  });
  for (const control of [
    payPayRegion.getByRole("button", { name: "削除" }),
    mfmeRegion.getByRole("button", {
      name: "収入・支出詳細_2025-01-01_2025-12-31.csvを削除",
    }),
    mfmeRegion.locator('label[for="mfme-csv-input"]'),
    page.getByRole("button", { name: "取り込む" }).first(),
  ]) {
    expect(
      await control.evaluate(
        (element) => element.getBoundingClientRect().height,
      ),
    ).toBe(36);
  }
  await expect(page).toHaveScreenshot("selected-files-mobile.png", {
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

test("CSVを共有して読み込む方法を表示できる", async ({ page }) => {
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
});

test("インストール案内は承認結果と実際の登録状態を反映する", async ({
  page,
}) => {
  const guideButton = page.getByRole("button", {
    name: "CSVを共有して読み込む方法",
  });
  await dispatchInstallPrompt(page, true);
  await guideButton.click();
  const dialog = page.getByRole("dialog", {
    name: "CSVを共有して読み込む",
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
