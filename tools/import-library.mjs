/* Imports reading-library articles into data/library/ from a folder with one sub-folder per topic. Two layouts are read:
   - the engoo-daily project (github.com/neryabenami/engoo-daily, fetched every night): Business_Politics/<title>_level<n>.txt,
     with "Title:" / "Level:" lines on top and the text after the ARTICLE line;
   - a plain folder: "Business & Politics/<title> - Level <n>.txt" with only the text (paragraphs separated by blank lines).
   Usage: node tools/import-library.mjs "<folder>" [per-topic, default all]
   Articles already imported are kept and never added twice. */
import fs from 'node:fs';
import path from 'node:path';

const SRC = process.argv[2];
const PER = +(process.argv[3] || Infinity);
if (!SRC || !fs.existsSync(SRC)) { console.error('usage: node tools/import-library.mjs "<folder>" [per-topic]'); process.exit(1); }

const TOPICS = {
  business: ['Business_Politics', 'Business & Politics'], culture: ['Culture_Society', 'Culture & Society'],
  health: ['Health_Lifestyle', 'Health & Lifestyle'], science: ['Science_Technology', 'Science & Technology'],
  travel: ['Travel_Experiences', 'Travel & Experiences']
};
const OUT = 'data/library';
fs.mkdirSync(OUT, { recursive: true });
const indexFile = path.join(OUT, 'index.json');
const index = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, 'utf8')) : { articles: [] };
const have = new Set(index.articles.map((a) => a.id));
const slug = (t) => t.toLowerCase().replace(/['’"]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
// Engoo markup: {{prn:4,600|four thousand...}} -> 4,600 ; _Book Title_ -> Book Title
const clean = (s) => s.replace(/\{\{prn:([^|}]*)\|[^}]*\}\}/g, '$1').replace(/(^|[\s("'“])_\s*([^_\n]+?)\s*_(?=$|[\s.,;:!?)"'”’]|'s)/g, '$1$2').replace(/\s+/g, ' ').trim();

function read(file, name) {
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').replace(/^﻿/, '');
  const head = text.match(/^Title:\s*(.+)$/m);
  if (head) { // engoo-daily layout
    const level = +((text.match(/^Level:\s*(\d+)/m) || [])[1] || (name.match(/_level(\d+)\.txt$/i) || [])[1]);
    const body = text.split(/^ARTICLE\s*\n-+\s*$/m)[1] || '';
    return { title: clean(head[1]), level, paragraphs: body.split(/\n\s*\n/).map(clean).filter(Boolean) };
  }
  const m = name.match(/^(.*?)\s*-\s*Level\s*(\d+)\.txt$/i);
  if (!m) return null;
  return { title: m[1].trim(), level: +m[2], paragraphs: text.split(/\n\s*\n/).map(clean).filter(Boolean) };
}

for (const [cat, folders] of Object.entries(TOPICS)) {
  let added = 0, looked = 0;
  for (const folder of folders) {
    const dir = path.join(SRC, folder);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((f) => /\.txt$/i.test(f)).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })).slice(0, PER);
    for (const f of files) {
      looked++;
      const a = read(path.join(dir, f), f);
      if (!a || !a.title || !(a.level >= 1)) { console.warn('skipped (no title or level):', f); continue; }
      const id = cat + '-' + slug(a.title);
      if (have.has(id)) continue;
      if (a.paragraphs.length < 2 || a.paragraphs.join(' ').split(/\s+/).length < 80) { console.warn('skipped (too short):', f); continue; }
      const words = a.paragraphs.join(' ').split(/\s+/).length;
      fs.writeFileSync(path.join(OUT, id + '.json'), JSON.stringify({ id, title: a.title, cat, level: a.level, paragraphs: a.paragraphs }));
      index.articles.push({ id, title: a.title, cat, level: a.level, minutes: Math.max(1, Math.round(words / 150)) });
      have.add(id); added++;
    }
  }
  console.log(`${cat}: ${added} added (${looked} looked at)`);
}
index.updated = new Date().toISOString();
fs.writeFileSync(indexFile, JSON.stringify(index));
console.log('library:', index.articles.length, 'articles');
