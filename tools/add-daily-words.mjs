/* Daily additions to data/vocab.json (runs in GitHub Actions; safe to run several times a day):
   - 5 new words for each of the 16 word topics, from tools/vocab-reserve.json (see build-reserve.mjs).
     Words without an offline translation are translated with MyMemory (free); words it can't translate are skipped.
   - 5 new common expressions (English idioms + phrasal verbs) and 5 new slang terms, from Wiktionary
     (CC BY-SA 4.0): English definition + example, Hebrew by MyMemory. Vulgar/offensive entries are skipped.
   Nothing is ever removed; vocab.updated becomes today's date when something was added. */
import fs from 'node:fs';
import { BLOCK } from './vocab-shared.mjs';

const PER_TOPIC = 5;
const PER_SECTION = 5;
const TOPICS = ['nature', 'work', 'travel', 'food', 'family', 'relationships', 'sports', 'tech', 'finance', 'business', 'airport', 'restaurant', 'hotel', 'shopping', 'health', 'daily'];
const UA = 'english-teacher-app (https://github.com/neryabenami/english-teacher)';
const today = new Date().toISOString().slice(0, 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const vocab = JSON.parse(fs.readFileSync('data/vocab.json', 'utf8'));
vocab.exprs = vocab.exprs || [];
const reserve = JSON.parse(fs.readFileSync('tools/vocab-reserve.json', 'utf8'));
const have = new Set(vocab.words.map((w) => w[0]));
const dataJs = fs.readFileSync('js/data.js', 'utf8');
for (const m of dataJs.matchAll(/^([a-z][a-z' -]*)\|/gm)) have.add(m[1].toLowerCase());
const haveExpr = new Set(vocab.exprs.map((e) => e[1].toLowerCase()));
for (const m of dataJs.matchAll(/^(?:slang|spoken|phrasal|idiom|expr)\|[^|]*\|([^|]+)\|/gm)) haveExpr.add(m[1].toLowerCase());

async function myMemory(text) {
  try {
    await sleep(300);
    const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 450))}&langpair=en|he`);
    const j = await r.json();
    const t = j && j.responseStatus === 200 ? String(j.responseData.translatedText || '') : '';
    if (/MYMEMORY|QUOTA|INVALID|PLEASE SELECT|#/i.test(t)) return '';
    return t.replace(/^[\s\-–—.,!?"']+|[\s\-–—.,!?"']+$/g, '').trim();
  } catch { return ''; }
}
const hasHebrew = (s) => /[֐-׿]/.test(s);
const clean = (h) => String(h || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&#?\w+;/g, (e) => ({ '&amp;': '&', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>' }[e] || ' ')).replace(/\s+/g, ' ').trim();
const blocked = (s) => (s.toLowerCase().match(/[a-z]+/g) || []).some((w) => BLOCK.has(w));

/* ---------- 5 words per topic ---------- */
let words = 0;
for (const topic of TOPICS) {
  let need = PER_TOPIC - vocab.words.filter((w) => w[3] === topic && w[6] === today).length;
  for (const c of reserve[topic] || []) {
    if (need <= 0) break;
    const [t, heDict, lvl, ex, exHe, src] = c;
    if (have.has(t) || BLOCK.has(t)) continue;
    const he = heDict || await myMemory(t);
    have.add(t);
    if (!he || !hasHebrew(he)) continue; // untranslatable → most likely a name
    vocab.words.push([t, he, lvl, topic, ex, exHe, today, src]);
    need--; words++;
  }
  if (need > 0) console.warn(`topic ${topic}: reserve is running out (${need} missing today)`);
}

/* ---------- 5 expressions + 5 slang from Wiktionary ---------- */
async function wikt(params) {
  const r = await fetch('https://en.wiktionary.org/w/api.php?format=json&' + params, { headers: { 'User-Agent': UA } });
  return r.json();
}
async function members(category) {
  const out = [];
  let cont = '';
  for (let i = 0; i < 12; i++) {
    const j = await wikt(`action=query&list=categorymembers&cmtype=page&cmlimit=500&cmtitle=${encodeURIComponent('Category:' + category)}${cont}`);
    out.push(...(j.query?.categorymembers || []).map((m) => m.title));
    if (!j.continue) break;
    cont = '&cmcontinue=' + encodeURIComponent(j.continue.cmcontinue);
    await sleep(200);
  }
  return out;
}
const RANK = JSON.parse(fs.readFileSync('tools/en-rank.json', 'utf8'));
/* everyday entries first: all their words are common */
const commonness = (t) => Math.max(...t.toLowerCase().split(/[\s-]+/).map((w) => (RANK[w] === undefined ? 99999 : RANK[w])));
const BAD_LABEL = /\b(vulgar|offensive|derogatory|slur|obscene|sexual|obsolete|archaic|dated|rare|nonstandard|ethnic|euphemistic|childish)\b/i;
/* Definition + example from the page's wikitext, where sense labels ({{lb|en|US|slang}}) are kept */
const wikiText = (s) => s
  .replace(/\{\{(?:l|m|w|link|mention)\|[^|}]*\|([^|}]+)[^}]*\}\}/g, '$1')
  .replace(/\{\{(?:gloss|q|qualifier|i)\|([^}]*)\}\}/g, '($1)')
  .replace(/\{\{[^{}]*\}\}/g, '')
  .replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, '$1')
  .replace(/'''?/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').replace(/^[\s,;:.]+/, '').trim();
async function definition(term, kind) {
  const j = await wikt(`action=query&prop=revisions&rvprop=content&rvslots=main&formatversion=2&titles=${encodeURIComponent(term)}`);
  const text = j.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content || '';
  const start = text.indexOf('==English==');
  if (start < 0) return null;
  const rest = text.slice(start + 11);
  const end = rest.search(/\n==[^=]/);
  const lines = (end < 0 ? rest : rest.slice(0, end)).split('\n');
  let first = true;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/^# [^:*]/.test(line) && !/^#[^:*#]/.test(line)) continue;
    const isFirst = first; first = false;
    const labels = [...line.matchAll(/\{\{(?:lb|lbl|label)\|en\|([^}]*)\}\}/g)].map((m) => m[1].toLowerCase()).join('|');
    if (BAD_LABEL.test(labels)) continue;
    if (kind === 'slang' && !(isFirst && /slang/.test(labels))) return null; // slang must be the main meaning
    const def = wikiText(line.replace(/^#+\s*/, ''));
    if (!def || def.length < 8 || blocked(def)) continue;
    if (/ISO 639|^See |used other than|alternative (form|spelling)|misspelling|plural of|past tense|initialism of|abbreviation of/i.test(def)) continue;
    let ex = '';
    for (let k = i + 1; k < lines.length && /^#[:*]/.test(lines[k]); k++) {
      const ux = lines[k].match(/\{\{(?:ux|usex|uxi)\|en\|([^|}]+)/);
      const cand = ux ? wikiText(ux[1]) : /^#:\s/.test(lines[k]) ? wikiText(lines[k].replace(/^#:\s*/, '')) : '';
      if (cand && cand.length > 8 && cand.length < 200 && !blocked(cand)) { ex = cand; break; }
    }
    return { def: def.slice(0, 160), ex };
  }
  return null;
}
const PARTICLES = new Set(['up', 'down', 'out', 'off', 'in', 'on', 'over', 'away', 'back', 'through', 'around', 'along', 'about', 'into', 'after', 'across', 'by', 'forward', 'apart', 'together']);
function qualifies(kind, t) {
  const w = t.toLowerCase().split(/\s+/);
  if (kind === 'idiom') return w.length >= 3 && w.length <= 6;                                    // e.g. "break the ice"
  if (kind === 'phrasal') return w.length === 2 && PARTICLES.has(w[1]) && (RANK[w[0]] ?? 99999) < 6000; // e.g. "give up"
  if (kind === 'slang') return w.length <= 3;
  return true;
}
async function addSection(kindOf, categories, lvl) {
  let need = PER_SECTION - vocab.exprs.filter((e) => e[7] === today && categories.some(([k]) => k === e[0])).length;
  if (need <= 0) return 0;
  const pool = [];
  for (const [kind, cat] of categories) {
    try { for (const t of await members(cat)) pool.push([kind, t]); } catch (e) { console.warn('wiktionary list failed', cat, e.message); }
  }
  pool.sort((a, b) => commonness(a[1]) - commonness(b[1]));
  let added = 0;
  let tries = 0;
  for (const [kind, t] of pool) {
    if (need <= 0 || tries >= 120) break; // keep the daily run short
    if (!qualifies(kind, t)) continue;
    if (haveExpr.has(t.toLowerCase()) || blocked(t) || /[:()]/.test(t) || t.length > 32 || !/^[a-z' -]+$/i.test(t)) continue;
    if (!qualifies(kind, t)) continue;
    haveExpr.add(t.toLowerCase());
    await sleep(250);
    tries++;
    const d = await definition(t, kind).catch(() => null);
    if (!d) continue;
    const he = await myMemory(d.def);
    if (!he || !hasHebrew(he)) continue;
    const exHe = d.ex ? await myMemory(d.ex) : '';
    vocab.exprs.push([kind, t, he, d.def, d.ex, exHe, lvl, today]);
    need--; added++;
  }
  return added;
}
const exprAdded = await addSection('expr', [['idiom', 'English_idioms'], ['phrasal', 'English_phrasal_verbs']], 'B1');
/* slang: first the curated everyday list (tools/slang-reserve.txt), then Wiktionary */
function curatedSlang() {
  let need = PER_SECTION - vocab.exprs.filter((e) => e[7] === today && e[0] === 'slang').length;
  let added = 0;
  const lines = fs.readFileSync('tools/slang-reserve.txt', 'utf8').split(/\r?\n/).filter((l) => l && !l.startsWith('#'));
  for (const line of lines) {
    if (need <= 0) break;
    const [t, he, def, ex, exHe] = line.split('|').map((x) => x.trim());
    if (!t || !he || haveExpr.has(t.toLowerCase())) continue;
    haveExpr.add(t.toLowerCase());
    vocab.exprs.push(['slang', t, he, def, ex, exHe, 'B1', today]);
    need--; added++;
  }
  return added;
}
const slangAdded = curatedSlang() + await addSection('slang', [['slang', 'American_English_slang']], 'B1');

if (words + exprAdded + slangAdded > 0) vocab.updated = today;
fs.writeFileSync('data/vocab.json', JSON.stringify(vocab));
console.log(`added today: ${words} words, ${exprAdded} expressions, ${slangAdded} slang · database ${vocab.words.length} words + ${vocab.exprs.length} expressions`);
