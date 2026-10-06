/* Daily additions to data/vocab.json (runs in GitHub Actions; safe to run several times a day):
   - 5 new words for each of the word topics, at the reader's level (READING_LEVEL, set from the app's profile).
     The words are real, common English words: the unused words of that level's frequency band (FrequencyWords,
     base forms only). Gemini sorts them into the topics and adds the Hebrew meaning and an example at that level.
     When a level's band runs out, words from the next band up are used. Without a Gemini key, the old reserve
     (tools/vocab-reserve.json) is used, at the same level only.
   - 5 new American slang terms, any level: the curated list (tools/slang-reserve.txt) first, then Gemini.
   Nothing is ever removed, and a word that exists in the app (also one marked as known) is never added again.
   vocab.updated becomes today's date when something was added. */
import fs from 'node:fs';
import { BLOCK, STOP } from './vocab-shared.mjs';
import { gemini, hasGemini } from './gemini.mjs';

const PER_TOPIC = 5;
const PER_SLANG = 5;
const TOPICS = {
  nature: 'nature, animals, plants, weather, environment', work: 'work, office, jobs, career', travel: 'travel, trips, tourism, places',
  family: 'family members and family life', relationships: 'relationships, friends, feelings, dating',
  sports: 'sports, fitness, games, competitions', tech: 'technology, computers, internet, phones', finance: 'money, banking, investing, economy',
  business: 'business, companies, trade, management', airport: 'airports, flights, luggage, passports',
  health: 'health, body, medicine, doctors',
  daily: 'everyday life, home, time, common actions and objects'
};
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const LEVEL = LEVELS.includes(process.env.READING_LEVEL) ? process.env.READING_LEVEL : 'B1';
const BANDS = { A1: [0, 800], A2: [800, 2000], B1: [2000, 5000], B2: [5000, 10000], C1: [10000, 20000], C2: [15000, 40000] };
const today = new Date().toISOString().slice(0, 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const vocab = JSON.parse(fs.readFileSync('data/vocab.json', 'utf8'));
vocab.exprs = vocab.exprs || [];
const have = new Set(vocab.words.map((w) => w[0]));
const dataJs = fs.readFileSync('js/data.js', 'utf8');
for (const m of dataJs.matchAll(/^([a-z][a-z' -]*)\|/gm)) have.add(m[1].toLowerCase());
const haveExpr = new Set(vocab.exprs.map((e) => e[1].toLowerCase()));
for (const m of dataJs.matchAll(/^(?:slang|spoken|phrasal|idiom|expr)\|[^|]*\|([^|]+)\|/gm)) haveExpr.add(m[1].toLowerCase());

const hasHebrew = (s) => /[֐-׿]/.test(s || '');
const FOREIGN = /[^\s -ɏ֐-׿ -⁯]/; // stray letters from other scripts
const goodHe = (s) => hasHebrew(s) && !FOREIGN.test(s);
const blocked = (s) => (String(s).toLowerCase().match(/[a-z]+/g) || []).some((w) => BLOCK.has(w));

/* ---------- 5 words per topic, at the reader's level ---------- */
const RANK = JSON.parse(fs.readFileSync('tools/en-rank.json', 'utf8'));
const LEMMAS = new Set(JSON.parse(fs.readFileSync('tools/en-lemmas.json', 'utf8')));
const needOf = (topic) => PER_TOPIC - vocab.words.filter((w) => w[3] === topic && w[6] === today && w[2] === LEVEL).length; // per level: a level change brings its own 5
function candidates(min) {
  // unused base-form words of the level's band, most common first; the next band joins when too few are left
  const out = [];
  const seen = new Set();
  for (let b = LEVELS.indexOf(LEVEL); b < LEVELS.length && out.length < min; b++) {
    const [lo, hi] = BANDS[LEVELS[b]];
    for (const [w, r] of Object.entries(RANK)) {
      if (r < lo || r >= hi || seen.has(w)) continue;
      if (!/^[a-z]{3,}$/.test(w) || !LEMMAS.has(w) || have.has(w) || STOP.has(w) || BLOCK.has(w)) continue;
      out.push(w); seen.add(w);
    }
  }
  return out.sort((a, b) => RANK[a] - RANK[b]).slice(0, 1500);
}
let words = 0;
async function wordsFromGemini() {
  for (let round = 0; round < 2; round++) {
    const open = Object.keys(TOPICS).filter((t) => needOf(t) > 0);
    if (!open.length) return;
    const pool = candidates(600);
    const allowed = new Set(pool);
    const res = await gemini(
      'You build vocabulary lessons for Hebrew-speaking English learners. You only use words from the list you are given.',
      `Learner level: CEFR ${LEVEL}.
Topics (id: meaning):
${open.map((t) => `${t}: ${TOPICS[t]} — pick ${needOf(t)}`).join('\n')}

Word list (choose ONLY from it):
${pool.join(', ')}

For each topic pick the requested number of words that clearly belong to the topic. Use base dictionary forms only (no plurals, past tenses or -ing forms). Skip names, places, brands, abbreviations, vulgar or offensive words, and words that are not useful for learners. A word may be used once only. If not enough words fit a topic, return fewer.
For each word: "he" = the most common Hebrew meaning (1-3 words, natural Hebrew), "pos" = noun|verb|adjective|adverb|other, "ex" = a natural example sentence at ${LEVEL} level that contains the word, "exHe" = its Hebrew translation.
Return ONLY JSON: {"topics": {"<topic id>": [{"word": "...", "he": "...", "pos": "...", "ex": "...", "exHe": "..."}]}}`);
    const used = new Set();
    for (const [topic, list] of Object.entries((res && res.topics) || {})) {
      if (!TOPICS[topic]) continue;
      for (const x of list || []) {
        if (needOf(topic) <= 0) break;
        const w = String(x.word || '').toLowerCase().trim();
        if (!allowed.has(w) || used.has(w) || have.has(w)) continue;          // only real words from the given list
        if (!goodHe(x.he) || !goodHe(x.exHe) || blocked(x.ex)) continue;
        if (!new RegExp(`\\b${w}`, 'i').test(x.ex || '')) continue;           // the example must contain the word
        used.add(w); have.add(w);
        vocab.words.push([w, x.he.trim(), LEVEL, topic, x.ex.trim(), x.exHe.trim(), today, 'g']);
        words++;
      }
    }
  }
}
function wordsFromReserve() {
  const reserve = JSON.parse(fs.readFileSync('tools/vocab-reserve.json', 'utf8'));
  for (const topic of Object.keys(TOPICS)) {
    let need = needOf(topic);
    for (const [t, heDict, lvl, ex, exHe, src] of reserve[topic] || []) {
      if (need <= 0) break;
      if (lvl !== LEVEL || have.has(t) || BLOCK.has(t) || !heDict) continue;
      have.add(t);
      vocab.words.push([t, heDict, lvl, topic, ex, exHe, today, src]);
      need--; words++;
    }
  }
}
if (hasGemini()) {
  try { await wordsFromGemini(); } catch (e) { console.warn('gemini words failed:', e.message); }
}
wordsFromReserve(); // fills what Gemini could not (same level only)
for (const t of Object.keys(TOPICS)) if (needOf(t) > 0) console.warn(`topic ${t}: ${needOf(t)} missing today at ${LEVEL}`);

/* ---------- 5 American slang terms, any level ---------- */
const slangToday = () => vocab.exprs.filter((e) => e[7] === today && e[0] === 'slang').length;
let slang = 0;
for (const line of fs.readFileSync('tools/slang-reserve.txt', 'utf8').split(/\r?\n/).filter((l) => l && !l.startsWith('#'))) {
  if (slangToday() >= PER_SLANG) break;
  const [t, he, def, ex, exHe] = line.split('|').map((x) => x.trim());
  if (!t || !he || haveExpr.has(t.toLowerCase())) continue;
  haveExpr.add(t.toLowerCase());
  vocab.exprs.push(['slang', t, he, def, ex, exHe, 'B1', today]);
  slang++;
}
if (slangToday() < PER_SLANG && hasGemini()) {
  try {
    const want = PER_SLANG - slangToday();
    const res = await gemini(
      'You teach everyday American English slang to Hebrew speakers. You only suggest real, widely used slang, never vulgar or offensive terms.',
      `Suggest ${want + 3} common American slang words or short expressions (1-3 words) that are NOT in this list:
${[...haveExpr].join(', ')}

For each: "term", "he" = the meaning in natural Hebrew (short), "def" = a short English definition, "ex" = a natural example sentence using the term, "exHe" = its Hebrew translation.
Return ONLY JSON: {"slang": [{"term": "...", "he": "...", "def": "...", "ex": "...", "exHe": "..."}]}`);
    for (const x of (res && res.slang) || []) {
      if (slangToday() >= PER_SLANG) break;
      const t = String(x.term || '').trim();
      if (!/^[a-z' -]{2,30}$/i.test(t) || t.split(/\s+/).length > 3 || haveExpr.has(t.toLowerCase()) || blocked(t) || blocked(x.ex) || blocked(x.def)) continue;
      if (!goodHe(x.he) || !goodHe(x.exHe) || !x.def || !x.ex) continue;
      haveExpr.add(t.toLowerCase());
      vocab.exprs.push(['slang', t, x.he.trim(), String(x.def).trim(), String(x.ex).trim(), x.exHe.trim(), 'B1', today]);
      slang++;
      await sleep(10);
    }
  } catch (e) { console.warn('gemini slang failed:', e.message); }
}

if (words + slang > 0) vocab.updated = today;
fs.writeFileSync('data/vocab.json', JSON.stringify(vocab));
console.log(`level ${LEVEL} · added today: ${words} words, ${slang} slang · database ${vocab.words.length} words + ${vocab.exprs.length} expressions`);
