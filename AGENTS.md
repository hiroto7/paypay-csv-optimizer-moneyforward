# Repository guidance

## Invariants

- CSVの解析・照合・変換はブラウザ内で完結させ、明細をアプリケーションサーバーへ送信しない。
- CSV処理、照合、入力ファイル、口座残高の契約は`docs/technical-design.md`を正本とし、挙動を変える場合は対応するテストと文書を更新する。
- MoneyForward MEとの照合用の正規化によって、画面表示や生成するCSVの内容を変更しない。
- MoneyForward MEの入出金履歴は、既存明細の除外と重複登録・口座間違い候補の抽出で共有する。入出金履歴がなくてもPayPayの取引履歴は変換できる。
- 画面で選択またはShare Targetで読み込んだ作業中の取引履歴はIndexedDB、取り込み記録と口座残高は`localStorage`で管理する。MoneyForward MEの入出金履歴の変更時は取り込み記録だけをリセットする。
- 出力・監査対象は、併用払いを分割した後の支払い方法が`PayPay`で始まる明細に限る。出力は支払い方法別かつ100件単位に分割する。
- 要確認明細を重複や口座間違いと断定せず、MoneyForward ME上の明細を自動で変更・削除しない。

## Data and copy

- 実物CSVや個人を推測できる明細をコミットしない。テストデータには架空の値を使う。
- ユーザー向け文言は日本語とし、`PayPayの取引履歴`、`MoneyForward MEの入出金履歴`、`取り込み用CSV`、`MoneyForward MEで保存した`を使う。
- `PayPay CSV`、`MFME CSV`、`MoneyForward ME CSV`、`基準MFME`のような略称・内部用語や、`取引履歴CSV`、`入出金履歴CSV`のように名詞を不自然に連結した表現は使わない。ファイル形式を示す必要がある場合は、`PayPayの取引履歴のCSVファイル`または文脈に応じて`そのCSVファイル`と書く。

## Validation

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

E2EとVRTはDockerのLinux/AMD64環境で実行する。意図した表示変更でのみ、差分を確認してから`npm run test:vrt:update`を実行する。
