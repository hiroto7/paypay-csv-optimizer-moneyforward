import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import AppFooter from "~/components/AppFooter";
import AppHeader from "~/components/AppHeader";
import type { Route } from "./+types/privacy";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "プライバシーについて | PP2MF" },
    {
      name: "description",
      content: "PP2MFがCSVと端末内のデータをどのように扱うかを説明します。",
    },
  ];
}

const sections = [
  {
    title: "CSVの処理",
    paragraphs: [
      "PayPayとMoneyForward MEのCSVは、ブラウザ内で読み込み、照合、変換します。CSVの内容や変換結果をPP2MFのアプリケーションサーバーへ送信する処理はありません。",
      "生成したCSVは、ダウンロードまたは共有を押したときに、ブラウザの機能を使って端末へ保存・共有します。",
    ],
  },
  {
    title: "端末内への保存",
    paragraphs: [
      "作業中のPayPay CSVとMoneyForward ME CSVは、再読み込み後も作業を続けられるよう端末のIndexedDBへ保存します。入力欄からファイルの選択を解除するか、ブラウザのサイトデータを削除するまで保持されます。",
      "「MoneyForward MEで保存した」の記録と、手動で設定した口座残高は端末のlocalStorageへ保存します。MoneyForward MEのCSVを変更すると取り込み記録はリセットされますが、手動で設定した残高は保持されます。",
    ],
  },
  {
    title: "通常のWebアクセス",
    paragraphs: [
      "ページを表示するため、ホスティングサービスには通常のWebサイトと同じようにIPアドレス、ブラウザ情報、アクセス日時などがアクセスログとして記録される場合があります。CSVの内容はこの通信に含めません。",
      "画面のフォント表示にはGoogle Fontsを使用しています。フォントの読み込み時には、Google側へ通常のWebアクセス情報が送られる場合があります。",
    ],
  },
  {
    title: "このアプリについて",
    paragraphs: [
      "PP2MFはPayPayおよびMoneyForward MEの公式サービスではありません。変換結果や要確認明細は内容を確認してから使用してください。MoneyForward ME上の明細を自動で変更・削除することはありません。",
    ],
  },
] as const;

export default function Privacy() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-900">
      <AppHeader />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <Link
          to="/"
          className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          アプリに戻る
        </Link>
        <div className="border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-5 py-5 sm:px-7 sm:py-6">
            <h1 className="text-2xl font-bold text-zinc-950">
              プライバシーについて
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              PP2MFがCSVと端末内のデータをどのように扱うかを説明します。
            </p>
          </div>

          <div className="divide-y divide-zinc-200">
            {sections.map(({ title, paragraphs }) => (
              <section key={title} className="px-5 py-5 sm:px-7 sm:py-6">
                <h2 className="text-base font-bold text-zinc-950">{title}</h2>
                <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-700">
                  {paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
