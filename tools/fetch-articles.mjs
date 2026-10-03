/* Collects real, legally reusable articles for the Reading tab and writes them to data/articles/.
   Sources:
   - The Conversation (CC BY-ND 4.0): republished in full and unchanged, with author, source and link.
   - Simple English Wikipedia (CC BY-SA 4.0): excerpts for beginners, with source and link.
   Each article gets a reading level from its text (Flesch-Kincaid grade).
   Runs in GitHub Actions on a schedule (free). Node 18+, no dependencies. */
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve('data/articles');
const KEEP_PER_CAT = 36;
const MAX_AGE_DAYS = 120;
const UA = 'english-teacher-app (https://github.com/neryabenami/english-teacher)';

const TC = (p) => `https://theconversation.com/${p}/articles.atom`;
const CONV = {
  news: [TC('us/politics'), TC('us/education')],
  tech: [TC('us/technology')],
  science: [TC('global/topics/science-1256'), TC('global/topics/space-51')],
  sports: [TC('global/topics/sports-4768'), TC('global/topics/football-482'), TC('global/topics/sport-480')],
  business: [TC('us/business')],
  finance: [TC('global/topics/personal-finance-18907')],
  nature: [TC('us/environment')],
  culture: [TC('us/arts'), TC('global/topics/food-260')],
  entertainment: [TC('global/topics/film-1175'), TC('global/topics/movies-28203'), TC('global/topics/music-12'), TC('global/topics/television-145')],
  travel: [TC('global/topics/travel-472'), TC('global/topics/tourism-471')],
  lifestyle: [TC('us/health')]
};
const SIMPLE = {
  tech: ['Technology', 'Computers', 'Internet'],
  science: ['Science', 'Astronomy', 'Biology'],
  sports: ['Sports', 'Ball games'],
  business: ['Business', 'Companies'],
  finance: ['Money', 'Economics'],
  nature: ['Animals', 'Plants', 'Nature'],
  culture: ['Culture', 'Food', 'Holidays'],
  entertainment: ['Movies', 'Music', 'Television'],
  travel: ['Tourism', 'Tourist attractions'],
  lifestyle: ['Health', 'Sleep', 'Exercise'],
  news: ['Government', 'Elections']
};

/* ---------- text helpers ---------- */
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…' };
const decode = (s) => s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  return ENT[e.toLowerCase()] ?? m;
});
const strip = (html) => decode(html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const syllables = (w) => {
  w = w.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const m = w.match(/[aeiouy]{1,2}/g);
  return Math.max(1, m ? m.length : 1);
};
const grade = (text) => {
  const words = text.match(/[A-Za-z’']+/g) || [];
  const sentences = Math.max(1, (text.match(/[.!?]+(\s|$)/g) || []).length);
  if (!words.length) return 0;
  const syl = words.reduce((a, w) => a + syllables(w), 0);
  return +(0.39 * (words.length / sentences) + 11.8 * (syl / words.length) - 15.59).toFixed(1);
};
const levelOf = (g) => (g <= 8.5 ? 'beginner' : g <= 12.5 ? 'intermediate' : 'advanced');
const wordCount = (paras) => paras.join(' ').split(/\s+/).filter(Boolean).length;

async function get(url, type = 'text') {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return type === 'json' ? res.json() : res.text();
}

/* ---------- The Conversation ---------- */
function parseConversation(xml, cat) {
  const out = [];
  for (const entry of xml.split('<entry>').slice(1)) {
    const tag = (t) => (entry.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)) || [])[1] || '';
    const id = (tag('id').match(/article\/(\d+)/) || [])[1];
    if (!id) continue;
    const link = (entry.match(/<link rel="alternate"[^>]*href="([^"]+)"/) || [])[1];
    const rights = tag('rights');
    if (!/creative commons/i.test(rights)) continue;
    const html = decode(tag('content'));
    const pixel = (html.match(/https:\/\/counter\.theconversation\.com\/content\/\d+\/count\.gif/) || [])[0] || null;
    const body = html.replace(/<figure[\s\S]*?<\/figure>/gi, '').replace(/<img[^>]*>/gi, '');
    const paras = [];
    let note = '';
    for (const m of body.matchAll(/<(p|h2|h3|li)([^>]*)>([\s\S]*?)<\/\1>/gi)) {
      const txt = strip(m[3]);
      if (!txt) continue;
      if (/fine-print/.test(m[2])) { note += (note ? ' ' : '') + txt; continue; }
      paras.push(m[1].toLowerCase() === 'p' || m[1].toLowerCase() === 'li' ? txt : `## ${txt}`);
    }
    if (paras.length < 3) continue;
    const plain = paras.filter((p) => !p.startsWith('## ')).join(' ');
    const g = grade(plain);
    const words = wordCount(paras);
    out.push({
      id: 'tc-' + id, cat, title: strip(decode(tag('title'))), summary: strip(decode(tag('summary'))),
      author: strip(decode((entry.match(/<author>\s*<name>([\s\S]*?)<\/name>/) || [])[1] || '')),
      date: tag('published') || tag('updated'), url: link,
      source: 'The Conversation', license: 'CC BY-ND 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-nd/4.0/',
      full: true, grade: g, level: levelOf(g), words, minutes: Math.max(1, Math.round(words / 200)),
      paragraphs: paras, note, pixel
    });
  }
  return out;
}

/* ---------- Simple English Wikipedia ---------- */
const daySeed = Math.floor(Date.now() / 864e5);
async function simpleWiki(cat, categories) {
  const titles = [];
  for (const c of categories) {
    try {
      const j = await get(`https://simple.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=${encodeURIComponent('Category:' + c)}&cmtype=page&cmlimit=200&format=json`, 'json');
      titles.push(...(j.query?.categorymembers || []).map((m) => m.title).filter((t) => !/^(List of|Index of)/.test(t)));
    } catch (e) { console.warn('simple wiki category failed', c, e.message); }
  }
  if (!titles.length) return [];
  // rotate through the category so new texts appear over time
  const pick = new Set();
  for (let i = 0; i < 12 && i < titles.length; i++) pick.add(titles[(daySeed * 7 + i * 13) % titles.length]);
  const out = [];
  for (const title of pick) {
    // the API returns a full-page extract for one title per request
    let p;
    try { p = Object.values((await get(`https://simple.wikipedia.org/w/api.php?action=query&prop=extracts|info&inprop=url&explaintext=1&exsectionformat=plain&format=json&titles=${encodeURIComponent(title)}`, 'json')).query?.pages || {})[0]; } catch { continue; }
    if (!p || !p.extract) continue;
    const all = p.extract.split('\n').map((s) => s.trim()).filter((s) => s.length > 40 && !/^(References|Related pages|Other websites|Notes|Gallery)$/i.test(s));
    const paras = [];
    for (const para of all) { if (wordCount(paras) > 320) break; paras.push(para); }
    const words = wordCount(paras);
    if (words < 90) continue;
    const g = grade(paras.join(' '));
    out.push({
      id: 'sw-' + p.pageid, cat, title: p.title, summary: '', author: 'Simple English Wikipedia contributors',
      date: new Date().toISOString(), url: p.fullurl, source: 'Simple English Wikipedia', license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', full: words >= wordCount(all), grade: g, level: g <= 10.5 ? 'beginner' : levelOf(g),
      words, minutes: Math.max(1, Math.round(words / 160)), paragraphs: paras, note: '', pixel: null
    });
  }
  return out;
}

/* ---------- main ---------- */
await fs.mkdir(OUT, { recursive: true });
let index = { articles: [] };
try { index = JSON.parse(await fs.readFile(path.join(OUT, 'index.json'), 'utf8')); } catch { /* first run */ }
const known = new Map(index.articles.map((a) => [a.id, a]));
const fresh = [];

for (const [cat, feeds] of Object.entries(CONV)) {
  for (const f of feeds) {
    try { fresh.push(...parseConversation(await get(f), cat)); } catch (e) { console.warn('feed failed', f, e.message); }
  }
}
for (const [cat, cats] of Object.entries(SIMPLE)) {
  try { fresh.push(...await simpleWiki(cat, cats)); } catch (e) { console.warn('simple wiki failed', cat, e.message); }
}

let added = 0;
for (const a of fresh) {
  if (known.has(a.id)) continue;
  const { paragraphs, note, pixel, ...meta } = a;
  await fs.writeFile(path.join(OUT, a.id + '.json'), JSON.stringify({ ...meta, paragraphs, note, pixel }));
  known.set(a.id, meta);
  added++;
}

// keep it small: newest per category, drop old ones
const cutoff = Date.now() - MAX_AGE_DAYS * 864e5;
const byCat = {};
for (const a of known.values()) (byCat[a.cat] = byCat[a.cat] || []).push(a);
const keep = [];
for (const list of Object.values(byCat)) {
  list.sort((x, y) => new Date(y.date) - new Date(x.date));
  const perLevel = { beginner: [], intermediate: [], advanced: [] };
  for (const a of list) if (new Date(a.date).getTime() >= cutoff || a.source !== 'The Conversation') perLevel[a.level].push(a);
  for (const l of Object.values(perLevel)) keep.push(...l.slice(0, Math.ceil(KEEP_PER_CAT / 3)));
}
const keepIds = new Set(keep.map((a) => a.id));
for (const f of await fs.readdir(OUT)) {
  if (f === 'index.json') continue;
  if (!keepIds.has(f.replace(/\.json$/, ''))) await fs.unlink(path.join(OUT, f));
}
keep.sort((x, y) => new Date(y.date) - new Date(x.date));
await fs.writeFile(path.join(OUT, 'index.json'), JSON.stringify({ updated: new Date().toISOString(), articles: keep }));
const lv = keep.reduce((m, a) => ((m[a.level] = (m[a.level] || 0) + 1), m), {});
console.log(`added ${added}, total ${keep.length}`, lv);
