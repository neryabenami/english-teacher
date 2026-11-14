/* Imports reading-library articles from a local folder into data/library/.
   The folder has one sub-folder per topic, and in it text files named "<title> - Level <n>.txt" (paragraphs separated by blank lines).
   Usage: node tools/import-library.mjs "<folder>" [per-topic=10]
   Takes the first N files of each topic in alphabetical order; articles already imported are kept. */
import fs from 'node:fs';
import path from 'node:path';

const SRC = process.argv[2];
const PER = +(process.argv[3] || 10);
if (!SRC || !fs.existsSync(SRC)) { console.error('usage: node tools/import-library.mjs "<folder>" [per-topic]'); process.exit(1); }

const TOPICS = { 'Business & Politics': 'business', 'Culture & Society': 'culture', 'Health & Lifestyle': 'health', 'Science & Technology': 'science', 'Travel & Experiences': 'travel' };
const OUT = 'data/library';
fs.mkdirSync(OUT, { recursive: true });
const indexFile = path.join(OUT, 'index.json');
const index = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, 'utf8')) : { articles: [] };
const have = new Set(index.articles.map((a) => a.id));
const slug = (t) => t.toLowerCase().replace(/['’"]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);

for (const [folder, cat] of Object.entries(TOPICS)) {
  const dir = path.join(SRC, folder);
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir).filter((f) => /\.txt$/i.test(f)).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })).slice(0, PER);
  let added = 0;
  for (const f of files) {
    const m = f.match(/^(.*?)\s*-\s*Level\s*(\d+)\.txt$/i);
    if (!m) { console.warn('skipped (no level in the name):', f); continue; }
    const title = m[1].trim(), level = +m[2];
    const id = cat + '-' + slug(title);
    if (have.has(id)) continue;
    const text = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\r\n/g, '\n').replace(/^﻿/, '');
    const paragraphs = text.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
    if (!paragraphs.length) { console.warn('skipped (empty):', f); continue; }
    const words = paragraphs.join(' ').split(/\s+/).length;
    fs.writeFileSync(path.join(OUT, id + '.json'), JSON.stringify({ id, title, cat, level, paragraphs }));
    index.articles.push({ id, title, cat, level, minutes: Math.max(1, Math.round(words / 150)) });
    have.add(id); added++;
  }
  console.log(`${folder}: ${added} added (${files.length} looked at)`);
}
index.updated = new Date().toISOString();
fs.writeFileSync(indexFile, JSON.stringify(index));
console.log('library:', index.articles.length, 'articles');
