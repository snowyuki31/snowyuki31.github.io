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

// <Moc>（目録ブロック）。この中の wikilink だけが階層の辺（親子）になる。
// 本文中の wikilink は横のつながり（言及）で、階層に影響しない。
export const MOC_RE = /<Moc\b([^>]*)>([\s\S]*?)<\/Moc>/g;

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
 * @returns {{ byTitle: Map<string, object>,
 *             notes: {slug: string, title: string, outTitles: string[],
 *                     proseTitles: string[], mocTitles: string[], isMoc: boolean}[] }}
 */
export function scanNotes() {
  const byTitle = new Map();
  const notes = [];
  for (const file of walk(DOCS_DIR)) {
    const source = readFileSync(file, 'utf8');
    const relPath = path.relative(DOCS_DIR, file);
    const slug = toSlug(relPath);
    const title = frontmatterTitle(source) ?? slug;
    const titlesIn = (text) => [...text.matchAll(WIKILINK_RE)].map((m) => m[1].trim());
    const mocBodies = [...source.matchAll(MOC_RE)].map((m) => m[2]);
    const note = {
      slug,
      title,
      outTitles: titlesIn(source),
      // 本文（Moc 外）の言及。backlinks はこちらを使う
      proseTitles: titlesIn(source.replace(MOC_RE, '')),
      // 目録に載っているノート = このページの子
      mocTitles: [...new Set(mocBodies.flatMap(titlesIn))],
      isMoc: mocBodies.length > 0,
    };
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
 * slug のノートを本文中（Moc 外）で言及しているノート（backlinks）。
 * 目録経由の所属はパンくず（階層）が示すので、ここには含めない。
 */
export function backlinksFor(slug) {
  const { byTitle, notes } = scanNotes();
  return notes.filter(
    (n) => n.slug !== slug && n.proseTitles.some((t) => byTitle.get(t)?.slug === slug),
  );
}
