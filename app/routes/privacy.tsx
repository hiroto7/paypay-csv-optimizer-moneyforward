import {
  ArrowLeft,
  Database,
  ExternalLink,
  HardDrive,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router";
import AppFooter from "~/components/AppFooter";
import type { Route } from "./+types/privacy";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "プライバシーについて | PayPay CSV Optimizer" },
    {
      name: "description",
      content:
        "PayPay CSV Optimizerが扱うCSV、端末内保存、外部通信について説明します。",
    },
  ];
}

const sections = [
  {
    title: "CSVの処理",
    icon: ShieldCheck,
    paragraphs: [
      "選択または共有されたPayPayとMoneyForward MEのCSVは、ブラウザ内で読み込み、解析、照合、変換します。CSV本文、解析結果、変換結果をアプリケーションサーバーへ送信する処理はありません。",
      "生成したCSVは、ブラウザのダウンロード機能またはWeb Share APIを使って、ユーザーの操作により端末へ保存・共有します。",
    ],
  },
  {
    title: "端末内への保存",
    icon: HardDrive,
    paragraphs: [
      "選択または共有された入力CSVは、次回起動時に復元できるよう、ブラウザのIndexedDBに保存します。解析結果、変換結果、照合結果、「MoneyForward MEで保存した」の確認状態は保存しません。",
      "入力欄の「ファイルの選択を解除」を押すと、その種類の保存済みCSVを削除します。すべての入力を解除すると、入力CSVの保存データを削除します。ブラウザのサイトデータ削除機能でも削除できます。",
      "保存期間に自動の期限はありません。選択解除またはブラウザのサイトデータ削除を行うまで、入力CSVが端末内に残る場合があります。",
    ],
  },
  {
    title: "共有ターゲット",
    icon: Database,
    paragraphs: [
      "対応する環境でこのアプリへCSVファイルを共有した場合、Service WorkerがファイルをIndexedDBへ一度保存し、アプリが受け取った後に共有受け渡し用のデータを削除します。共有されたCSVは、判定後に入力CSVとして端末内へ保存される場合があります。",
      "このアプリの共有ターゲットが受け取るのはCSVファイルです。共有されたURLやテキストを保存する仕様ではありません。",
    ],
  },
] as const;

export default function Privacy() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 sm:px-6">
          <img
            src="/pwa-icon.svg"
            alt=""
            className="size-9 shrink-0 rounded-lg"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-bold text-zinc-950 sm:text-base">
              PayPay CSV Optimizer
            </p>
            <p className="hidden text-xs text-zinc-500 sm:block">
              for MoneyForward ME
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-950"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          アプリに戻る
        </Link>

        <div className="mt-5 border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-5 py-5 sm:px-7 sm:py-6">
            <h1 className="text-2xl font-bold text-zinc-950">
              プライバシーについて
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              このページでは、アプリがCSVや関連情報をどのように扱うかを説明します。
            </p>
          </div>

          <div className="divide-y divide-zinc-200">
            {sections.map(({ title, icon: Icon, paragraphs }) => (
              <section key={title} className="px-5 py-6 sm:px-7">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center bg-zinc-100 text-zinc-700">
                    <Icon className="size-4.5" aria-hidden="true" />
                  </div>
                  <h2 className="text-base font-bold text-zinc-950">{title}</h2>
                </div>
                <div className="mt-4 space-y-3 text-sm leading-7 text-zinc-700">
                  {paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}

            <section className="px-5 py-6 sm:px-7">
              <h2 className="text-base font-bold text-zinc-950">
                通常のWebアクセスで送られる情報
              </h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-700">
                <p>
                  アプリ画面を表示する際は、通常のWebサイトと同様に、ホスティング先へIPアドレス、ブラウザ情報、アクセス日時などが送られ、アクセスログとして記録される場合があります。CSV本文はこの通信に含めません。
                </p>
                <p>
                  画面のフォントを読み込むためGoogle
                  Fontsへ通信します。この通信では、Google側にIPアドレスやブラウザ情報などが送られる場合があります。
                </p>
              </div>
            </section>

            <section className="px-5 py-6 sm:px-7">
              <h2 className="text-base font-bold text-zinc-950">
                利用上の注意
              </h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-700">
                <p>
                  このアプリはPayPayおよびMoneyForward
                  MEの公式サービスではありません。変換結果や照合候補は、内容を確認したうえで使用してください。MoneyForward
                  ME上の明細を自動で変更・削除することはありません。
                </p>
                <p>
                  実装や不具合報告は
                  <a
                    href="https://github.com/hiroto7/paypay-csv-optimizer-moneyforward"
                    target="_blank"
                    rel="noreferrer"
                    className="mx-1 inline-flex items-center gap-1 font-medium text-zinc-950 underline decoration-zinc-300 underline-offset-4"
                  >
                    GitHubリポジトリ
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                  で確認できます。
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
