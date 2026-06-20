import type { WebAppManifest } from "web-app-manifest";

const isPreviewDeployment =
  process.env["APP_ENV"] === "preview" ||
  process.env["VERCEL_ENV"] === "preview";

export function loader() {
  const manifest: WebAppManifest = {
    id: "/",
    name: `${isPreviewDeployment ? "[PREVIEW] " : ""}PP2MF - PayPay CSV Optimizer for MoneyForward ME`,
    short_name: isPreviewDeployment ? "[PRV] PP2MF" : "PP2MF",
    description:
      "PayPayから書き出した取引履歴を整理し、MoneyForward MEに取り込めるファイルを作成します。",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f4f5",
    theme_color: "#dc2626",
    categories: ["finance", "productivity", "utilities"],
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
