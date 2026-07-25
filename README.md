# snowyuki31.github.io

公開ナレッジベース。https://snowyuki31.github.io/

学んだことを、後から番地を指して引用できる形に書き直して置く場所。
圏論はその最初のトピックであって、この場所が圏論のためのものではない。

## この repo の位置づけ

| | 置くもの | 正 |
| --- | --- | --- |
| **ここ（参照面）** | 定義・命題・定理・証明。改訂され続ける確定内容 | **ここが SSoT**。公開した時点で本文の正はここ |
| はてな / note（発信面） | 気づき・進捗・読んだ順の記録。書いたら直さない | 各記事 |
| pkm vault（私的） | 下書き・私的な思考メモ | vault |

同じ内容を参照面と発信面の両方に置かない。発信面から参照面へリンクする（逆は張らない）。

## 書き方

`src/content/docs/<topic>/*.mdx` に書く。frontmatter の `section` が採番の章番号になる。

```mdx
---
title: 圏
section: 2
sidebar:
  order: 2
---

import { Definition, Proposition, Proof } from '@components/env';

<Definition title="圏" id="def-category">
本文。数式は $a \circ f$ や $$...$$ で書く（KaTeX）。
</Definition>

<Proposition title="恒等射の一意性" id="prop-identity-unique">
任意の対象 $a$ に対して、恒等射 $1_a$ は一意に定まる。
</Proposition>

<Proof>
証明。既定では畳まれる。
</Proof>
```

環境は `Definition` / `Proposition` / `Theorem` / `Lemma` / `Corollary` / `Example` / `Proof` / `Ref`。

### 採番

番号は CSS counter で振る。**種別をまたいだ 1 本の通し番号**（定義2.1 → 命題2.2 → 定理2.3）で、
間に足しても後ろが自動でずれる。前半の `2.` は frontmatter の `section`。

番号は build 時には確定しないので、**参照側から番号を刷れない**。他の主張を指すときは
番号ではなく `id` へのリンクで指す（`<Ref href="/category-theory/basics/#prop-identity-unique">恒等射の一意性</Ref>`）。
番号を刷りたくなったら、採番を build 時計算に移す必要がある。

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
npm run build    # dist/ へ。TikZ の実コンパイルを含む
npm run preview
```

## デプロイ

`main` への push で GitHub Actions が build して Pages へ出す（`.github/workflows/deploy.yml`）。
Pages の source は「GitHub Actions」であること（旧 `gh-pages` ブランチ運用からの切り替えが必要）。
