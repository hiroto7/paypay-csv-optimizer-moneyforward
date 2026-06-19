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

このアプリケーションのコアロジックは、責務ごとに **`app/services/`** 配下へ分割されています。

- **CSVエンコーディング**: 入力ファイルはまず `UTF-8` として読み込み、デコードに失敗した場合は `Shift_JIS` として読み込む。出力ファイルはMoneyForward MEの仕様に合わせて `UTF-8` (BOM付き) で生成する。

- **併用払いの分割**: `取引方法` 列に `PayPayポイント (1円), PayPay残高 (2,599円)` のように複数の支払い方法が記録されている場合、各支払い方法を個別の行に分割する。金額に桁区切りカンマが含まれるため、単純な `split(",")` では分割しない。

- **取引のフィルタリング（重複防止）**: （任意で）MoneyForward MEの取引履歴CSVから抽出して端末内に保存した登録済み明細と、ユーザーが「MoneyForward MEで保存した」と確認した明細をインポート対象から除外する。PayPay CSVとMoneyForward ME CSVの読み込み順序は問わない。具体的には、PayPay側とMoneyForward ME側で「日付」「金額」「内容」「収入か支出か」「金融機関」が一致するものを同一取引とみなし、処理対象から除外する。

- **取り込み状態の管理**: 共有・ダウンロード後のモーダルで「MoneyForward MEで保存した」ボタンを押すと、そのファイル内の明細キーと件数を端末内へ保存し、次回以降の除外に使う。これはMoneyForward ME側の状態を取得したものではなく、ユーザーの確認に基づく記録である。MoneyForward ME CSVを追加・置換・削除した場合は、この記録をリセットする。

- **MoneyForward ME CSVの追加と置換**: Share Targetから受け取ったMoneyForward ME CSVは、保存済みファイルへ追加する。同じファイルは内容ハッシュで重複排除する。画面から明示的に選択した場合は、保存済みファイルを新しいCSV一式で置き換える。CSVが未選択でもPayPayの全明細を変換できる。

- **入力状態の共有**: MoneyForward ME CSVは単一の選択状態として保持し、取り込みファイル作成時の既存明細除外と、重複登録・口座間違い候補の抽出の両方に使用する。画面上のモード切替は設けず、候補抽出は主結果の下にある折りたたみセクションで提供する。

- **件数・期間の表示**: ファイルや明細の件数・期間は`FileStats`で表し、画面上では`FileStatsSummary`を使用する。入力欄と作成結果で独自の件数・期間表示を重複実装しない。

- **ファイルの分割（チャンキング）**: MoneyForward MEの1インポートあたり100件の制限に対応するため、支払い方法ごとに取引が100件を超える場合は自動的に複数のファイルに分割して出力する。

- **重複登録・口座間違いの候補抽出**: PayPay側とMoneyForward ME側の明細を「日付」「金額」「内容」で束ね、支払い方法・口座ごとの件数を比較する。MoneyForward ME側の超過分を余分な明細候補、期待口座に不足がある状態の別口座明細を口座間違い候補として表示する。取引を一意に識別できる共通IDはないため、結果は確定判定ではなくユーザーが確認するための候補である。

- **明細の修正範囲**: このアプリはMoneyForward ME上の明細を自動で変更・削除しない。候補を確認したユーザーがMoneyForward ME上で不要明細の削除または口座変更を行う。

## データ取り扱い

- CSVの解析・変換はブラウザ内で完結し、アプリケーションサーバーへ明細を送信しない設計を維持する。
- 作業中のPayPay CSVとMoneyForward ME CSVはIndexedDBへ保存し、画面から明示的に削除するまで保持する。ユーザーが確認した取り込み記録だけを`localStorage`へ保存する。
- 実物のPayPay・MoneyForward ME明細には個人情報が含まれる。実物CSV、その内容のコピー、個人を推測できる値をリポジトリへコミットしない。
- テストには架空の店舗名・口座名・取引番号を使う。実物明細をそのままfixtureやスナップショットへ転用しない。

## 開発コマンド

- **依存関係のインストール**: `npm install`
- **開発サーバーの起動**: `npm run dev`
- **単体テストの実行**: `npm test`
- **型検査**: `npm run typecheck`
- **フォーマット・Lint検査**: `npm run lint`
- **本番ビルド**: `npm run build`

## ファイル構成の概要

- `app/routes/home.tsx`: 画面全体の状態管理と各サービスの呼び出しを行う。
- `app/hooks/useInputFilesStore.ts`: 入力ファイルの復元・保存・Share Target処理と通知を一括管理する。
- `app/hooks/useLocalImportRecords.ts`: ユーザー確認済みの取り込み記録と、現在の作成結果に使う除外スナップショットを管理する。
- `app/components/CsvFilePicker.tsx`: 選択前後で共通のファイル選択UIを提供する。
- `app/components/FileStatsSummary.tsx`: ファイルや明細の件数・期間を共通の見た目で表示する。
- `app/components/AuditPanel.tsx`: 重複登録・口座間違い候補を折りたたみ表示する。
- `app/services/paypay-csv.ts`: PayPay CSVの解析、既存明細の除外、支払い方法ごとの分割と出力を担う。
- `app/services/mfme-csv.ts`: MoneyForward ME CSVの解析と除外対象の集計を担う。
- `app/services/deletion-candidates.ts`: 重複登録・口座間違いの候補抽出を担う。
- `app/services/csv-date.ts`: CSV内の日付解析と期間集計を担う。
- `app/services/csv-schema.ts`: CSVの列名、レコード型、照合キー生成を定義する。
- `app/services/local-exclusion-store.ts`: ユーザー確認済みの取り込み記録を`localStorage`へ保存・復元する。
- `app/utils/shared-file-store.ts`: Share Targetの受信ファイルと、作業中のPayPay・MoneyForward ME CSVのIndexedDB保存を担う。
- `app/services/*.test.ts`: 各サービスに対応する単体テスト。
