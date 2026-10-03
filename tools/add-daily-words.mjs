/* Adds new words to data/vocab.json from the newest real articles (runs in GitHub Actions).
   - Up to MAX_PER_DAY new words a day, never removes anything.
   - A word qualifies when it appears in lowercase in an article (so not a name), has a Hebrew
     translation in the offline dictionary, is reasonably common, and is not in the database yet.
   - The example is the real sentence from the article (with source and date); its Hebrew
     translation comes from MyMemory (free, no key) when available.
   - The topic follows the article's topic. */
import fs from 'node:fs';
import path from 'node:path';
import { STOP, BLOCK, LEVEL_BY_RANK } from './vocab-shared.mjs';

const MAX_PER_DAY = 25;
const PER_ARTICLE = 3;
const ART = 'data/articles';
const READ2CAT = { news: 'daily', tech: 'tech', science: 'nature', sports: 'sports', business: 'business', finance: 'finance', nature: 'nature', culture: 'daily', entertainment: 'daily', travel: 'travel', lifestyle: 'health' };

const vocab = JSON.parse(fs.readFileSync('data/vocab.json', 'utf8'));
const DICT = JSON.parse(fs.readFileSync('data/dict-en-he.json', 'utf8')).entries;
const RANK = JSON.parse(fs.readFileSync('tools/en-rank.json', 'utf8'));
const index = JSON.parse(fs.readFileSync(path.join(ART, 'index.json'), 'utf8'));

const today = new Date().toISOString().slice(0, 10);
const have = new Set(vocab.words.map((w) => w[0]));
for (const m of fs.readFileSync('js/data.js', 'utf8').matchAll(/^([a-z][a-z' -]*)\|/gm)) have.add(m[1].toLowerCase());
let addedToday = vocab.words.filter((w) => w[6] === today).length;
if (addedToday >= MAX_PER_DAY) { console.log('daily quota already reached'); process.exit(0); }

const scanned = new Set(vocab.scanned || []);
const LEMMAS = new Set(JSON.parse(fs.readFileSync('tools/en-lemmas.json', 'utf8')));
// inflected forms ("believed", "babies") map to their base form; only WordNet base forms qualify
const lemmaOf = (w) => {
  const stripped = [w.replace(/ies$/, 'y'), w.replace(/([bcdfgklmnprstvz])\1(ed|ing)$/, '$1'), w.replace(/ied$/, 'y'), w.replace(/es$/, ''), w.replace(/s$/, ''),
    w.replace(/ed$/, 'e'), w.replace(/ed$/, ''), w.replace(/ing$/, 'e'), w.replace(/ing$/, '')].filter((x) => x !== w);
  const inflected = /(s|ed|ing)$/.test(w);
  const order = inflected ? [...stripped, w] : [w, ...stripped];
  const hit = order.find((x) => x.length > 2 && LEMMAS.has(x) && DICT[x] && RANK[x] !== undefined);
  return hit && (hit !== w || !inflected || !stripped.some((x) => LEMMAS.has(x))) ? hit : null;
};
async function translate(text) {
  try {
    const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 480))}&langpair=en|he`);
    const j = await r.json();
    const t = j && j.responseStatus === 200 ? String(j.responseData.translatedText || '') : '';
    return /MYMEMORY|QUOTA|INVALID/i.test(t) ? '' : t;
  } catch { return ''; }
}

const fresh = index.articles.filter((a) => !scanned.has(a.id) && a.source === 'The Conversation').sort((x, y) => new Date(y.date) - new Date(x.date));
const added = [];
for (const meta of fresh) {
  if (addedToday + added.length >= MAX_PER_DAY) break;
  scanned.add(meta.id);
  let body;
  try { body = JSON.parse(fs.readFileSync(path.join(ART, meta.id + '.json'), 'utf8')); } catch { continue; }
  const text = body.paragraphs.filter((p) => !p.startsWith('## ')).join(' ');
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  const found = new Map();
  for (const s of sentences) {
    const words = s.split(/\s+/).length;
    if (words < 6 || words > 30) continue;
    for (const tok of s.match(/\b[a-z]{4,}\b/g) || []) {   // lowercase only: skips names
      const lemma = lemmaOf(tok);
      if (!lemma || have.has(lemma) || found.has(lemma) || STOP.has(lemma) || BLOCK.has(lemma)) continue;
      if (RANK[lemma] < 1500) continue;                     // very basic words are already covered
      found.set(lemma, s.trim());
    }
  }
  const pick = [...found.entries()].sort((a, b) => RANK[a[0]] - RANK[b[0]]).slice(0, PER_ARTICLE);
  for (const [lemma, sentence] of pick) {
    if (addedToday + added.length >= MAX_PER_DAY) break;
    have.add(lemma);
    added.push([lemma, DICT[lemma], LEVEL_BY_RANK(RANK[lemma]), READ2CAT[meta.cat] || 'daily', sentence, await translate(sentence), today,
      { s: meta.source, u: meta.url, d: meta.date.slice(0, 10) }]);
  }
}

vocab.scanned = [...scanned].slice(-600);
if (added.length) {
  vocab.words.push(...added);
  vocab.updated = today;
}
fs.writeFileSync('data/vocab.json', JSON.stringify(vocab));
console.log(`added ${added.length} words today (${addedToday + added.length} total today), database ${vocab.words.length}`);
for (const w of added) console.log(' ', w[0], '→', w[1], '|', w[3], w[2]);
