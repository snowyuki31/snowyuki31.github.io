// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { remarkTikz } from './plugins/remark-tikz.mjs';
import { remarkWikilink } from './plugins/remark-wikilink.mjs';

// 和文はシステムのゴシック体に任せ、欧文だけ Roboto を当てる
// （参照: nineties.github.io/topos-theory と同じ構成）
const FONTS =
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Roboto+Mono&display=swap';

export default defineConfig({
  site: 'https://snowyuki31.github.io',

  markdown: {
    processor: unified({
      // remarkWikilink は [[タイトル]] をノートへのリンクに、
      // remarkTikz は ```tikz を build 時に SVG へコンパイルする（client JS ゼロ）
      remarkPlugins: [remarkWikilink, remarkMath, remarkTikz],
      rehypePlugins: [[rehypeKatex, { strict: false, throwOnError: false }]],
    }),
  },

  integrations: [
    starlight({
      title: 'snowyuki31',
      description: '学んだことを、後から参照できる形で置いておく場所。',
      defaultLocale: 'root',
      locales: { root: { label: '日本語', lang: 'ja' } },
      customCss: [
        'katex/dist/katex.min.css',
        // TikZ の SVG は font-family="cmmi10" 等で Computer Modern を名指しするので、
        // node-tikzjax 同梱の @font-face を読ませないと図のラベルだけ別フォントになる。
        'node-tikzjax/css/fonts.css',
        './src/styles/custom.css',
      ],
      head: [
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' } },
        {
          tag: 'link',
          attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true },
        },
        { tag: 'link', attrs: { rel: 'stylesheet', href: FONTS } },
      ],
      components: {
        // トンマナは白黒 1 種のみ。テーマ切り替えを廃止する
        ThemeProvider: './src/components/overrides/ThemeProvider.astro',
        ThemeSelect: './src/components/overrides/ThemeSelect.astro',
        // ノート末尾に backlinks（linked mentions）を出す
        Footer: './src/components/overrides/Footer.astro',
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/snowyuki31' },
      ],
      editLink: {
        baseUrl: 'https://github.com/snowyuki31/snowyuki31.github.io/edit/main/',
      },
      lastUpdated: true,
      sidebar: [
        { label: 'Map of Contents', items: [{ autogenerate: { directory: 'moc' } }] },
        { label: 'Notes', items: [{ autogenerate: { directory: 'notes' } }] },
      ],
    }),
  ],
});
