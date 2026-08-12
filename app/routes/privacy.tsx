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
    id: "csv-processing",
    indexLabel: "CSVの処理",
    title: "CSVの処理",
    paragraphs: [
      "PayPayの取引履歴とMoneyForward MEの入出金履歴は、ブラウザ内で読み込み、照合、変換します。内容や変換結果をPP2MFのアプリケーションサーバーへ送信する処理はありません。",
      "生成したCSVは、ダウンロードまたは共有を押したときに、ブラウザの機能を使って端末へ保存・共有します。",
    ],
  },
  {
    id: "device-storage",
    indexLabel: "端末内への保存",
    title: "端末内への保存",
    paragraphs: [
      "作業中のPayPayの取引履歴とMoneyForward MEの入出金履歴は、再読み込み後も作業を続けられるよう端末のIndexedDBへ保存します。入力欄からファイルの選択を解除するか、ブラウザのサイトデータを削除するまで保持されます。",
      "「MoneyForward MEで保存した」の記録と、手動で設定した口座残高は端末のlocalStorageへ保存します。MoneyForward MEの入出金履歴を変更すると取り込み記録はリセットされますが、手動で設定した残高は保持されます。",
    ],
  },
  {
    id: "web-access",
    indexLabel: "Webアクセス",
    title: "通常のWebアクセス",
    paragraphs: [
      "ページを表示するため、ホスティングサービスには通常のWebサイトと同じようにIPアドレス、ブラウザ情報、アクセス日時などがアクセスログとして記録される場合があります。CSVの内容はこの通信に含めません。",
    ],
  },
  {
    id: "about",
    indexLabel: "このアプリ",
    title: "このアプリについて",
    paragraphs: [
      "PP2MFはPayPayおよびMoneyForward MEの公式サービスではありません。変換結果や要確認明細は内容を確認してから使用してください。MoneyForward ME上の明細を自動で変更・削除することはありません。",
    ],
  },
] as const;

export default function Privacy() {
  return (
    <div className="app-frame flex flex-col">
      <AppHeader />

      <main className="document-shell flex-1">
        <Link
          to="/"
          className="control-link interactive -ml-2 gap-1 px-2 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          アプリに戻る
        </Link>
        <header className="mt-5 border-b border-rule-strong pb-6 sm:mt-8 sm:pb-8">
          <h1 className="document-title text-ink">プライバシーについて</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-ink-2">
            PP2MFがCSVと端末内のデータをどのように扱うかを説明します。
          </p>
        </header>

        <div className="document-layout">
          <nav className="document-index" aria-label="このページの内容">
            {sections.map(({ id, indexLabel }) => (
              <a key={id} className="interactive" href={`#${id}`}>
                {indexLabel}
              </a>
            ))}
          </nav>

          <div className="document-content">
            {sections.map(({ id, title, paragraphs }) => (
              <section key={id} id={id} className="document-section">
                <h2 className="text-xl font-bold text-ink">{title}</h2>
                <div className="document-prose">
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
