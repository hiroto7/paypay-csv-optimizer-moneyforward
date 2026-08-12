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
            <h1 className="text-2xl font-bold text-zinc-950">使い方</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              PP2MFは、PayPayの取引履歴をMoneyForward
              MEへ継続的に取り込むための補助ツールです。
            </p>
          </div>

          <section className="px-5 py-5 sm:px-7 sm:py-6">
            <h2 className="text-base font-bold text-zinc-950">
              なぜPP2MFを使うのか
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-700">
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

          <section className="border-t border-zinc-200 px-5 py-5 sm:px-7 sm:py-6">
            <h2 className="text-base font-bold text-zinc-950">
              取り込み用CSVを作る
            </h2>
            <ol className="mt-4 divide-y divide-zinc-200 border-y border-zinc-200">
              {steps.map(({ title, paragraphs }, index) => (
                <li
                  key={title}
                  className="grid grid-cols-[28px_1fr] gap-3 py-4"
                >
                  <span className="flex size-7 items-center justify-center bg-zinc-100 text-xs font-bold text-zinc-700">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-950">{title}</h3>
                    <div className="mt-1 space-y-2 text-sm leading-6 text-zinc-600">
                      {paragraphs.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="border-t border-zinc-200 px-5 py-5 sm:px-7 sm:py-6">
            <h2 className="text-base font-bold text-zinc-950">
              重複登録・口座間違いの明細を見つける
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-700">
              <p>
                PayPayの取引履歴とMoneyForward
                MEの入出金履歴の両方を読み込むと、重複登録や口座間違いの可能性がある明細を確認できます。
              </p>
              <p>
                修正が必要な場合は、MoneyForward ME側で手動で行ってください。
              </p>
            </div>
          </section>

          <section className="border-t border-zinc-200 px-5 py-5 sm:px-7 sm:py-6">
            <h2 className="text-base font-bold text-zinc-950">補足</h2>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-zinc-700">
              <li>
                支払い方法が「PayPay」で始まる明細だけを取り込み用CSVの対象とします。PayPayの取引履歴に含まれていても、クレジットカードや銀行口座などを使用した明細は対象外です。
              </li>
              <li>
                CSVの処理はブラウザ内で行い、内容をPP2MFのサーバーへ送信しません。
              </li>
            </ul>
          </section>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
