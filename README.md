# PayPay CSV Optimizer for MoneyForward ME

PayPayからエクスポートした取引履歴CSVを、MoneyForward MEへインポートするために最適化するWebアプリケーションです。

## 概要

PayPayのCSVを、併用払いの分割や支払い方法ごとの整理を行ったうえで、MoneyForward MEへ取り込める形式に変換します。過去の取り込みに重複や口座間違いが疑われる場合は、両サービスの明細を照合して要確認候補を表示できます。

すべての処理はブラウザ内で行われ、取引履歴データをアプリケーションサーバーへ送信しません。

## 主な機能

- **動的な支払い方法の識別**: 「PayPay残高」「PayPayポイント」などのキーワードに依存せず、CSV内の情報から動的に支払い方法を識別し、ファイルを出力します。
- **既存取引の自動除外**: MoneyForward MEからエクスポートしたCSVを読み込むと、登録済み明細の情報を端末内に保存し、以後の変換から自動で除外します。PayPay CSVとMoneyForward ME CSVはどちらを先に選んでも構いません。
- **重複登録・口座間違いの確認**: 誤って重複取り込みや別口座への取り込みをしてしまった場合に、PayPay明細とMoneyForward ME明細を突き合わせて要確認明細を表示します。
- **ファイル分割**: 1つの支払い方法で100件を超える取引がある場合、自動でファイルを100件ずつのチャンクに分割して出力します。
- **Web Share API対応**: 対応ブラウザでは生成したCSVファイルを共有できます。ファイル共有に対応していないブラウザでは通常のダウンロードとして動作します。
- **PWA共有ターゲット対応**: 対応するAndroid環境では、インストールしたアプリへPayPayまたはMoneyForward MEのCSVを共有し、そのまま入力できます。年ごとのMoneyForward ME CSVを順に共有した場合も、登録済み明細の情報を重複なく追加します。
- **プライバシー**: ファイルの処理はすべてクライアントサイドのJavaScriptで完結します。

入力CSVはUTF-8としての読み込みを試し、失敗した場合はShift_JISとして読み込みます。生成するCSVはBOM付きUTF-8です。

## 使い方

画面上部のタブで「取り込み用CSV」と「重複・口座間違いの確認」を切り替えます。PayPay CSVとMoneyForward ME CSVの選択は両方のタブで共通です。

### 取り込み用CSVを作成

1. **PayPay取引履歴を選択**: PayPayアプリからエクスポートした取引履歴CSVを選択します。
2. **既存明細を除外（任意）**: MoneyForward MEからエクスポートしたCSVを選ぶと、登録済みと判定された取引を出力対象から除外します。未選択の場合はPayPayの全明細をそのまま変換します。一度選んだCSVは端末内に保存されます。
3. **生成ファイルを取り込む**: 支払い方法・100件単位で分割されたファイルを、一覧から順にMoneyForward MEへ取り込みます。「MoneyForward MEで保存した」を押した明細は端末内へ記録され、次回以降の変換で除外されます。この記録はMoneyForward ME本体と自動同期されません。

### 重複登録・口座間違いを確認

1. **PayPay取引履歴を選択**: 正しい取引内容を確認する基準となるPayPay CSVを選択します。
2. **MoneyForward ME明細を選択**: 確認したい期間を含むMoneyForward MEのCSVを選択します。この選択は取り込み用CSVの既存明細除外にも共通して使われます。
3. **要確認明細を確認**: 重複取り込みや異なる口座への取り込みが疑われる明細を画面上で確認します。
4. **MoneyForward MEで修正**: 不要な重複明細は削除し、必要な明細で口座だけが違う場合は口座を変更します。アプリが明細を自動変更することはありません。

照合にはPayPayとMoneyForward MEで共通する取引IDがないため、「日付」「金額」「内容」と口座別の件数を使っています。表示結果は削除や口座変更を確定するものではありません。必ず明細の内容を確認してから修正してください。

## 端末内のデータ保存

- 作業中のPayPay CSVとMoneyForward ME CSVは、Share Targetによる画面遷移や再読み込み後も作業を続けられるようIndexedDBに保存します。CSVは画面から明示的に削除するまで保持します。
- 「MoneyForward MEで保存した」の記録だけをブラウザの`localStorage`に保存し、次回以降の除外に使います。
- MoneyForward ME CSVを追加・入れ替え・削除すると、「MoneyForward MEで保存した」の記録はリセットされます。
- CSVや明細情報をアプリケーションサーバーへ送信することはありません。

## 開発

### セットアップ

```bash
# 依存関係をインストール
npm install
```

### 開発サーバーの起動

```bash
npm run dev
```

### 品質チェック

```bash
npm test
npm run test:vrt
npm run typecheck
npm run lint
npm run build
```

VRTはPlaywright公式Dockerイメージ内のLinux/AMD64環境で実行します。事前に
Dockerを起動してください。基準画像を更新する場合は、表示差分を確認したうえで
`npm run test:vrt:update`を実行します。

## 使用技術

- React
- TypeScript
- Vite
- React Router
- Tailwind CSS
- `csv-parse` / `csv-stringify`
- Vitest
- Biome
