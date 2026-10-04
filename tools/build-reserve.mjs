/* Builds tools/vocab-reserve.json: per-topic stock of new words, released 5 a day per topic by
   tools/add-daily-words.mjs. Topics come from Open English WordNet (CC BY 4.0): the words under a few
   seed concepts (e.g. everything under "airport", "aircraft", "luggage" → Airport) plus the semantic
   file of each word's main sense. Translation: data/dict-en-he.json (Wiktionary, CC BY-SA 4.0).
   Examples: Tatoeba (CC BY 2.0 FR). Order: most common words first (FrequencyWords, CC BY-SA 4.0).
   Usage: node tools/build-reserve.mjs <dir with en_50k.txt, english-wordnet.xml, eng_sentences.tsv, heb_sentences.tsv, eng-heb_links.tsv> */
import fs from 'node:fs';
import path from 'node:path';
import { STOP, BLOCK, LEVEL_BY_RANK } from './vocab-shared.mjs';

const dir = process.argv[2];
if (!dir) { console.error('usage: node tools/build-reserve.mjs <source dir>'); process.exit(1); }
const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');

/* most specific topics first: a word goes to the first topic whose concepts include it */
const SEEDS = [
  ['airport', ['airport', 'aircraft', 'airliner', 'airline', 'luggage', 'baggage', 'passenger', 'aviator', 'runway', 'flight attendant', 'customs', 'air travel', 'aviation', 'airfield', 'travel bag', 'ticket', 'passport', 'terminal']],
  ['hotel', ['hotel', 'lodging', 'hostel', 'bedroom', 'bedclothes', 'bed', 'furniture', 'toiletry', 'bathroom', 'reception', 'housekeeping', 'guest']],
  ['restaurant', ['restaurant', 'tableware', 'cutlery', 'dish', 'course', 'beverage', 'waiter', 'cook', 'kitchen utensil']],
  ['shopping', ['store', 'shop', 'merchandise', 'clothing', 'footwear', 'jewelry', 'cosmetic', 'shopper', 'price']],
  ['tech', ['computer', 'software', 'electronic device', 'electronic equipment', 'telecommunication', 'computer network', 'machine', 'engineer', 'programmer', 'device', 'electronics', 'computing', 'technology', 'gadget', 'appliance', 'circuit', 'data']],
  ['sports', ['sport', 'athlete', 'sports equipment', 'contest', 'ball game', 'stadium', 'coach', 'team']],
  ['finance', ['money', 'bank', 'tax', 'payment', 'investment', 'debt', 'currency', 'financial gain', 'fund']],
  ['business', ['business', 'company', 'commerce', 'market', 'management', 'businessman', 'trade', 'advertising']],
  ['work', ['occupation', 'worker', 'professional', 'workplace', 'employee', 'office', 'tool']],
  ['family', ['relative', 'family', 'parent', 'child', 'kin', 'marriage', 'household', 'offspring', 'spouse', 'sibling', 'ancestor', 'baby', 'wedding', 'home']],
  ['relationships', ['friend', 'lover', 'feeling', 'emotion', 'love', 'social relation', 'partner']],
  ['health', ['disease', 'illness', 'body part', 'medicine', 'medical care', 'doctor', 'injury', 'symptom', 'exercise']],
  ['food', ['food', 'fruit', 'vegetable', 'meat', 'baked goods', 'dessert', 'herb', 'spice']],
  ['nature', ['animal', 'plant', 'tree', 'flower', 'weather', 'body of water', 'geological formation', 'landscape', 'insect', 'bird']],
  ['travel', ['travel', 'vacation', 'tourist', 'vehicle', 'transport', 'road', 'city', 'country', 'ship']]
];
const LEX2CAT = { 'noun.food': 'food', 'verb.consumption': 'food', 'noun.animal': 'nature', 'noun.plant': 'nature', 'noun.object': 'nature',
  'noun.phenomenon': 'nature', 'verb.weather': 'nature', 'noun.body': 'health', 'verb.body': 'health', 'noun.location': 'travel', 'verb.motion': 'travel',
  'noun.possession': 'finance', 'verb.possession': 'finance', 'verb.competition': 'sports', 'noun.feeling': 'relationships', 'verb.emotion': 'relationships',
  'noun.person': 'work', 'noun.group': 'business' };

/* ---------- WordNet ---------- */
console.log('reading WordNet…');
const wn = read('english-wordnet.xml');
const SYN_LEX = new Map();
const CHILDREN = new Map(); // hypernym synset -> hyponym synsets
const INSTANCE = new Set();   // synsets of named individuals (people, places, brands)
for (const m of wn.matchAll(/<Synset id="([^"]+)"[^>]*lexfile="([^"]+)"[^>]*>([\s\S]*?)<\/Synset>/g)) {
  SYN_LEX.set(m[1], m[2]);
  if (/relType="instance_hypernym"/.test(m[3])) INSTANCE.add(m[1]);
  for (const r of m[3].matchAll(/<SynsetRelation relType="(hypernym|instance_hypernym)" target="([^"]+)"/g)) {
    if (!CHILDREN.has(r[2])) CHILDREN.set(r[2], []);
    CHILDREN.get(r[2]).push(m[1]);
  }
}
const SENSES = new Map();   // lemma -> { pos -> [synset ids in sense order] }
const PROPER = new Set();   // lowercase forms of proper nouns (Lee, Perry, Berlin…)
const FORMS = new Set();    // irregular inflected forms (said, won, geese…)
const FIRST_NAMES = new Set('james john robert michael william david richard joseph thomas charles chris christopher daniel matthew anthony mark donald steven paul andrew joshua kevin brian george timothy ronald jason edward jeffrey ryan jacob gary nicholas eric jonathan stephen larry justin scott brandon benjamin samuel frank gregory raymond alexander patrick jack dennis jerry tyler aaron jose adam nathan henry douglas zachary peter kyle noah ethan jeremy walter christian keith roger terry austin sean gerald carl harold dylan arthur lawrence jordan jesse bryan billy bruce gabriel joe logan albert willie alan eugene russell vincent philip bobby johnny bradley roy ralph louis randy harry mike tom ben sam bob jim tim rick nick dan max leo jake luke kate mary patricia jennifer linda elizabeth barbara susan jessica sarah karen lisa nancy betty margaret sandra ashley kimberly emily donna michelle carol amanda dorothy melissa deborah stephanie rebecca sharon laura cynthia kathleen amy angela shirley anna brenda pamela emma nicole helen samantha katherine christine debra rachel carolyn janet catherine maria heather diane ruth julie olivia joyce virginia victoria kelly lauren christina joan evelyn judith megan andrea cheryl hannah jacqueline martha gloria teresa ann sara madison frances kathryn janice jean abigail alice judy sophia grace denise amber doris marilyn danielle beverly isabella theresa diana natalie brittany charlotte marie kayla alexis lori molly holly lee perry collins turner cole chuck marc ally rouge hogan khan lance tanner ana mack mac patty geneva manhattan brazil berlin afghan guinea kitty buck jock'.split(' '));
const SYN_WORDS = new Map(); // synset -> [lemmas]
for (const m of wn.matchAll(/<LexicalEntry[^>]*>([\s\S]*?)<\/LexicalEntry>/g)) {
  const head = m[1].match(/<Lemma writtenForm="([^"]+)" partOfSpeech="(\w)"/);
  if (!head) continue;
  for (const fm of m[1].matchAll(/<Form writtenForm="([^"]+)"/g)) FORMS.add(fm[1].toLowerCase());
  if (/^[A-Z]/.test(head[1])) { PROPER.add(head[1].toLowerCase()); continue; } // proper nouns
  const lemma = head[1].toLowerCase();
  const syns = [...m[1].matchAll(/<Sense [^>]*synset="([^"]+)"/g)].map((s) => s[1]);
  const e = SENSES.get(lemma) || {};
  e[head[2]] = (e[head[2]] || []).concat(syns);
  SENSES.set(lemma, e);
  for (const s of syns) { if (!SYN_WORDS.has(s)) SYN_WORDS.set(s, []); SYN_WORDS.get(s).push(lemma); }
}
/* concept closures: every synset under a seed concept belongs to that topic (most specific topic first) */
const SYN_TOPIC = new Map();
for (const [cat, seeds] of SEEDS) {
  for (const seed of seeds) {
    const first = ((SENSES.get(seed) || {}).n || [])[0];
    if (!first) { console.warn('no noun sense for seed', seed); continue; }
    const queue = [[first, 0]];
    const seen = new Set();
    while (queue.length) {
      const [syn, depth] = queue.shift();
      if (seen.has(syn) || depth > 6) continue;
      seen.add(syn);
      if (!SYN_TOPIC.has(syn)) SYN_TOPIC.set(syn, cat);
      for (const c of CHILDREN.get(syn) || []) queue.push([c, depth + 1]);
    }
  }
}
/* a word's topic comes from its main (first) sense only, so rare senses don't misplace it */
const mainSense = (w) => { const e = SENSES.get(w) || {}; for (const pos of ['n', 'v', 'a', 's', 'r']) if ((e[pos] || [])[0]) return e[pos][0]; return null; };
const topicOf = (w) => { const s = mainSense(w); return s ? SYN_TOPIC.get(s) || LEX2CAT[SYN_LEX.get(s)] || 'daily' : 'daily'; };

/* ---------- candidates: translatable WordNet base forms, not yet in the app ---------- */
const RANK = new Map();
read('en_50k.txt').split('\n').forEach((l, i) => { const w = l.split(' ')[0]; if (w && !RANK.has(w)) RANK.set(w, i); });
const DICT = JSON.parse(fs.readFileSync('data/dict-en-he.json', 'utf8')).entries;
const have = new Set(JSON.parse(fs.readFileSync('data/vocab.json', 'utf8')).words.map((w) => w[0]));
for (const m of fs.readFileSync('js/data.js', 'utf8').matchAll(/^([a-z][a-z' -]*)\|/gm)) have.add(m[1].toLowerCase());
const cand = [];
for (const [w, r] of RANK) {
  if (r >= 50000 || !/^[a-z]{3,}$/.test(w) || STOP.has(w) || BLOCK.has(w) || have.has(w)) continue;
  if (!SENSES.has(w)) continue;
  const main = mainSense(w);
  if (!main || INSTANCE.has(main)) continue;                                  // names
  if (!DICT[w] && (PROPER.has(w) || FIRST_NAMES.has(w))) continue;           // most likely a name in everyday use
  if (FIRST_NAMES.has(w)) continue;
  if (FORMS.has(w)) continue;                                                // irregular forms (said, won…)
  if (/(ing|ed)$/.test(w) && SENSES.has(w.replace(/([bcdfgklmnprstvz])\1(ing|ed)$/, '$1'))) continue; // getting, stopped
  { const e = SENSES.get(w); if (!(e.n || e.v || e.a || e.s)) continue; }   // adverbs only (already, later)
  if (/s$/.test(w) && SENSES.has(w.slice(0, -1)) && !/ss$/.test(w)) continue; // plural forms
  if (/(ing|ed)$/.test(w) && (SENSES.has(w.replace(/(ing|ed)$/, '')) || SENSES.has(w.replace(/(ing|ed)$/, 'e')))) continue; // verb forms
  // no offline translation yet → the daily job translates it (MyMemory) when the word is released
  cand.push({ t: w, r, he: DICT[w] || '', lvl: LEVEL_BY_RANK(r), cat: topicOf(w) });
}
// specific topics can also take a few common words found only through the dictionary (multi-word terms excluded)
const WANT = new Set(cand.map((c) => c.t));

/* ---------- Tatoeba examples ---------- */
console.log('reading Tatoeba…');
const heb = new Map();
for (const l of read('heb_sentences.tsv').split('\n')) { const [id, , text] = l.split('\t'); if (text) heb.set(id, text.trim()); }
const links = new Map();
for (const l of read('eng-heb_links.tsv').split('\n')) { const [e, h] = l.split('\t'); if (e && h && heb.has(h.trim()) && !links.has(e)) links.set(e, h.trim()); }
const best = new Map();
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

/* ---------- write: per topic, most common first; words with an example go first within a band ---------- */
const reserve = {};
for (const c of cand) {
  const ex = best.get(c.t);
  (reserve[c.cat] = reserve[c.cat] || []).push([c.t, c.he, c.lvl, ex ? ex.en : '', ex ? ex.he : '', ex ? 't' : '', c.r]);
}
for (const list of Object.values(reserve)) list.sort((a, b) => Math.floor(a[6] / 2000) - Math.floor(b[6] / 2000) || (b[3] ? 1 : 0) - (a[3] ? 1 : 0) || a[6] - b[6]);
fs.writeFileSync('tools/vocab-reserve.json', JSON.stringify(reserve));
const days = Object.fromEntries(Object.entries(reserve).map(([k, v]) => [k, `${v.length} words ≈ ${Math.floor(v.length / 5)} days`]));
console.log(days);
