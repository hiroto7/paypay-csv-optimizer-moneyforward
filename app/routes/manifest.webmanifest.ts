import type { WebAppManifest } from "web-app-manifest";

const isPreviewDeployment =
  process.env["APP_ENV"] === "preview" ||
  process.env["VERCEL_ENV"] === "preview";

export function loader({ request }: { request: Request }) {
  const origin = new URL(request.url).origin;
  const manifest: WebAppManifest = {
    id: "/",
    name: `${isPreviewDeployment ? "[PREVIEW] " : ""}PP2MF - PayPay CSV Optimizer for MoneyForward ME`,
    short_name: isPreviewDeployment ? "[PRV] PP2MF" : "PP2MF",
    description:
      "PayPayとMoneyForward MEの履歴を自動で照合し、二重登録することなく、新しい取引だけをスムーズに家計簿へ登録できます。PayPayポイントで支払った分はPayPay残高とは別の口座として登録でき、ポイントと残高を併用した支払いも自動で分けて整理します。明細が多くても、上限に合わせて取り込み用ファイルを自動で分割します。",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f4f5",
    theme_color: "#dc2626",
    categories: ["finance", "productivity", "utilities"],
    related_applications: [
      {
        platform: "webapp",
        url: "/manifest.webmanifest",
        id: `${origin}/`,
      },
    ],
    share_target: {
      action: "/share-target",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        files: [
          {
            name: "csv",
            accept: [".csv", "text/csv", "text/comma-separated-values"],
          },
        ],
      },
    },
    icons: [
      {
        src: "/pwa-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/pwa-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/manifest+json; charset=utf-8",
    },
  });
}
