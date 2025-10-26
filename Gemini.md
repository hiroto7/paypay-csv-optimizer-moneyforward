## プロジェクトの目的

PayPayからエクスポートした取引履歴CSVを、MoneyForward MEへのインポートに適した形式に最適化するWebアプリケーションを開発する。

## 主要技術

- React
- TypeScript
- Vite
- React Router
- Tailwind CSS
- `csv-parse` / `csv-stringify`
- `vitest`
- `@tsconfig/strictest`

## 主要ロジックの概要

このアプリケーションのコアとなるロジックは **`app/services/csv-processor.ts`** に集約されています。

- **CSVエンコーディング**: 入力ファイルは `Shift_JIS` として読み込み、出力ファイルはMoneyForward MEの仕様に合わせて `UTF-8` (BOM付き) で生成する。

- **併用払いの分割**: `取引方法` 列に `PayPayポイント (1円), PayPay残高 (2,599円)` のように複数の支払い方法が記録されている場合、正規表現 ` /([^,]+?)\s*\((\d+|[\d,]+)円\)/g ` と `matchAll` を用いて、各支払い方法を個別の行に分割する。金額に含まれる桁区切りカンマが原因で単純な `split(',')` では破綻するため、この `matchAll` を使うアプローチが重要である。

- **取引のフィルタリング**: ユーザーがテキストエリアに入力した「取引番号」のリスト（改行またはスペース区切り）を使い、処理済みの取引をインポート対象から除外する。

- **ファイルの分割（チャンキング）**: MoneyForward MEの1インポートあたり100件の制限に対応するため、支払い方法ごとに取引が100件を超える場合は自動的に複数のファイルに分割して出力する。

- **期間表示**: 生成される各ファイル（チャンク）について、含まれる取引の期間を `取引日` 列を基に算出する。`取引日` 列は `YYYY/MM/DD HH:mm:ss` 形式の文字列であるため、`new Date()` で正しく解釈できるよう `YYYY-MM-DDTHH:mm:ss` 形式に変換する。表示には `Intl.DateTimeFormat.formatRange()` を使用し、ロケールに応じた自然な期間を表現する。

## 開発コマンド

- **依存関係のインストール**: `npm install`
- **開発サーバーの起動**: `npm run dev`
- **単体テストの実行**: `npm test`

## ファイル構成の概要

- `app/routes/home.tsx`: アプリケーションのUIを担うReactコンポーネント。状態管理と、`csv-processor`サービスの呼び出しを行う。
- `app/services/csv-processor.ts`: CSV解析、変換、分割などのコアなビジネスロジックをすべて含む純粋な関数。
- `app/services/csv-processor.test.ts`: `csv-processor`の単体テスト。
- `app/root.tsx`: アプリケーション全体のレイアウト、CSSのインポート、エラーハンドリングを担う。
- `app/routes.ts`: ルーティング設定。現在は `home.tsx` のみ。
- `Gemini.md`: このファイル。AIアシスタントがプロジェクトのコンテキストを理解するために使用する。