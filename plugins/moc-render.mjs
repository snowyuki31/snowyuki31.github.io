// moc-render — Moc の正規形を図式として描く。
//
// sequence / grouping は HTML+CSS（テキスト幅をブラウザに任せられる・折り返せる）。
// graph だけ build 時に単純なレイヤードレイアウトで SVG を組む。
// どのノードもクリック可能なリンク。MoC ノート（それ自体が目録を持つノート）は
// 二重枠にする = 展開できるノード（クリックでそのページ = その図式へ潜る）。
// トンマナは白黒のみ。

function esc(s) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

function nodeHtml(n) {
  const cls = ['moc-node', n.isMoc ? 'moc-node--moc' : null, n.broken ? 'moc-node--broken' : null]
    .filter(Boolean)
    .join(' ');
  return n.href
    ? `<a class="${cls}" href="${n.href}">${esc(n.title)}</a>`
    : `<span class="${cls}">${esc(n.title)}</span>`;
}

function htmlSequence(nf, resolve) {
  const items = nf.nodes.map((t) => nodeHtml(resolve(t)));
  return `<figure class="moc-diagram moc-diagram--sequence">${items.join(
    '<span class="moc-arrow" aria-hidden="true">→</span>',
  )}</figure>`;
}

function htmlGrouping(nf, resolve) {
  const clusters = nf.groups.map((g) => {
    const label = g.label ? `<span class="moc-cluster-label">${esc(g.label)}</span>` : '';
    return `<div class="moc-cluster">${label}${g.members.map((t) => nodeHtml(resolve(t))).join('')}</div>`;
  });
  return `<figure class="moc-diagram moc-diagram--grouping">${clusters.join('')}</figure>`;
}

/** CJK はおよそ全角、それ以外は半角強で見積もる（SVG は build 時に幅が要る） */
function estWidth(text, fs) {
  let w = 0;
  for (const ch of text) w += ch.codePointAt(0) > 0x2e7f ? fs : fs * 0.58;
  return w;
}

function svgGraph(nf, resolve) {
  const FS = 13;
  const PADX = 12;
  const NH = 32;
  const GAPX = 64;
  const GAPY = 20;
  const PAD = 6;

  const nodes = nf.nodes.map((t) => resolve(t));
  const idx = new Map(nf.nodes.map((t, i) => [t, i]));
  const edges = nf.edges.filter((e) => idx.has(e.from) && idx.has(e.to));

  // 最長路レイヤリング（循環は guard で打ち切り = だいたいの位置に置く）
  const layerOf = new Array(nodes.length).fill(0);
  let changed = true;
  let guard = 0;
  while (changed && guard++ < 100) {
    changed = false;
    for (const e of edges) {
      const a = idx.get(e.from);
      const b = idx.get(e.to);
      if (layerOf[b] < layerOf[a] + 1) {
        layerOf[b] = layerOf[a] + 1;
        changed = true;
      }
    }
  }
  const nLayers = Math.max(...layerOf, 0) + 1;
  const layers = Array.from({ length: nLayers }, () => []);
  nodes.forEach((_, i) => layers[layerOf[i]].push(i));

  const widths = nodes.map((n) => Math.ceil(estWidth(n.title, FS)) + PADX * 2);
  const colW = layers.map((l) => Math.max(...l.map((i) => widths[i])));
  const colX = [];
  let x = PAD;
  for (const w of colW) {
    colX.push(x);
    x += w + GAPX;
  }
  const totalW = x - GAPX + PAD;
  const colH = layers.map((l) => l.length * NH + (l.length - 1) * GAPY);
  const totalH = Math.max(...colH) + PAD * 2;

  const pos = new Array(nodes.length);
  layers.forEach((l, li) => {
    let y = (totalH - colH[li]) / 2;
    for (const i of l) {
      pos[i] = { x: colX[li] + (colW[li] - widths[i]) / 2, y, w: widths[i] };
      y += NH + GAPY;
    }
  });

  const parts = [];
  for (const e of edges) {
    const a = pos[idx.get(e.from)];
    const b = pos[idx.get(e.to)];
    const x1 = a.x + a.w;
    const y1 = a.y + NH / 2;
    const x2 = b.x - 8;
    const y2 = b.y + NH / 2;
    const mx = (x1 + x2) / 2;
    parts.push(
      `<path d="M${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}" fill="none" stroke="#000"/>`,
      `<path d="M${x2 + 8} ${y2} l-8 -3.6 l0 7.2 z" fill="#000"/>`,
    );
    if (e.label) {
      parts.push(
        `<text x="${mx}" y="${(y1 + y2) / 2 - 6}" text-anchor="middle" font-size="${FS - 2}" fill="#000" stroke="#fff" stroke-width="3" paint-order="stroke">${esc(e.label)}</text>`,
      );
    }
  }
  nodes.forEach((n, i) => {
    const p = pos[i];
    const rect = `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${NH}" fill="#fff" stroke="${
      n.broken ? '#adb5bd' : '#000'
    }"${n.broken ? ' stroke-dasharray="4 3"' : ''}/>`;
    const dbl = n.isMoc
      ? `<rect x="${p.x + 2.5}" y="${p.y + 2.5}" width="${p.w - 5}" height="${NH - 5}" fill="none" stroke="#000"/>`
      : '';
    const label = `<text x="${p.x + p.w / 2}" y="${p.y + NH / 2}" text-anchor="middle" dominant-baseline="central" font-size="${FS}" fill="#000">${esc(n.title)}</text>`;
    parts.push(n.href ? `<a href="${n.href}">${rect}${dbl}${label}</a>` : `<g>${rect}${dbl}${label}</g>`);
  });

  return `<figure class="moc-diagram moc-diagram--graph"><svg viewBox="0 0 ${totalW} ${totalH}" width="${totalW}" height="${totalH}" role="img" aria-label="MoC 図式">${parts.join('')}</svg></figure>`;
}

/**
 * @param nf parseMoc の正規形
 * @param resolve (title) => { title, href: string|null, isMoc: boolean, broken: boolean }
 */
export function renderMocDiagram(nf, resolve) {
  if (nf.nodes.length === 0) return '';
  if (nf.kind === 'graph') return svgGraph(nf, resolve);
  if (nf.kind === 'grouping') return htmlGrouping(nf, resolve);
  return htmlSequence(nf, resolve);
}
