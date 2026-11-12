import { Check, Copy, ExternalLink, Wallet } from "lucide-react";
import { useState } from "react";

interface AccountSetupGuideProps {
  accountNames: readonly string[];
  // 初めて取り込むときは、口座がまだないものとして開いた状態で目立たせる。
  isFirstImport: boolean;
}

// Web版のMoneyForward MEの「金融機関追加」。MoneyForward MEのヘルプが案内しているリンク先。
const MFME_ADD_ACCOUNT_URL = "https://moneyforward.com/accounts/service_list";
const MFME_HELP_URL =
  "https://support.me.moneyforward.com/hc/ja/articles/900003464686";

const linkClassName =
  "inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-zinc-700 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950";

function AccountName({ name }: { name: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <li className="flex items-center justify-between gap-3 py-1.5">
      <span className="min-w-0 break-words text-sm font-bold text-zinc-950">
        {name}
      </span>
      <button
        type="button"
        aria-label={`「${name}」をコピー`}
        onClick={() => {
          void navigator.clipboard
            ?.writeText(name)
            .then(() => setCopied(true))
            .catch(() => undefined);
        }}
        className="inline-flex h-8 shrink-0 items-center gap-1 border border-zinc-300 bg-white px-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
      >
        {copied ? (
          <Check className="size-3.5 text-emerald-700" aria-hidden="true" />
        ) : (
          <Copy className="size-3.5" aria-hidden="true" />
        )}
        <span aria-live="polite">{copied ? "コピーしました" : "コピー"}</span>
      </button>
    </li>
  );
}

export default function AccountSetupGuide({
  accountNames,
  isFirstImport,
}: AccountSetupGuideProps) {
  return (
    <details
      open={isFirstImport}
      className={`group border ${
        isFirstImport
          ? "border-amber-300 bg-amber-50"
          : "border-zinc-200 bg-zinc-50"
      }`}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-bold text-zinc-950 [&::-webkit-details-marker]:hidden">
        <Wallet className="size-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          {isFirstImport
            ? "取り込む前に、MoneyForward MEに口座を作る"
            : "MoneyForward MEに取り込み先の口座がないとき"}
        </span>
        <span className="shrink-0 text-xs font-semibold text-zinc-600 underline decoration-zinc-300 underline-offset-4 group-open:hidden">
          開く
        </span>
        <span className="hidden shrink-0 text-xs font-semibold text-zinc-600 underline decoration-zinc-300 underline-offset-4 group-open:inline">
          閉じる
        </span>
      </summary>
      <div className="space-y-3 px-3 pb-3 text-xs leading-5 text-zinc-700">
        <p>
          取り込み先の口座は、MoneyForward
          MEが自動では作りません。次の名前の口座がまだないときは、先に作ってください。
        </p>
        <ul
          aria-label="作っておく口座の名前"
          className="divide-y divide-zinc-200 border border-zinc-200 bg-white px-3"
        >
          {accountNames.map((name) => (
            <AccountName key={name} name={name} />
          ))}
        </ul>
        <p>
          口座を作れるのは、Web版のMoneyForward
          MEだけです。アプリでは作れません。Web版には、アプリと同じアカウントでログインできます。
        </p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Web版のMoneyForward MEで「金融機関追加」を開く</li>
          <li>
            「電子マネー・プリペイド」を押し、一覧のいちばん下にある「未対応の電子マネー・プリペイド」を押す
          </li>
          <li>
            「電子マネーの名前」に上の名前をそのまま入力し、「残高」も入力して「登録」を押す
          </li>
        </ol>
        <p>
          名前を変えると、あとでMoneyForward
          MEの入出金履歴を追加したときに、登録済みの明細を除外できません。
        </p>
        <div className="flex flex-wrap gap-x-5">
          <a
            href={MFME_ADD_ACCOUNT_URL}
            target="_blank"
            rel="noreferrer"
            className={linkClassName}
          >
            Web版の「金融機関追加」を開く
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
          <a
            href={MFME_HELP_URL}
            target="_blank"
            rel="noreferrer"
            className={linkClassName}
          >
            MoneyForward MEのヘルプで手順を見る
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </details>
  );
}
