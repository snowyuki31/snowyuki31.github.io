// moc-kinds — <Moc> ブロックの kind registry。
//
// どの kind もパース結果は同じ正規形に落ちる:
//   { kind, nodes: [title], edges: [{from, to, label?}], groups: [{label?, members: [title]}] }
//
// 階層（パンくず・サイドバー）は正規形の nodes（所属）しか見ないので、
// kind を増やしても階層側は一切変わらない。kind は「ブロック内 markdown の読み方
// （parse）＋ 図式の描き方（moc-render 側）」のペアにすぎない。

import { WIKILINK_RE } from './wikilinks.mjs';

function linkTitles(text) {
  return [...text.matchAll(WIKILINK_RE)].map((m) => m[1].trim());
}

function dedupe(titles) {
  return [...new Set(titles)];
}

const kinds = {
  // 順序: J = 有限全順序。並び順そのものが価値。連続する 2 つを辺で結ぶ
  sequence: {
    parse(text) {
      const nodes = dedupe(linkTitles(text));
      return {
        nodes,
        edges: nodes.slice(1).map((to, i) => ({ from: nodes[i], to })),
        groups: [],
      };
    },
  },

  // グルーピング: J = 分割（離散圏の直和）。list の 1 行が 1 束。
  //   - ラベル: [[A]], [[B]]
  //   - [[C]], [[D]]          （ラベルなしの束）
  grouping: {
    parse(text) {
      const groups = [];
      for (const line of text.split('\n')) {
        const m = line.match(/^\s*[-*]\s+(?:([^:：[\]]+)[:：])?\s*(.*)$/);
        if (!m) continue;
        const members = linkTitles(m[2]);
        if (members.length === 0) continue;
        groups.push({ label: m[1]?.trim(), members });
      }
      return { nodes: dedupe(groups.flatMap((g) => g.members)), edges: [], groups };
    },
  },

  // 自由グラフ: J = 型付き辺を持つ quiver。1 行に 1 本の道を書く。
  //   [[A]] --支持--> [[B]] --> [[C]]
  //   [[孤立ノート]]
  // 辺ラベルに - と > は使えない
  graph: {
    parse(text) {
      const TOKEN = /\[\[([^\]|#]+)[^\]]*\]\]|--([^->]+)-->|-->/g;
      const nodes = [];
      const edges = [];
      for (const line of text.split('\n')) {
        let prev = null;
        let pending = null;
        for (const m of line.matchAll(TOKEN)) {
          if (m[1] != null) {
            const title = m[1].trim();
            nodes.push(title);
            if (pending != null && prev != null) {
              edges.push({ from: prev, to: title, label: pending || undefined });
            }
            prev = title;
            pending = null;
          } else {
            pending = (m[2] ?? '').trim();
          }
        }
      }
      return { nodes: dedupe(nodes), edges, groups: [] };
    },
  },
};

/** @returns {{kind: string, nodes: string[], edges: {from:string,to:string,label?:string}[], groups: {label?:string,members:string[]}[]}} */
export function parseMoc(kind, text) {
  const k = kinds[kind ?? 'sequence'];
  if (!k) {
    throw new Error(`未知の Moc kind "${kind}"（使えるのは ${Object.keys(kinds).join(' / ')}）`);
  }
  return { kind: kind ?? 'sequence', ...k.parse(text) };
}

export const KNOWN_KINDS = Object.keys(kinds);
