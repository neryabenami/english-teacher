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
    const image = freeConversationImage(html);
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
      paragraphs: paras, note, pixel, ...(image ? { image } : {})
    });
  }
  return out;
}

/* ---------- photos (only openly licensed, always credited) ----------
   The Conversation's photos are not covered by the article license: we use the lead photo only when its
   caption names a free license; otherwise a matching photo from Wikimedia Commons. */
const FREE_LICENSE = /\b(CC\s?BY|CC0|creative\s?commons|public\s?domain|wikimedia|NASA|unsplash)\b/i;
function freeConversationImage(html) {
  const fig = html.match(/<figure>[\s\S]*?<\/figure>/i);
  if (!fig) return null;
  const src = (fig[0].match(/<img[^>]*src="([^"]+)"/) || [])[1];
  const attr = strip((fig[0].match(/<span class="attribution">([\s\S]*?)<\/span>\s*<\/figcaption>/) || [])[1] || '');
  if (!src || !attr || !FREE_LICENSE.test(attr)) return null;
  return { url: decode(src).replace(/w=\d+/, 'w=600').replace(/h=\d+/, 'h=400'), credit: attr.slice(0, 120) };
}
const CAT_QUERY = { news: 'city street people', tech: 'computer technology', science: 'laboratory science', sports: 'stadium sport', business: 'office business', finance: 'money coins', nature: 'forest landscape', culture: 'museum art', entertainment: 'cinema theatre stage', travel: 'travel airport', lifestyle: 'healthy food' };
const QSTOP = new Set('the a an and or of to in on for with why how what who is are was were be can could will would should this that these those it its as at by from into about after over more most new your you our we they their his her not than just when does do did has have had via amid against between'.split(' '));
const clean = (h) => strip(String(h || '')).slice(0, 80);
async function commonsImage(query) {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=8'
    + '&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=600&gsrsearch=' + encodeURIComponent('filetype:bitmap ' + query);
  const j = await get(url, 'json');
  const pages = Object.values(j.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
  for (const p of pages) {
    const ii = (p.imageinfo || [])[0];
    const md = (ii && ii.extmetadata) || {};
    const lic = clean(md.LicenseShortName && md.LicenseShortName.value);
    if (!ii || !ii.thumburl || !/^(CC BY|CC0|Public domain|PD)/i.test(lic) || /NC/.test(lic)) continue;
    if ((ii.thumbwidth || 0) < (ii.thumbheight || 0)) continue; // landscape photos fit the card
    const artist = clean(md.Artist && md.Artist.value) || 'Wikimedia Commons';
    return { url: ii.thumburl, credit: `${artist} · ${lic}`, page: ii.descriptionurl };
  }
  return null;
}
async function wikiPageImage(title) {
  const j = await get(`https://simple.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=thumbnail|name&pithumbsize=600&titles=${encodeURIComponent(title)}`, 'json');
  const p = Object.values(j.query?.pages || {})[0];
  if (!p || !p.thumbnail || !p.pageimage) return null;
  const k = await get(`https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&titles=${encodeURIComponent('File:' + p.pageimage)}`, 'json');
  const ii = ((Object.values(k.query?.pages || {})[0] || {}).imageinfo || [])[0];
  const md = (ii && ii.extmetadata) || {};
  const lic = clean(md.LicenseShortName && md.LicenseShortName.value);
  if (!lic || /NC|fair use|non-free/i.test(lic)) return null;
  return { url: p.thumbnail.source, credit: `${clean(md.Artist && md.Artist.value) || 'Wikimedia Commons'} · ${lic}`, page: ii.descriptionurl };
}
const keywords = (title) => title.toLowerCase().replace(/[^a-z\s-]/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !QSTOP.has(w)).sort((a, b) => b.length - a.length).slice(0, 2).join(' ');
async function findImage(a) {
  try {
    if (a.source === 'Simple English Wikipedia') { const im = await wikiPageImage(a.title); if (im) return im; }
    const kw = keywords(a.title);
    return (kw && await commonsImage(kw)) || await commonsImage(CAT_QUERY[a.cat] || 'landscape');
  } catch (e) { console.warn('image failed', a.id, e.message); return null; }
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

// photos for articles without one yet (image === undefined means "not looked up yet"); a few per run, politely
let pics = 0;
for (const meta of known.values()) {
  if (meta.image !== undefined || pics >= 150) continue;
  const file = path.join(OUT, meta.id + '.json');
  let body;
  try { body = JSON.parse(await fs.readFile(file, 'utf8')); } catch { continue; }
  meta.image = body.image !== undefined ? body.image : await findImage(meta);
  body.image = meta.image;
  await fs.writeFile(file, JSON.stringify(body));
  pics++;
}
console.log('looked up photos for', pics, 'articles');

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
