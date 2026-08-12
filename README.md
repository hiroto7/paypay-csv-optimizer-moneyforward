# PP2MF: PayPay CSV Optimizer for MoneyForward ME

PP2MFは、PayPayの取引履歴をMoneyForward MEへ継続的に取り込むための補助ツールです。MoneyForward MEへ登録済みの明細を自動で除外し、同じ取引を重複して登録することを防ぐのが主な目的です。

[PP2MFを使う](https://pp2mf.vercel.app/)

## なぜPP2MFを使うのか

MoneyForward MEにはPayPayの取引履歴を自動取得する機能がありません。その代わりに、PayPayから書き出した取引履歴CSVを読み込んで明細を登録できます。

ただし、以前取り込んだ期間と重なるCSVを読み込むと、同じ明細を重複して登録する可能性があります。PP2MFは、MoneyForward MEから書き出した入出金履歴と、ユーザーが取り込み済みと記録した明細を照合し、登録済みの取引を取り込み用CSVから除外します。

## 主な機能

- **既存取引の自動除外**: MoneyForward MEから書き出した入出金履歴を読み込むと、登録済みの明細を作成対象から自動で除外します。2種類の取引履歴はどちらを先に選んでも構いません。
- **取り込み済み明細の記録**: 「MoneyForward MEで保存した」を押した明細を端末内へ記録し、次回以降の作成対象から除外します。
- **支払い方法ごとの出力**: 「PayPay残高」「PayPayポイント」など、名前が「PayPay」で始まる支払い方法ごとにファイルを出力します。残高とポイントを併用した支払いも支払い方法ごとに分割します。
- **100件単位の分割**: 1つの支払い方法で100件を超える場合、取り込み用CSVを100件ずつに分割します。
- **重複登録・口座間違いの確認**: PayPay明細とMoneyForward ME明細を突き合わせ、完全一致しなかった要確認明細を表示します。
- **口座別の残高管理**: MoneyForward MEに表示されている現在残高を手動で設定すると、未取り込み明細をすべて反映した場合の見込み残高を表示します。
- **共有・PWA対応**: 対応環境では、CSVの共有とShare Targetからの直接読み込みを利用できます。

支払い方法が「PayPay」で始まる明細だけが取り込み用CSVの対象です。クレジットカードや銀行口座などを使用した明細は対象外です。

## 使い方

1. PayPayから取引履歴CSVをダウンロードし、PP2MFで選びます。
2. MoneyForward MEから書き出した入出金履歴CSVを追加します（任意）。追加すると、登録済みの明細を作成対象から除外します。
3. 作成されたCSVをMoneyForward MEアプリへ共有またはダウンロードし、画面の案内に従って取り込みます。
4. 保存したらPP2MFへ戻り、「MoneyForward MEで保存した」を押します。取り込んだ明細が端末内へ記録され、次回以降は自動で除外されます。

詳しい手順はアプリ内の[使い方](https://pp2mf.vercel.app/guide)で確認できます。

### 重複登録・口座間違いを探す

PayPayの取引履歴とMoneyForward MEの入出金履歴の両方を読み込むと、重複登録や口座間違いの可能性がある明細を確認できます。PP2MFは明細を自動で変更・削除しません。内容を確認し、必要な修正はMoneyForward ME側で行ってください。

## 重複排除を期間ではなく明細単位で行う理由

単純に前回取り込んだ日の翌日から取引履歴を書き出せば、通常は期間の重複を避けられます。一方、実際の利用では、PayPayポイントが後日付与され、同じ期間を後日再エクスポートすると、以前のCSVにはなかったポイント履歴が追加される挙動を確認しています。これはPayPayの公式仕様として保証されたものではなく、利用時に確認した挙動です。

このような履歴も取りこぼさずに再取得できるよう、PP2MFはエクスポート期間だけを管理するのではなく、MoneyForward MEの入出金履歴と端末内の取り込み記録を使って明細単位で重複を除外します。

## データ保存とプライバシー

- CSVの読み込み、照合、変換はブラウザ内で行い、内容や変換結果をPP2MFのアプリケーションサーバーへ送信しません。
- 作業中のPayPay CSVとMoneyForward ME CSVは、再読み込み後も作業を続けられるよう端末のIndexedDBへ保存します。
- 「MoneyForward MEで保存した」の記録と、手動で設定した口座残高は端末の`localStorage`へ保存します。
- MoneyForward MEのCSVを変更すると取り込み記録はリセットされますが、手動で設定した残高は保持されます。

詳しくは[プライバシーについて](https://pp2mf.vercel.app/privacy)を参照してください。

## 開発

### セットアップ

```bash
npm ci
npm run dev
```

### 品質チェック

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

E2EとVisual Regression TestはDocker内のLinux/AMD64環境で実行するため、事前にDockerを起動してください。意図した表示変更でスナップショットを更新する場合は、差分を確認してから`npm run test:vrt:update`を実行します。

## 使用技術

- React
- TypeScript
- Vite
- React Router
- Tailwind CSS
- `csv-parse` / `csv-stringify`
- Vitest
- Biome
