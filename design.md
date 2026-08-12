<!-- Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 -->

# Design — PP2MF

PP2MF全体で共有する、固定済みのmulti-pageデザインシステムです。各ページは独自テーマを選ばず、この文書と`tokens.css`を先に読みます。色の生値は`tokens.css`だけを正本とし、この文書やコンポーネントへ複製しません。

## Genre

**modern-minimal / utilitarian**。装飾ではなく、CSVを選ぶ、照合結果を読む、取り込みを完了するという作業の明快さを優先します。

## Macrostructure family

- App pages: **Workbench**。入力レールと作業キャンバスを主役にし、機能をマーケティングカードへ置き換えません。
- Content pages: **Long Document**。本文は単一カラム、60–65ch、十分な行間と章間余白で読み進められる形にします。
- Navigation: **N1 minimal 2-link**。ブランドと最小限の導線だけを置きます。
- Footer: **Ft2 inline rule**。一列の補足リンクを細い罫線で閉じ、サイトマップ型の列は作りません。

## Theme

暖色寄りのlight custom paletteです。正確な値は`tokens.css`の次のsemantic tokensに固定します。

- Surfaces: `--color-paper`, `--color-paper-2`, `--color-paper-3`
- Text: `--color-ink`, `--color-ink-2`, `--color-muted`
- Rules: `--color-rule`, `--color-rule-2`, `--color-rule-strong`
- Brand and focus: `--color-accent`, `--color-accent-ink`, `--color-focus`
- Status: `--color-success-*`, `--color-warning-*`, `--color-error-*`

アクセントの面積は各viewportのおよそ5%以下に抑えます。success、warning、errorは状態の意味にだけ使い、装飾には流用しません。

## Typography

- Display: **M PLUS 1 Code Variable**, weight 600–700, roman
- Body: **Noto Sans JP Variable**, weight 400–700
- Mono/outlier: **M PLUS 1 Code Variable**。ファイル名、件数、短い数値表示に限ります。
- 最小本文サイズは16px、補助テキストの下限は14pxです。
- 見出しはitalicにせず、weight、字間、色で階層を作ります。

## Spacing and shape

- 4px基準のnamed scaleを`tokens.css`から使います。任意の余白値を局所追加しません。
- panel、control、dialogの角丸は小さく保ち、pillや過度なカード化を避けます。
- App pagesは密度を保ち、Content pagesは章ごとに余白を変えてリズムを作ります。

## Motion

- Stance: **motion-cut**。ページ全体のrevealやscroll-triggered animationは使いません。
- Durations: fast `--dur-fast`, base `--dur-base`, slow `--dur-slow`。
- Easings: `--ease-out`, `--ease-in`, `--ease-in-out`の3種だけを使います。
- 位置の変化は`transform`と`opacity`だけに限定し、hoverの色変化はbase durationで行います。focus ringは即時表示し、transitionしません。
- `prefers-reduced-motion: reduce`では空間移動を除き、必要な変化だけをfast duration以下のopacityへ縮退します。
- loading spinnerは進行中の操作だけに使い、完了は画面内の状態変化で静かに伝えます。

## Interaction voice

- Primary action: inkまたはaccentのsolid fill、短い1行label、明確なdisabled/loading state。
- Secondary action: paper surfaceとrule、または本文中のunderline link。
- File controls: default、hover、focus-visible、active、disabled、loading、error、successを同じgeometryで表します。
- Inputs: border幅を変えず、focusはoutline、errorはmessageと`aria-invalid`を併用します。
- Modals: native `dialog`を維持し、既存のfocus order、Escape、明示的closeを壊しません。

## Per-page allowances

- App pages: enrichmentなし。実際の入力、結果、監査UIそのものを主役にします。
- Content pages: enrichmentなし。type、measure、rule、negative spaceだけで構成します。
- 実際のworkflowを表す手順番号は使用できます。装飾目的のeyebrowや章番号は追加しません。

## What pages MUST share

- wordmark、custom palette、display/body fonts
- N1 navigationとFt2 footerの密度
- controlの高さ、focus ring、button state、dividerの太さ
- copy、accessible name、状態分岐、route/component ownership

## What pages MAY differ on

- Workbenchは入力レールと作業キャンバスの比率をviewportに応じて変えられます。
- Long Documentは本文量に合わせて章間余白を変えられます。
- status surfaceは意味に対応するsemantic tokenだけを選べます。

## Exports

`tokens.css`を値の正本とし、以下は同じ値を各ツールへ渡すためのexport snapshotです。トークンを変更するときは`tokens.css`を先に更新し、その後この節を同期します。

### tokens.css

アプリが直接読み込むcanonical exportです。colour、font、type、spacing、radius、duration、easingとTailwind mappingを一か所に保持します。

```css
@import "../tokens.css";
```

### Tailwind v4

`tokens.css`内の次の`@theme`がsemantic utilityを公開します。コンポーネントは値ではなく、`paper`、`ink`、`accent`、`success`などのroleを参照します。Hallmarkの余白utilityはTailwind標準のcontainer幅と衝突しないよう`hm-` prefixを使います。

```css
@theme {
  --color-paper: oklch(98% 0.006 25);
  --color-paper-2: oklch(95% 0.009 25);
  --color-paper-3: oklch(91% 0.012 25);
  --color-ink: oklch(19% 0.014 25);
  --color-ink-2: oklch(35% 0.012 25);
  --color-muted: oklch(46% 0.01 25);
  --color-rule: oklch(72% 0.012 25);
  --color-rule-2: oklch(58% 0.014 25);
  --color-accent: oklch(61% 0.2 23);
  --color-accent-ink: oklch(14% 0.01 25);
  --color-focus: oklch(48% 0.19 23);
  --color-success: oklch(48% 0.13 150);
  --color-success-surface: oklch(94% 0.035 150);
  --color-success-ink: oklch(27% 0.06 150);
  --color-warning: oklch(58% 0.13 75);
  --color-warning-surface: oklch(95% 0.04 75);
  --color-warning-ink: oklch(30% 0.07 75);
  --color-error: oklch(52% 0.2 23);
  --color-error-surface: oklch(95% 0.035 23);
  --color-error-ink: oklch(29% 0.1 23);

  --font-display: "M PLUS 1 Code Variable", "Noto Sans JP Variable", ui-monospace, monospace;
  --font-body: "Noto Sans JP Variable", ui-sans-serif, system-ui, sans-serif;
  --font-outlier: var(--font-display);

  --text-xs: 0.875rem;
  --text-sm: 1rem;
  --text-base: 1.0625rem;
  --text-lg: 1.25rem;
  --text-xl: 1.5rem;
  --text-2xl: 2rem;
  --text-display: clamp(2rem, 4vw, 3.5rem);

  --spacing-hm-3xs: 0.25rem;
  --spacing-hm-2xs: 0.5rem;
  --spacing-hm-xs: 0.75rem;
  --spacing-hm-sm: 1rem;
  --spacing-hm-md: 1.5rem;
  --spacing-hm-lg: 2rem;
  --spacing-hm-xl: 3rem;
  --spacing-hm-2xl: 4rem;
  --spacing-hm-3xl: 5rem;
  --spacing-hm-4xl: 6rem;
  --spacing-hm-5xl: 8rem;

  --radius-control: 0.125rem;
  --radius-panel: 0.25rem;
  --radius-dialog: 0.375rem;

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
}
```

### DTCG

DTCG対応ツールへ渡す`tokens.json`です。responsiveなdisplay sizeはCSS側に残し、JSONでは上限値を使います。

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "paper": { "$value": "oklch(98% 0.006 25)", "$type": "color" },
    "paper-2": { "$value": "oklch(95% 0.009 25)", "$type": "color" },
    "paper-3": { "$value": "oklch(91% 0.012 25)", "$type": "color" },
    "ink": { "$value": "oklch(19% 0.014 25)", "$type": "color" },
    "ink-2": { "$value": "oklch(35% 0.012 25)", "$type": "color" },
    "muted": { "$value": "oklch(46% 0.01 25)", "$type": "color" },
    "rule": { "$value": "oklch(72% 0.012 25)", "$type": "color" },
    "rule-2": { "$value": "oklch(58% 0.014 25)", "$type": "color" },
    "accent": { "$value": "oklch(61% 0.2 23)", "$type": "color" },
    "accent-ink": { "$value": "oklch(14% 0.01 25)", "$type": "color" },
    "focus": { "$value": "oklch(48% 0.19 23)", "$type": "color" },
    "success": { "$value": "oklch(48% 0.13 150)", "$type": "color" },
    "success-surface": { "$value": "oklch(94% 0.035 150)", "$type": "color" },
    "success-ink": { "$value": "oklch(27% 0.06 150)", "$type": "color" },
    "warning": { "$value": "oklch(58% 0.13 75)", "$type": "color" },
    "warning-surface": { "$value": "oklch(95% 0.04 75)", "$type": "color" },
    "warning-ink": { "$value": "oklch(30% 0.07 75)", "$type": "color" },
    "error": { "$value": "oklch(52% 0.2 23)", "$type": "color" },
    "error-surface": { "$value": "oklch(95% 0.035 23)", "$type": "color" },
    "error-ink": { "$value": "oklch(29% 0.1 23)", "$type": "color" }
  },
  "font": {
    "display": { "$value": ["M PLUS 1 Code Variable", "Noto Sans JP Variable", "ui-monospace", "monospace"], "$type": "fontFamily" },
    "body": { "$value": ["Noto Sans JP Variable", "ui-sans-serif", "system-ui", "sans-serif"], "$type": "fontFamily" }
  },
  "size": {
    "text-xs": { "$value": "0.875rem", "$type": "dimension" },
    "text-sm": { "$value": "1rem", "$type": "dimension" },
    "text-base": { "$value": "1.0625rem", "$type": "dimension" },
    "text-lg": { "$value": "1.25rem", "$type": "dimension" },
    "text-xl": { "$value": "1.5rem", "$type": "dimension" },
    "text-2xl": { "$value": "2rem", "$type": "dimension" },
    "text-display": { "$value": "3.5rem", "$type": "dimension" }
  },
  "space": {
    "3xs": { "$value": "0.25rem", "$type": "dimension" },
    "2xs": { "$value": "0.5rem", "$type": "dimension" },
    "xs": { "$value": "0.75rem", "$type": "dimension" },
    "sm": { "$value": "1rem", "$type": "dimension" },
    "md": { "$value": "1.5rem", "$type": "dimension" },
    "lg": { "$value": "2rem", "$type": "dimension" },
    "xl": { "$value": "3rem", "$type": "dimension" },
    "2xl": { "$value": "4rem", "$type": "dimension" },
    "3xl": { "$value": "5rem", "$type": "dimension" },
    "4xl": { "$value": "6rem", "$type": "dimension" },
    "5xl": { "$value": "8rem", "$type": "dimension" }
  },
  "duration": {
    "micro": { "$value": "120ms", "$type": "duration" },
    "short": { "$value": "220ms", "$type": "duration" },
    "dialog": { "$value": "300ms", "$type": "duration" },
    "reduced": { "$value": "120ms", "$type": "duration" }
  },
  "radius": {
    "control": { "$value": "0.125rem", "$type": "dimension" },
    "panel": { "$value": "0.25rem", "$type": "dimension" },
    "dialog": { "$value": "0.375rem", "$type": "dimension" }
  }
}
```

### shadcn/ui

shadcn/uiへ渡す場合は、`oklch(var(--token))`で合成できるspace-separated tripleへ変換します。destructive foregroundはerror surface用の`--color-error-ink`ではなく、error fill上でコントラストを満たすpaperを使います。

```css
:root {
  --background: 98% 0.006 25;
  --foreground: 19% 0.014 25;
  --card: 95% 0.009 25;
  --card-foreground: 19% 0.014 25;
  --popover: 95% 0.009 25;
  --popover-foreground: 19% 0.014 25;
  --primary: 61% 0.2 23;
  --primary-foreground: 14% 0.01 25;
  --secondary: 91% 0.012 25;
  --secondary-foreground: 35% 0.012 25;
  --muted: 91% 0.012 25;
  --muted-foreground: 46% 0.01 25;
  --accent: 61% 0.2 23;
  --accent-foreground: 14% 0.01 25;
  --destructive: 52% 0.2 23;
  --destructive-foreground: 98% 0.006 25;
  --border: 72% 0.012 25;
  --input: 58% 0.014 25;
  --ring: 48% 0.19 23;
  --radius: 0.125rem;
}
```
