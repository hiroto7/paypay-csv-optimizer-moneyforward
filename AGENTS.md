# Repository guidance

## Invariants

- CSVの解析・照合・変換はブラウザ内で完結させ、明細をアプリケーションサーバーへ送信しない。
- MoneyForward MEの入出金履歴に完全一致する明細と、ユーザーが「MoneyForward MEで保存した」と確認した明細を取り込み対象から除外する。取り込み記録はMoneyForward MEから取得した状態ではない。
- MoneyForward ME CSVは、既存明細の除外と重複登録・口座間違い候補の抽出で共有する。CSVがなくてもPayPay明細の変換はできる。
- 作業中のCSVとShare Targetの受信ファイルはIndexedDB、取り込み記録と口座残高は`localStorage`で管理する。MoneyForward ME CSVの変更時は取り込み記録だけをリセットする。
- 出力・監査対象は、併用払いを分割した後の支払い方法が`PayPay`で始まる明細に限る。出力は支払い方法別かつ100件単位に分割する。
- 要確認明細を重複や口座間違いと断定せず、MoneyForward ME上の明細を自動で変更・削除しない。

## Data and copy

- 実物CSVや個人を推測できる明細をコミットしない。テストデータには架空の値を使う。
- ユーザー向け文言は日本語とし、`PayPayの取引履歴`、`MoneyForward MEの入出金履歴`、`取り込み用CSV`、`MoneyForward MEで保存した`の用語を優先する。

## Validation

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

E2EとVRTはDockerのLinux/AMD64環境で実行する。意図した表示変更でのみ、差分を確認してから`npm run test:vrt:update`を実行する。
