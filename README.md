# snowyuki31.github.io

公開ナレッジベース。https://snowyuki31.github.io/

学んだことを、後から番地を指して引用できる形に書き直して置く場所。

## この repo の位置づけ

| | 置くもの | 正 |
| --- | --- | --- |
| **ここ（参照面）** | 定義・命題・定理・証明。改訂され続ける確定内容 | **ここが SSoT**。公開した時点で本文の正はここ |
| はてな / note（発信面） | 気づき・進捗・読んだ順の記録。書いたら直さない | 各記事 |
| pkm vault（私的） | 下書き・私的な思考メモ | vault |

同じ内容を参照面と発信面の両方に置かない。発信面から参照面へリンクする（逆は張らない）。

## 構造（Obsidian と同じ思想 + 圏論的 MoC）

- **ノートはすべて atomic**（1 ノート 1 概念）。`src/content/docs/notes/*.mdx` に一元化
- ノート間の参照は **`[[タイトル]]`**（wikilink）。build 時に frontmatter の `title` で解決される
- **MoC は独立した種別ではなく「目録（`<Moc>` ブロック）を持つノート」という役割**。
  どのノートも本文（プレート・数式・図）を持ちながら、目録を持てば MoC として振る舞う。
  目録に目録を載せれば MoC of MoC（何も特別扱いしない）
- **階層の辺 = `<Moc>` ブロック内の wikilink のみ**。本文中の wikilink は横のつながり（言及）。
  root の `index.mdx`（Home）も同じ仕組みで最上位 MoC を列挙する
- ここから導出されるもの:
  - **パンくず**（タイトル上）: 属する全系統を 1 系統 1 行で表示（多親ならその数だけ）
  - **左サイドバー**: MoC だけの階層ツリー（親もリンク、開閉は caret）。個々のノートは出さない
  - **右サイドバー**: 目次の代わりに「このノートが属する MoC の図式」。現在ページのノードはハイライト
  - **backlinks**（ページ末尾）: 本文中でこのノートを言及しているノートだけ（目録経由の所属はパンくずが持つ）
- chrome は最小限: 検索なし・GitHub リンクなし。2 カラム以上では header も出さず、
  左サイドバー上端の wordmark（snowyuki31）が Home へのリンク。1 カラムでは header に wordmark だけ

### `<Moc>` — 目録は図式（diagram）

MoC を「shape の圏 $J$ からノートの圏への関手」とみなす。kind = shape の種類で、
どの kind もパース結果は同じ正規形（ノード + 型付き辺 + 束）に落ち、
**階層は kind に依存しない**（kind の追加は `plugins/moc-kinds.mjs` の registry に足すだけ）。

build 時に図式が生成されてブロックの直前に入る（白黒・クリック可能・client JS ゼロ）。
**MoC ノートは二重枠 = 潜れるノード**（クリックでそのページ = その図式へ）。

```mdx
<Moc kind="set">        {/* J = 離散圏。並べるだけ（Home の最上位一覧など） */}

- [[圏論]]
- [[読書録]]

</Moc>

<Moc kind="sequence">   {/* J = 全順序。読む順序。省略時の既定 */}

1. [[圏]]
2. [[恒等射の一意性]]

</Moc>

<Moc kind="grouping">   {/* J = 分割。束ごとに比較・対立 */}

- 構文論: [[A]], [[B]]
- 意味論: [[C]]

</Moc>

<Moc kind="graph">      {/* J = 型付き辺の quiver。論文などの複雑な構造 */}

[[圏]] --性質--> [[恒等射の一意性]]

[[圏]] --例--> [[モノイドは対象1つの圏]]

</Moc>
```

graph の中身は辺 DSL なので本文には出ない（図式だけが出る）。辺ラベルに `-` と `>` は使えない。

**production build を落とす条件**（壊れた構造を公開しない）: Moc 内の未解決 wikilink、
どの Moc からも Home へ辿れないページ（孤児）。dev 中は「（未整理）」表示で書き続けられる。

### wikilink

```
[[圏]]              → タイトル「圏」のノートへのリンク
[[圏|別の表示名]]    → 表示名を変える
[[圏#見出し]]        → anchor 付き
```

解決できない wikilink は production build を落とす（壊れたリンクを公開しない）。
`npm run dev` 中は破線表示になり、書き続けられる。

## 見た目

白黒のみ・単一テーマ（切り替えなし）・最小限。
フォントは https://nineties.github.io/topos-theory/ と同じく Roboto + sans-serif
（和文はシステムのゴシック体）。数式は KaTeX。

## 書き方

```mdx
---
title: 圏
description: 圏の定義。
---

import { Definition, Proposition, Proof } from '@components/env';

<Definition title="圏" id="def-category">
本文。数式は $a \circ f$ や $$...$$ で書く（KaTeX）。
</Definition>
```

環境は `Definition` / `Proposition` / `Theorem` / `Lemma` / `Corollary` / `Example` / `Proof`。
ラベルは「定義（圏）」のように種別＋タイトルで出る。atomic ノートに通し番号は振らない
（順序・文脈は MoC と wikilink が持つ）。

### 図（TikZ）

` ```tikz ` ブロックに書く。**build 時に SVG へコンパイルされ**、HTML に直に載る（client 側の runtime なし）。

````
```tikz
\usepackage{tikz-cd}
\begin{document}
\begin{tikzcd}
a \arrow[r, "f"] & b
\end{tikzcd}
\end{document}
```
````

エンジンは `node-tikzjax` で、これは Obsidian の obsidian-tikzjax および pkm の
`utils/tikzjax-lint` と**同一エンジン**。vault で lint が緑になった図はそのまま同じ絵になるので、
書式を変えずに持ってこられる。

図が壊れていると `npm run build` が落ちる（`npm run dev` 中はその図だけエラー表示になり、編集は続けられる）。
コンパイル結果は内容ハッシュで `.cache/tikz/` に載る。消しても再生成される。

## 開発

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # dist/ へ。TikZ の実コンパイル・wikilink 検証を含む
npm run preview
```

## デプロイ

`main` への push で GitHub Actions が build して Pages へ出す（`.github/workflows/deploy.yml`）。
Pages の source は「GitHub Actions」であること（旧 `gh-pages` ブランチ運用からの切り替えが必要）。
