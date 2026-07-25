// wikilinks — ノートの走査と [[タイトル]] の解決。
//
// Obsidian と同じく、ノートはタイトルで指す。src/content/docs/ 以下の
// frontmatter `title` を集めて タイトル → URL の対応を作る。
// remark plugin（リンク変換）と Backlinks コンポーネント（被リンク一覧）の両方から使う。
//
// ファイル数は高々数百なので、毎回フルスキャンで足りる（dev の編集にも自然に追随する）。

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const DOCS_DIR = path.resolve('src/content/docs');

export const WIKILINK_RE = /\[\[([^\]|#]+)(#[^\]|]*)?(\|[^\]]*)?\]\]/g;

/** 'notes/category.mdx' → slug 'notes/category'（index は親ディレクトリに畳む） */
function toSlug(relPath) {
  let slug = relPath.replace(/\.(md|mdx)$/, '');
  if (slug === 'index') return '';
  slug = slug.replace(/\/index$/, '');
  return slug;
}

function frontmatterTitle(source) {
  const m = source.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const line = m[1].match(/^title:\s*(.+)\s*$/m);
  if (!line) return null;
  return line[1].replace(/^['"]|['"]$/g, '');
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.(md|mdx)$/.test(entry.name)) yield full;
  }
}

/**
 * 全ノートを走査する。
 * @returns {{ byTitle: Map<string, {slug: string, title: string}>,
 *             notes: {slug: string, title: string, outTitles: string[]}[] }}
 */
export function scanNotes() {
  const byTitle = new Map();
  const notes = [];
  for (const file of walk(DOCS_DIR)) {
    const source = readFileSync(file, 'utf8');
    const relPath = path.relative(DOCS_DIR, file);
    const slug = toSlug(relPath);
    const title = frontmatterTitle(source) ?? slug;
    const outTitles = [...source.matchAll(WIKILINK_RE)].map((m) => m[1].trim());
    const note = { slug, title, outTitles };
    notes.push(note);
    byTitle.set(title, note);
  }
  return { byTitle, notes };
}

/** タイトル → URL（見つからなければ null） */
export function resolveTitle(byTitle, title) {
  const note = byTitle.get(title.trim());
  if (!note) return null;
  return note.slug === '' ? '/' : `/${note.slug}/`;
}

/**
 * slug のノートへリンクしている全ノート（backlinks）。
 * MoC（moc/ 配下）とそれ以外を分けて返す。
 */
export function backlinksFor(slug) {
  const { byTitle, notes } = scanNotes();
  const target = notes.find((n) => n.slug === slug);
  if (!target) return { mocs: [], notes: [] };
  const linking = notes.filter(
    (n) => n.slug !== slug && n.outTitles.some((t) => byTitle.get(t)?.slug === slug),
  );
  return {
    mocs: linking.filter((n) => n.slug.startsWith('moc/')),
    notes: linking.filter((n) => !n.slug.startsWith('moc/')),
  };
}
