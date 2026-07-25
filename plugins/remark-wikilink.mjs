// remark-wikilink — [[タイトル]] / [[タイトル|表示名]] / [[タイトル#anchor]] を
// ノートへのリンクに変換する remark plugin。
//
// 解決はタイトル基準（Obsidian と同じ）。対応表は build 時に frontmatter から作る。
// 解決できないリンクは、production build では落とす（壊れたリンクを公開しない。
// remark-tikz と同じ方針）。dev では破線表示にして書き続けられるようにする。

import { visit } from 'unist-util-visit';
import { scanNotes, resolveTitle, WIKILINK_RE } from './wikilinks.mjs';

export function remarkWikilink() {
  return (tree, file) => {
    // link の中に link は作れないので、link 配下の text は触らない
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || parent.type === 'link') return;
      if (!node.value.includes('[[')) return;

      const { byTitle } = scanNotes();
      const children = [];
      let last = 0;
      for (const m of node.value.matchAll(WIKILINK_RE)) {
        const [raw, title, anchor, alias] = m;
        if (m.index > last) children.push({ type: 'text', value: node.value.slice(last, m.index) });
        last = m.index + raw.length;

        const url = resolveTitle(byTitle, title);
        const display = alias ? alias.slice(1).trim() : title.trim();

        if (url == null && process.env.NODE_ENV === 'production') {
          throw new Error(
            `未解決の wikilink [[${title.trim()}]] (${file?.path ?? '不明なファイル'})`,
          );
        }
        children.push({
          type: 'link',
          url: url ? url + (anchor ?? '') : '#',
          children: [{ type: 'text', value: display }],
          data: {
            hProperties: { class: url ? 'wikilink' : 'wikilink wikilink--broken' },
          },
        });
      }
      if (children.length === 0) return;
      if (last < node.value.length) {
        children.push({ type: 'text', value: node.value.slice(last) });
      }
      parent.children.splice(index, 1, ...children);
      return index + children.length;
    });
  };
}

export default remarkWikilink;
