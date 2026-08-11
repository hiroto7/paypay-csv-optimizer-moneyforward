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
    title: "PayPay CSVを選ぶ",
    description: "PayPayから書き出した取引履歴CSVを選択します。",
  },
  {
    title: "MoneyForward ME CSVを選ぶ（任意）",
    description:
      "すでに登録した明細を除外する場合は、MoneyForward MEから書き出した入出金履歴CSVを追加します。除外が不要なら選ばずに進めます。",
  },
  {
    title: "作成したCSVをMoneyForward MEへ取り込む",
    description:
      "作成したファイルを共有またはダウンロードし、MoneyForward MEで口座を確認して保存します。PP2MFへ戻り、「MoneyForward MEで保存した」を押すと、次回以降その明細を除外できます。",
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
              PayPayの取引履歴を、MoneyForward MEへ取り込む流れを説明します。
            </p>
          </div>

          <section className="px-5 py-5 sm:px-7 sm:py-6">
            <h2 className="text-base font-bold text-zinc-950">
              取り込み用CSVを作る
            </h2>
            <ol className="mt-4 divide-y divide-zinc-200 border-y border-zinc-200">
              {steps.map(({ title, description }, index) => (
                <li
                  key={title}
                  className="grid grid-cols-[28px_1fr] gap-3 py-4"
                >
                  <span className="flex size-7 items-center justify-center bg-zinc-100 text-xs font-bold text-zinc-700">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-950">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-zinc-600">
                      {description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="border-t border-zinc-200 px-5 py-5 sm:px-7 sm:py-6">
            <h2 className="text-base font-bold text-zinc-950">
              要確認明細について
            </h2>
            <p className="mt-3 text-sm leading-7 text-zinc-700">
              PayPay CSVとMoneyForward ME
              CSVの両方を選ぶと、重複登録や口座間違いの可能性がある明細を画面下部で確認できます。内容と口座を確認し、必要な修正はMoneyForward
              ME側で行ってください。PP2MFが明細を自動で変更・削除することはありません。
            </p>
          </section>

          <section className="border-t border-zinc-200 px-5 py-5 sm:px-7 sm:py-6">
            <h2 className="text-base font-bold text-zinc-950">
              知っておくこと
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-zinc-700">
              <li>「PayPay」で始まる支払い方法だけが作成対象です。</li>
              <li>
                クレジットカードや銀行口座など、MoneyForward
                MEへ直接連携している支払い方法は作成対象外です。
              </li>
              <li>1ファイルの明細が100件を超える場合は、自動で分割します。</li>
              <li>CSVの処理はブラウザ内で行われ、サーバーへ送信されません。</li>
            </ul>
          </section>

          <div className="border-t border-zinc-200 bg-zinc-50 px-5 py-4 text-sm text-zinc-600 sm:px-7">
            スマートフォンの共有シートからCSVを直接読み込む方法は、アプリの入力ファイル欄にある「CSVを共有して読み込む方法」から確認できます。
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
