import { expect, type Page } from "@playwright/test";
import {
  SHARED_FILE_DATABASE_NAME,
  SHARED_FILE_DATABASE_VERSION,
} from "../app/utils/shared-file-store";

export const payPayHeader =
  "取引日,出金金額（円）,入金金額（円）,海外出金金額,通貨,変換レート（円）,利用国,取引内容,取引先,取引方法,支払い区分,利用者,取引番号";
export const mfmeHeader =
  "計算対象,日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替,ID";
export const pageTitle =
  "PayPayの決済をMoneyForward MEにストレスなく取り込み | PP2MF";
export const heroDescription =
  "PayPayとMoneyForward MEの履歴を自動で照合し、二重登録することなく、新しい取引だけをスムーズに家計簿へ登録できます。";
export const pageDescription =
  "PayPayとMoneyForward MEの履歴を自動で照合し、二重登録することなく、新しい取引だけをスムーズに家計簿へ登録できます。PayPayポイントで支払った分はPayPay残高とは別の口座として登録でき、ポイントと残高を併用した支払いも自動で分けて整理します。明細が多くても、上限に合わせて取り込み用ファイルを自動で分割します。";
export const canonicalUrl = "https://pp2mf.vercel.app/";

export const payPayCsv = [
  payPayHeader,
  "2025/10/24 10:59:25,190,-,-,-,-,-,支払い,ダミーストアA,PayPay残高,-,-,00000000000000000001",
  '2025/09/29 14:54:12,410,-,-,-,-,-,支払い,ダミーストアB,"PayPayポイント (93円), PayPay残高 (317円)",-,-,00000000000000000002',
  "2025/10/24 13:17:35,72,-,-,-,-,-,支払い,ダミーストアD,VISA 1234,-,-,00000000000000000004",
].join("\n");

export const auditMfmeCsv = [
  mfmeHeader,
  "1,2025/10/24,ダミーストアA,-190,別の口座,食費,食費,架空データ,,dummy-id-01",
  "1,2025/09/29,ダミーストアB,-93,PayPayポイント,食費,食費,架空データ,,dummy-id-02",
  "1,2025/09/29,ダミーストアB,-317,PayPay残高,食費,食費,架空データ,,dummy-id-03",
  "1,2025/09/29,ダミーストアB,-317,PayPay残高,食費,食費,架空データ,,dummy-id-04",
].join("\n");

export const createChunkedPayPayCsv = (count: number) =>
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

export const openCleanPage = async (page: Page) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await expect(
    page.getByRole("heading", {
      name: "PayPayの決済を、MoneyForward MEにストレスなく取り込み。",
    }),
  ).toBeVisible();
};

export const selectPayPayCsv = async (page: Page) => {
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

export const readStoredInputFileNames = async (page: Page) =>
  page.evaluate(async (databaseName) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const record = await new Promise<{
        payPayFile: File | null;
        mfmeFiles: File[];
      } | null>((resolve, reject) => {
        const request = database
          .transaction("input-files", "readonly")
          .objectStore("input-files")
          .get("current");
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
      });
      return {
        payPay: record?.payPayFile?.name ?? null,
        mfme: record?.mfmeFiles.map((file) => file.name) ?? [],
      };
    } finally {
      database.close();
    }
  }, SHARED_FILE_DATABASE_NAME);

export const shareCsvThroughTarget = async (
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

export const dispatchInstallPrompt = async (
  page: Page,
  trackPrompt = false,
) => {
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

export const resolveInstallChoice = async (
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
