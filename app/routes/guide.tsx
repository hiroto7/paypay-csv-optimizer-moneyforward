import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import AppFooter from "~/components/AppFooter";
import AppHeader from "~/components/AppHeader";
import type { Route } from "./+types/guide";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "使い方 | PP2MF" },
    {
      name: "description",
      content:
        "PP2MFでPayPayの取引履歴をMoneyForward MEへ取り込む方法を説明します。",
    },
  ];
}

const steps = [
  {
    title: "PayPayの取引履歴を選ぶ",
    paragraphs: [
      "PayPayから取引履歴をダウンロードし、そのCSVファイルをPP2MFで選びます。",
    ],
  },
  {
    title: "MoneyForward MEの入出金履歴を追加する（任意）",
    paragraphs: [
      "MoneyForward MEから書き出した入出金履歴を追加すると、すでに登録されている明細を作成対象から除外します。",
      "追加しない場合は、MoneyForward MEの入出金履歴との照合を行いません。",
    ],
  },
  {
    title: "作成されたCSVをMoneyForward MEへ取り込む",
    paragraphs: [
      "PP2MFが、登録済み明細の除外や支払い方法ごとの振り分けを行い、MoneyForward MEへの取り込み用CSVを作成します。",
      "作成されたCSVをMoneyForward MEアプリへ共有し、画面の案内に従って取り込みます。",
      "保存したらPP2MFへ戻り、「MoneyForward MEで保存した」を押してください。取り込んだ明細が記録され、次回以降は作成対象から自動で除外されます。",
    ],
  },
] as const;

export default function Guide() {
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
          <h1 className="document-title text-ink">使い方</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-ink-2">
            PP2MFは、PayPayの取引履歴をMoneyForward
            MEへ継続的に取り込むための補助ツールです。
          </p>
        </header>

        <div className="document-layout">
          <nav className="document-index" aria-label="このページの内容">
            <a className="interactive" href="#why">
              背景
            </a>
            <a className="interactive" href="#steps">
              3ステップ
            </a>
            <a className="interactive" href="#audit">
              要確認明細
            </a>
            <a className="interactive" href="#notes">
              補足
            </a>
          </nav>

          <div className="document-content">
            <section id="why" className="document-section">
              <h2 className="text-xl font-bold text-ink">
                なぜPP2MFを使うのか
              </h2>
              <div className="document-prose">
                <p>
                  MoneyForward
                  MEにはPayPayの取引履歴を自動取得する機能がありません。その代わりとして、PayPayから書き出した取引履歴のCSVファイルを読み込み、明細を登録する機能があります。
                </p>
                <p>
                  ただし、すでに登録した明細を自動で除外する仕組みはないため、以前取り込んだ期間と重なるCSVを読み込むと、同じ明細を重複して登録する可能性があります。
                </p>
                <p>
                  PP2MFは、MoneyForward
                  MEから書き出した入出金履歴と、PP2MFで取り込み済みと記録した明細を照合し、登録済みの取引を自動で除外します。
                </p>
                <p>
                  あわせて、PayPay残高やPayPayポイントといった支払い方法ごとのCSVへの振り分けと、100件単位の分割も自動で行います。
                </p>
              </div>
            </section>

            <section id="steps" className="document-section">
              <h2 className="text-xl font-bold text-ink">
                取り込み用CSVを作る
              </h2>
              <ol className="mt-5 border-y border-rule-strong">
                {steps.map(({ title, paragraphs }, index) => (
                  <li
                    key={title}
                    className="grid grid-cols-[36px_minmax(0,1fr)] gap-4 border-b border-rule py-5 last:border-b-0 sm:py-6"
                  >
                    <span className="step-number pt-0.5 text-lg font-bold text-accent">
                      0{index + 1}
                    </span>
                    <div>
                      <h3 className="text-base font-bold leading-7 text-ink">
                        {title}
                      </h3>
                      <div className="mt-2 space-y-2 text-base leading-7 text-ink-2">
                        {paragraphs.map((paragraph) => (
                          <p key={paragraph}>{paragraph}</p>
                        ))}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section id="audit" className="document-section">
              <h2 className="text-xl font-bold text-ink">
                重複登録・口座間違いの明細を見つける
              </h2>
              <div className="document-prose">
                <p>
                  PayPayの取引履歴とMoneyForward
                  MEの入出金履歴の両方を読み込むと、重複登録や口座間違いの可能性がある明細を確認できます。
                </p>
                <p>
                  修正が必要な場合は、MoneyForward ME側で手動で行ってください。
                </p>
              </div>
            </section>

            <section id="notes" className="document-section">
              <h2 className="text-xl font-bold text-ink">補足</h2>
              <ul className="document-prose list-disc space-y-3 pl-5">
                <li>
                  支払い方法が「PayPay」で始まる明細だけを取り込み用CSVの対象とします。PayPayの取引履歴に含まれていても、クレジットカードや銀行口座などを使用した明細は対象外です。
                </li>
                <li>
                  CSVの処理はブラウザ内で行い、内容をPP2MFのサーバーへ送信しません。
                </li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
