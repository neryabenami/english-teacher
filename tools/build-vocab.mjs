/* Builds the large word database (data/vocab.json) from open sources:
   - Word list and difficulty: FrequencyWords en_50k (CC BY-SA 4.0) — common words first.
   - Hebrew translation: data/dict-en-he.json (Wiktionary via kaikki.org, CC BY-SA 4.0).
   - Topic: Open English WordNet lexicographer files (CC BY 4.0) + small seed lists.
   - Example sentence with a human Hebrew translation: Tatoeba (CC BY 2.0 FR).
   Usage: node tools/build-vocab.mjs <dir with en_50k.txt, english-wordnet.xml, eng_sentences.tsv, heb_sentences.tsv, eng-heb_links.tsv>
   Writes data/vocab.json and tools/en-rank.json (used by the daily update). */
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
if (!dir) { console.error('usage: node tools/build-vocab.mjs <source dir>'); process.exit(1); }
const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');

import { STOP, BLOCK, LEVEL_BY_RANK } from './vocab-shared.mjs';

/* WordNet lexicographer file → app topic */
const LEX2CAT = {
  'noun.food': 'food', 'verb.consumption': 'food',
  'noun.animal': 'nature', 'noun.plant': 'nature', 'noun.object': 'nature', 'noun.phenomenon': 'nature', 'verb.weather': 'nature',
  'noun.body': 'health', 'verb.body': 'health', 'noun.state': 'health',
  'noun.location': 'travel', 'verb.motion': 'travel',
  'noun.possession': 'finance', 'verb.possession': 'finance',
  'verb.competition': 'sports',
  'noun.feeling': 'relationships', 'verb.emotion': 'relationships',
  'noun.person': 'work', 'noun.group': 'business'
};
const SEEDS = {
  airport: 'airport airline airplane plane flight pilot passenger passport luggage baggage suitcase terminal runway boarding departure arrival visa customs takeoff landing',
  hotel: 'hotel motel hostel room suite lobby reception receptionist guest booking reservation housekeeping towel pillow blanket elevator checkout resort',
  restaurant: 'restaurant menu waiter waitress chef cook dish meal dinner lunch breakfast dessert appetizer bill tip table order kitchen recipe cafe',
  shopping: 'shop store mall market supermarket cashier receipt discount sale price cheap expensive bargain refund customer basket cart buy sell purchase coupon',
  tech: 'computer software hardware internet website email phone smartphone app application device screen keyboard mouse laptop digital data network online password download upload program code robot technology battery camera video',
  sports: 'sport sports football soccer basketball tennis golf baseball team player coach game match goal score win lose champion championship league stadium race runner athlete medal olympic',
  business: 'business company firm market marketing manager management office meeting client customer contract deal profit sales boss employee employer startup industry',
  work: 'job work worker career salary office colleague interview resume promotion task project deadline schedule',
  family: 'family mother father mom dad parent parents brother sister son daughter baby child children kid kids husband wife grandmother grandfather uncle aunt cousin nephew niece',
  relationships: 'friend friendship love lover boyfriend girlfriend partner date dating marriage married wedding divorce kiss hug relationship romantic'
};
const SEED_CAT = {};
for (const [cat, words] of Object.entries(SEEDS)) for (const w of words.split(/\s+/)) SEED_CAT[w] = cat;

/* ---------- 1. frequency ranks ---------- */
const RANK = new Map();
read('en_50k.txt').split('\n').forEach((l, i) => { const w = l.split(' ')[0]; if (w && !RANK.has(w)) RANK.set(w, i); });

/* ---------- 2. dictionary ---------- */
const DICT = JSON.parse(fs.readFileSync('data/dict-en-he.json', 'utf8')).entries;

/* ---------- 3. WordNet lemma → topic of its most common sense ---------- */
console.log('reading WordNet…');
const wn = read('english-wordnet.xml');
const SYN_LEX = new Map();
for (const m of wn.matchAll(/<Synset id="([^"]+)"[^>]*lexfile="([^"]+)"/g)) SYN_LEX.set(m[1], m[2]);
const LEMMA = new Map(); // lemma -> {pos -> [lexfile of senses in order]}
for (const m of wn.matchAll(/<LexicalEntry[^>]*>([\s\S]*?)<\/LexicalEntry>/g)) {
  const head = m[1].match(/<Lemma writtenForm="([^"]+)" partOfSpeech="(\w)"/);
  if (!head) continue;
  const lemma = head[1].toLowerCase();
  if (!/^[a-z]+$/.test(lemma)) continue;
  const lex = [...m[1].matchAll(/<Sense [^>]*synset="([^"]+)"/g)].map((s) => SYN_LEX.get(s[1])).filter(Boolean);
  const e = LEMMA.get(lemma) || {};
  e[head[2]] = (e[head[2]] || []).concat(lex);
  LEMMA.set(lemma, e);
}
const topicOf = (w) => {
  if (SEED_CAT[w]) return SEED_CAT[w];
  const e = LEMMA.get(w);
  if (!e) return 'daily';
  for (const pos of ['n', 'v', 'a', 's', 'r']) {
    const first = (e[pos] || [])[0];
    if (first) return LEX2CAT[first] || 'daily';
  }
  return 'daily';
};

/* ---------- 4. words already curated in the app ---------- */
const curated = new Set();
const dataJs = fs.readFileSync('js/data.js', 'utf8');
for (const m of dataJs.matchAll(/^([a-z][a-z' -]*)\|/gm)) curated.add(m[1].toLowerCase());

/* ---------- 5. choose the words ---------- */
const chosen = [];
for (const [w, r] of RANK) {
  if (r >= 20000) break;
  if (!/^[a-z]{3,}$/.test(w) || STOP.has(w) || BLOCK.has(w) || curated.has(w)) continue;
  if (!DICT[w] || !LEMMA.has(w)) continue;
  chosen.push({ t: w, r, he: DICT[w], lvl: LEVEL_BY_RANK(r), cat: topicOf(w) });
}
const WANT = new Set(chosen.map((c) => c.t));

/* ---------- 6. Tatoeba example sentences (English with a human Hebrew translation) ---------- */
console.log('reading Tatoeba…');
const heb = new Map();
for (const l of read('heb_sentences.tsv').split('\n')) { const [id, , text] = l.split('\t'); if (text) heb.set(id, text.trim()); }
const links = new Map();
for (const l of read('eng-heb_links.tsv').split('\n')) { const [e, h] = l.split('\t'); if (e && h && heb.has(h.trim()) && !links.has(e)) links.set(e, h.trim()); }
const best = new Map(); // word -> {en, he, score}
for (const l of read('eng_sentences.tsv').split('\n')) {
  const [id, , text] = l.split('\t');
  if (!text || !links.has(id)) continue;
  const en = text.trim();
  const toks = en.toLowerCase().match(/[a-z']+/g) || [];
  if (toks.length < 4 || toks.length > 12 || toks.some((t) => BLOCK.has(t))) continue;
  const score = Math.abs(toks.length - 7);
  for (const t of new Set(toks)) {
    if (!WANT.has(t)) continue;
    const cur = best.get(t);
    if (!cur || score < cur.score) best.set(t, { en, he: heb.get(links.get(id)), score });
  }
}

/* ---------- 7. write ---------- */
const today = new Date().toISOString().slice(0, 10);
const words = chosen.map((c) => { const ex = best.get(c.t); return [c.t, c.he, c.lvl, c.cat, ex ? ex.en : '', ex ? ex.he : '', '', ex ? 't' : '']; });
fs.writeFileSync('data/vocab.json', JSON.stringify({
  updated: today,
  sources: ['FrequencyWords (CC BY-SA 4.0)', 'Wiktionary via kaikki.org (CC BY-SA 4.0)', 'Open English WordNet (CC BY 4.0)', 'Tatoeba (CC BY 2.0 FR)'],
  fields: ['t', 'he', 'lvl', 'cat', 'ex', 'exHe', 'added', 'src'],
  scanned: [],
  words
}));
const rank = {};
for (const [w, r] of RANK) if (r < 40000 && /^[a-z]{3,}$/.test(w)) rank[w] = r;
fs.writeFileSync('tools/en-rank.json', JSON.stringify(rank));
// base forms (lemmas) known to WordNet, limited to reasonably common words — the daily update accepts only these
fs.writeFileSync('tools/en-lemmas.json', JSON.stringify([...LEMMA.keys()].filter((w) => rank[w] !== undefined && w.length > 2).sort()));
const byCat = words.reduce((m, w) => ((m[w[3]] = (m[w[3]] || 0) + 1), m), {});
const byLvl = words.reduce((m, w) => ((m[w[2]] = (m[w[2]] || 0) + 1), m), {});
console.log('words', words.length, 'with examples', words.filter((w) => w[4]).length, byLvl, byCat);
console.log('size KB', Math.round(fs.statSync('data/vocab.json').size / 1024));
