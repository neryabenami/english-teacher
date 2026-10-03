/* Builds the offline English→Hebrew dictionary (data/dict-en-he.json) from Wiktionary data.
   Source: kaikki.org Hebrew extraction of English Wiktionary (CC BY-SA 4.0).
   Download: https://kaikki.org/dictionary/Hebrew/kaikki.org-dictionary-Hebrew.jsonl
   Usage: node tools/build-dictionary.mjs path/to/kaikki.org-dictionary-Hebrew.jsonl [path/to/he_50k.txt] */
import fs from 'node:fs';
import readline from 'node:readline';

const src = process.argv[2];
if (!src) { console.error('usage: node tools/build-dictionary.mjs <kaikki Hebrew jsonl>'); process.exit(1); }

const POS_OK = new Set(['noun', 'verb', 'adj', 'adv', 'phrase', 'intj', 'prep', 'pron', 'num', 'conj', 'particle', 'det', 'prep_phrase', 'proverb']);
const SKIP_TAGS = new Set(['obsolete', 'archaic', 'rare', 'Biblical', 'dated', 'historical']);
const stripNiqqud = (s) => s.replace(/[֑-ׇ]/g, '').replace(/[‎‏]/g, '').trim();
const isHebrew = (s) => /^[א-ת'"״׳\- ]+$/.test(s);

// split a gloss on top-level ";" and "," (ignoring those inside parentheses)
const splitTop = (g) => {
  const parts = []; let depth = 0; let cur = '';
  for (const ch of g) {
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if ((ch === ';' || ch === ',') && depth === 0) { parts.push(cur); cur = ''; } else cur += ch;
  }
  parts.push(cur);
  return parts;
};
const dropParens = (p) => { let s = p, prev; do { prev = s; s = s.replace(/\([^()]*\)/g, ' '); } while (s !== prev); return s.replace(/[()]/g, ' '); };
const cleanEn = (p, pos) => {
  let s = dropParens(p).replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  s = s.replace(/^(to be )(?=\w+ed$)/, 'be ');
  if (pos === 'verb') s = s.replace(/^to /, '');
  s = s.replace(/^(a|an|the) /, '');
  if (!/^[a-z][a-z' -]{0,32}$/.test(s)) return null;
  if (s.split(' ').length > 3) return null;
  return s;
};

/* Optional Hebrew frequency list (FrequencyWords he_50k.txt, CC BY-SA 4.0) to rank common translations first:
   https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/he/he_50k.txt */
const RANK = new Map();
if (process.argv[3]) fs.readFileSync(process.argv[3], 'utf8').split('\n').forEach((l, i) => { const w = l.split(' ')[0]; if (w && !RANK.has(w)) RANK.set(w, i + 1); });
const freqPenalty = (he) => { if (!RANK.size) return 0; const r = Math.min(...he.split(' ').map((w) => RANK.get(w) || 200000)); return Math.log2(r); };

const map = new Map(); // en -> Map(he -> score)
const rl = readline.createInterface({ input: fs.createReadStream(src, 'utf8'), crlfDelay: Infinity });
let n = 0;
for await (const line of rl) {
  if (!line) continue;
  let e; try { e = JSON.parse(line); } catch { continue; }
  if (e.lang_code !== 'he' || !POS_OK.has(e.pos)) continue;
  let he = stripNiqqud(e.word || '');
  const lemmaRank = he;
  if (e.pos === 'verb') {
    const inf = (e.forms || []).find((f) => (f.tags || []).includes('infinitive') && /^ל/.test(stripNiqqud(f.form || '')));
    if (inf) he = stripNiqqud(inf.form);
  }
  if (!he || !isHebrew(he) || he.length > 24) continue;
  (e.senses || []).forEach((sense, si) => {
    if (sense.form_of || sense.alt_of) return;
    if ((sense.tags || []).some((t) => SKIP_TAGS.has(t) || t === 'form-of' || t === 'alt-of')) return;
    const gloss = (sense.glosses || [])[0];
    if (!gloss || /\b(plural|construct|form) of\b|^(initialism|abbreviation|acronym) of/i.test(gloss)) return;
    splitTop(gloss).forEach((part, pi) => {
      const en = cleanEn(part, e.pos);
      if (!en) return;
      // a long explanation in parentheses usually marks a narrow or technical sense
      const technical = (part.match(/\(([^)]*)\)?/) || [, ''])[1].length > 15 ? 3 : 0;
      const score = si * 1.5 + pi * 1.5 + technical + 0.5 * freqPenalty(lemmaRank);
      const m = map.get(en) || new Map();
      if (!m.has(he) || m.get(he) > score) m.set(he, score);
      map.set(en, m);
    });
  });
  n++;
}

const out = {};
for (const [en, m] of [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
  out[en] = [...m.entries()].sort((a, b) => a[1] - b[1] || a[0].length - b[0].length).slice(0, 3).map(([h]) => h).join(', ');
}
fs.mkdirSync('data', { recursive: true });
fs.writeFileSync('data/dict-en-he.json', JSON.stringify({
  source: 'Wiktionary (via kaikki.org), CC BY-SA 4.0; ranking: FrequencyWords (Hermit Dave), CC BY-SA 4.0', url: 'https://kaikki.org/dictionary/Hebrew/', built: new Date().toISOString(), entries: out
}));
console.log(`entries read ${n}, English headwords ${Object.keys(out).length}, size ${(fs.statSync('data/dict-en-he.json').size / 1024).toFixed(0)} KB`);
