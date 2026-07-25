// remark-moc — MDX 中の <Moc kind="..."> ブロックを読み、build 時に図式を生成して
// ブロックの直前に差し込む remark plugin。
//
// - ブロック内の記法は kind ごとのパーサ（moc-kinds）で正規形に落ちる
// - 図式は moc-render が白黒の HTML / SVG で組む（client JS ゼロ、ノードはリンク）
// - kind="graph" は中身が辺の DSL なので、描画後は本文として出さない（children を消す）
// - Moc 内の未解決 wikilink は production build を落とす（remark-wikilink と同方針）

import { visit } from 'unist-util-visit';
import { scanNotes } from './wikilinks.mjs';
import { parseMoc } from './moc-kinds.mjs';
import { renderMocDiagram } from './moc-render.mjs';

export function remarkMoc() {
  return (tree, file) => {
    const targets = [];
    visit(tree, 'mdxJsxFlowElement', (node, index, parent) => {
      if (node.name === 'Moc' && parent) targets.push({ node, parent });
    });
    if (targets.length === 0) return;

    const source = String(file);
    const { byTitle } = scanNotes();
    const resolve = (title) => {
      const n = byTitle.get(title.trim());
      if (!n) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Moc 内の未解決 wikilink [[${title.trim()}]] (${file?.path ?? '不明なファイル'})`);
        }
        return { title: title.trim(), href: null, isMoc: false, broken: true };
      }
      return {
        title: n.title,
        href: n.slug === '' ? '/' : `/${n.slug}/`,
        isMoc: n.isMoc,
        broken: false,
      };
    };

    for (const { node, parent } of targets) {
      const kind = node.attributes?.find((a) => a.name === 'kind')?.value ?? 'sequence';
      const start = node.position?.start?.offset;
      const end = node.position?.end?.offset;
      if (start == null || end == null) continue;
      const inner = source
        .slice(start, end)
        .replace(/^<Moc\b[^>]*>/, '')
        .replace(/<\/Moc>\s*$/, '');
      const nf = parseMoc(typeof kind === 'string' ? kind : 'sequence', inner);
      const html = renderMocDiagram(nf, resolve);
      if (html) {
        const idx = parent.children.indexOf(node);
        parent.children.splice(idx, 0, { type: 'html', value: html });
      }
      // graph の中身は辺の DSL であって本文ではない
      if (nf.kind === 'graph') node.children = [];
    }
  };
}

export default remarkMoc;
