// remark-tikz — ```tikz / ```latex ブロックを build 時に SVG へコンパイルする remark plugin。
//
// エンジンは node-tikzjax。これは vault(Obsidian) の obsidian-tikzjax、および pkm の
// utils/tikzjax-lint と同一エンジンなので、vault で lint が緑になった図はそのまま同じ絵になる。
// client へ runtime を配らないので、図は素の <svg> として HTML に載る（軽い・クロール可能）。
//
// 注意: node-tikzjax は同時に複数インスタンスを走らせられない。Astro は page を並列に
// build するため、全 compile を 1 本のキューに直列化する（tikzjax-lint/compile.mjs と同じ理由）。

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { visit } from 'unist-util-visit';

const CACHE_DIR = path.resolve('.cache/tikz');
const LANGS = new Set(['tikz', 'latex']);

// node-tikzjax は CJS + wasm + 実 TeX ディストリビューション。Vite の module runner
// 経由で読むと build 中に "module runner has been closed" で落ちるので、
// createRequire で Vite のモジュールグラフの外から素の Node として読む。
const require = createRequire(import.meta.url);

let _tex2svg = null;
function getTex2svg() {
  if (_tex2svg) return _tex2svg;
  const m = require('node-tikzjax');
  // default export は環境により二重ラップされる
  _tex2svg = m?.default?.default ?? m?.default ?? m;
  if (typeof _tex2svg !== 'function') {
    throw new Error('node-tikzjax の tex2svg を解決できませんでした');
  }
  return _tex2svg;
}

// compile を直列化するキュー
let _tail = Promise.resolve();
function enqueue(fn) {
  const result = _tail.then(fn);
  _tail = result.catch(() => {});
  return result;
}

/** TeX のログから `! ...` エラー行を抜き出す（失敗時の表示用） */
function firstTexError(log) {
  for (const line of log.split('\n')) {
    if (line.startsWith('! ')) return line.slice(2).replace(/\s*\.\s*$/, '');
  }
  return null;
}

async function compile(source) {
  const tex2svg = getTex2svg();
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.map(String).join(' '));
  let svg = null;
  let threw = null;
  try {
    svg = await tex2svg(source, { showConsole: true });
  } catch (e) {
    threw = e;
  } finally {
    console.log = orig;
  }
  const log = logs.join('\n');
  const texError = firstTexError(log);
  if (!svg || texError) {
    throw new Error(texError ?? String(threw?.message ?? threw ?? 'TikZ のコンパイルに失敗しました'));
  }
  return svg;
}

/** content hash でキャッシュ。図 1 枚のコンパイルは秒単位なので効く。 */
async function compileCached(source) {
  const hash = createHash('sha256').update(source).digest('hex').slice(0, 16);
  const file = path.join(CACHE_DIR, `${hash}.svg`);
  try {
    return await readFile(file, 'utf8');
  } catch {
    // cache miss
  }
  const svg = await enqueue(() => compile(source));
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(file, svg, 'utf8');
  return svg;
}

// TikZ の素の出力は小さめなので、表示は定率で拡大する（ベクタなので劣化しない）。
// ルート <svg> の width/height だけ触り、viewBox は変えない。キャッシュには適用前の svg が載る。
const DISPLAY_SCALE = 1.6;

function scaleSvg(svg) {
  return svg.replace(/<svg\b[^>]*>/, (tag) =>
    tag.replace(
      /(width|height)="([\d.]+)([a-z%]*)"/g,
      (_, attr, num, unit) => `${attr}="${(parseFloat(num) * DISPLAY_SCALE).toFixed(2)}${unit}"`,
    ),
  );
}

function clean(svg) {
  return scaleSvg(svg.replace(/<\?xml[^>]*\?>/g, '').replace(/<!DOCTYPE[^>]*>/g, '').trim());
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

export function remarkTikz() {
  return async (tree, file) => {
    /** @type {{ node: any }[]} */
    const targets = [];
    visit(tree, 'code', (node) => {
      if (node.lang && LANGS.has(node.lang)) targets.push({ node });
    });
    if (targets.length === 0) return;

    for (const { node } of targets) {
      try {
        const svg = clean(await compileCached(node.value));
        node.type = 'html';
        node.value = `<figure class="tikz">${svg}</figure>`;
      } catch (err) {
        const where = `${file?.path ?? '不明なファイル'}:${node.position?.start?.line ?? '?'}`;
        const message = err instanceof Error ? err.message : String(err);
        // build は落として気付けるようにする（壊れた図を公開しない）。
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`TikZ のコンパイルに失敗 (${where}): ${message}`);
        }
        // dev は該当箇所だけエラー表示にして編集を続けられるようにする。
        node.type = 'html';
        node.value = `<figure class="tikz tikz--error"><p>TikZ 失敗 (${escapeHtml(where)})</p><pre>${escapeHtml(message)}</pre></figure>`;
      }
    }
  };
}

export default remarkTikz;
