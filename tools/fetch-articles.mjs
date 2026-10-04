/* Collects real, legally reusable articles for the Reading tab and writes them to data/articles/.
   Sources (full text, republishing allowed):
   - The Conversation (CC BY-ND 4.0): republished in full and unchanged, with author, source and link.
   - Global Voices (CC BY 3.0): international news.
   - The White House (public domain, U.S. Government work): official statements, marked as such.
   Only articles of at least 5 minutes' reading. Each gets a reading level (Flesch-Kincaid grade),
   a short headline (few English words + Hebrew meaning) and an openly licensed photo with credit.
   Runs in GitHub Actions on a schedule (free). Node 18+, no dependencies. */
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve('data/articles');
const MIN_WORDS = 1000;            // ≈ 5 minutes at 200 words per minute
const KEEP_PER_CAT = 60;
const MAX_AGE_DAYS = 90;
const MAX_AGE_SLOW_DAYS = 240;     // topics that publish rarely (crypto, bonds) keep articles longer
const UA = 'english-teacher-app (https://github.com/neryabenami/english-teacher)';

/* Reading tabs: world · tech · science · sports · business (subs: markets, stocks, crypto, bonds) · interesting.
   Several feeds per tab (US/UK/Australia/Canada/Africa editions + topic feeds) so each tab gets new articles daily. */
const TC = (p) => `https://theconversation.com/${p}/articles.atom`;
const T = (slug) => TC('global/topics/' + slug);
const FEEDS = [
  ...[T('donald-trump-10206'), T('russia-1376'), T('ukraine-8201'), T('israel-360'), T('middle-east-361'), T('europe-823'), T('china-336'), T('india-1429'),
    TC('us/politics'), TC('uk/politics'), TC('au/politics')].map((url) => ({ url, cat: 'world' })),
  ...[TC('us/technology'), TC('uk/technology'), TC('au/technology')].map((url) => ({ url, cat: 'tech' })),
  ...[T('science-1256'), T('space-51'), TC('us/environment'), TC('uk/environment'), T('climate-change-27')].map((url) => ({ url, cat: 'science' })),
  ...[T('sports-4768'), T('football-482'), T('sport-480'), T('tennis-2125')].map((url) => ({ url, cat: 'sports' })),
  ...[TC('us/business'), TC('uk/business'), TC('ca/business'), TC('africa/business'), TC('au/business'), T('economy-254'), T('personal-finance-18907')].map((url) => ({ url, cat: 'business' })),
  { url: T('stock-markets-13552'), cat: 'business', sub: 'markets', slow: true }, { url: T('interest-rates-1102'), cat: 'business', sub: 'markets', slow: true },
  { url: T('stocks-6225'), cat: 'business', sub: 'stocks', slow: true },
  { url: T('cryptocurrency-8321'), cat: 'business', sub: 'crypto', slow: true }, { url: T('bitcoin-1358'), cat: 'business', sub: 'crypto', slow: true },
  { url: T('bonds-1210'), cat: 'business', sub: 'bonds', slow: true },
  ...[T('psychology-28'), T('history-180'), T('health-4159'), T('mental-health-343'), T('food-260'), T('parenting-811'), T('animals-3165'), TC('us/arts'), TC('uk/arts')].map((url) => ({ url, cat: 'interesting' }))
];
/* Other full-text sources that allow republishing */
const RSS = [
  // what the President says: official statements of the US government are public domain (17 U.S.C. § 105)
  { cat: 'world', url: 'https://www.whitehouse.gov/news/feed/', source: 'The White House', license: 'Public domain (U.S. Government work)', licenseUrl: 'https://www.usa.gov/government-copyright', prefix: 'wh-', official: true },
  // international news from local writers, CC BY
  { cat: 'world', url: 'https://globalvoices.org/feed/', source: 'Global Voices', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/', prefix: 'gv-' }
];
/* earlier tab names → current tabs (older saved data) */
const OLD2NEW = { news: 'world', trump: 'world', markets: 'business', finance: 'business', nature: 'science', culture: 'interesting', entertainment: 'interesting', travel: 'interesting', lifestyle: 'interesting' };

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, type = 'text') {
  for (let attempt = 0; attempt < 3; attempt++) {
    await sleep(attempt ? 6000 * attempt : 350); // polite pacing; back off when the site asks us to
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.status === 429 || res.status >= 500) continue;
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return type === 'json' ? res.json() : res.text();
  }
  throw new Error(`gave up ${url}`);
}

/* ---------- generic RSS with full text (content:encoded) ---------- */
function parseRss(xml, feed) {
  const out = [];
  for (const item of xml.split('<item>').slice(1)) {
    const tag = (t) => { const m = item.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)); return m ? m[1].replace(/^<!\[CDATA\[|\]\]>$/g, '') : ''; };
    const link = strip(tag('link'));
    const html = tag('content:encoded');
    if (!link || !html) continue;
    const paras = [];
    for (const m of html.replace(/<figure[\s\S]*?<\/figure>/gi, '').matchAll(/<(p|h2|h3|li)[^>]*>([\s\S]*?)<\/\1>/gi)) {
      const txt = strip(m[2]);
      if (txt.length < 25 || /^(Read more|Related|Share this|Photo:|Image:)/i.test(txt)) continue;
      paras.push(/^h/i.test(m[1]) ? `## ${txt}` : txt);
    }
    if (paras.length < 3) continue;
    const words = wordCount(paras);
    if (words < 120) continue;
    const g = grade(paras.filter((p) => !p.startsWith('## ')).join(' '));
    const id = feed.prefix + link.replace(/^https?:\/\/[^/]+\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(-70);
    out.push({
      id, cat: feed.cat, title: strip(tag('title')), summary: '', author: strip(tag('dc:creator')) || feed.source,
      date: new Date(strip(tag('pubDate')) || Date.now()).toISOString(), url: link, source: feed.source, license: feed.license,
      licenseUrl: feed.licenseUrl, full: true, grade: g, level: levelOf(g), words, minutes: Math.max(1, Math.round(words / 200)),
      paragraphs: paras, note: '', pixel: null, ...(feed.official ? { official: true } : {})
    });
  }
  return out;
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
const CAT_QUERY = { trump: 'White House Washington', world: 'world map globe', markets: 'stock exchange', news: 'city street people', tech: 'computer technology', science: 'laboratory science', sports: 'stadium sport', business: 'office business', finance: 'money coins', nature: 'forest landscape', culture: 'museum art', entertainment: 'cinema theatre stage', travel: 'travel airport', lifestyle: 'healthy food' };
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

/* ---------- short headlines ----------
   Default (free, no key): the title cut at a natural point (a few words, no "…"), and the Hebrew
   meaning = a free machine translation (MyMemory) of the full title.
   Optional: if the repository has a free Google Gemini key in the GEMINI_API_KEY secret, Gemini writes
   the headline and the Hebrew line instead. */
const SHORT_V = 2;
async function geminiShorts(batch) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const list = batch.map((a) => ({ id: a.id, title: a.title, about: (a.summary || '').slice(0, 220) }));
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: 'You write very short card headlines for Hebrew-speaking English learners. Do not invent facts beyond the title and description.' }] },
      contents: [{ role: 'user', parts: [{ text: 'For each article return "en": the main idea in 3-6 simple English words (no ending period), and "he": the main idea in natural Hebrew, 4-9 words. Reply ONLY with JSON {"items":[{"id":"...","en":"...","he":"..."}]}.\n' + JSON.stringify(list) }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
    })
  });
  if (!res.ok) throw new Error('gemini ' + res.status);
  const j = await res.json();
  const items = JSON.parse(j.candidates[0].content.parts[0].text).items || [];
  const out = {};
  for (const it of items) {
    if (!it.id || !it.en || !it.he || String(it.en).split(/\s+/).length > 8) continue;
    out[it.id] = { en: String(it.en).trim().replace(/[.…]+$/, ''), he: String(it.he).trim().replace(/[.…]+$/, ''), ai: true, v: SHORT_V };
  }
  return out;
}
async function myMemory(text) {
  try {
    const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 450))}&langpair=en|he`);
    const j = await r.json();
    const t = j && j.responseStatus === 200 ? String(j.responseData.translatedText || '') : '';
    return /MYMEMORY|QUOTA|INVALID/i.test(t) ? '' : t;
  } catch { return ''; }
}
/* a few words that still read as a phrase: first clause, without leading question words, cut before a weak word */
const LEAD = /^(how|why|what|when|where|who|here's|here is|the|a|an)\s+/i;
const WEAK = new Set('a an the of to in on for and or but with after before from by at as is are was were be been that which who whose its their his her our your can could will would may might has have had not into over than about'.split(' '));
function headOf(title) {
  const parts = title.split(/\s[–—-]\s|:\s|\?\s|;\s/).map((p) => p.replace(/[?.!,]+$/, '').trim()).filter(Boolean);
  // "ICYMI: President Trump announces…" → the part after a 1-2 word label
  const label = /^[A-Z]{2,}$/.test(parts[0] || '') || /^(watch|breaking|live|fact sheet|remarks|update|explainer)$/i.test(parts[0] || '');
  let first = parts.length > 1 && label ? parts[1] : parts[0];
  const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
  let words = first.split(/\s+/);
  if (words.length <= 7) return cap(first);
  first = first.replace(LEAD, '');
  words = first.split(/\s+/);
  const comma = first.split(/,\s|\s(?:but|and|as|while|because|after|before)\s/)[0].split(/\s+/);
  if (comma.length >= 3 && comma.length <= 7) return cap(comma.join(' '));
  // "Renoir and Love is a wonderful celebration…" → "Renoir and Love"
  const copula = first.match(/^(.{6,}?)\s(?:is|are|was|were)\s/i);
  if (copula && copula[1].split(/\s+/).length >= 2 && copula[1].split(/\s+/).length <= 6) return cap(copula[1]);
  let cut = words.slice(0, 7);
  while (cut.length > 3 && WEAK.has(cut[cut.length - 1].toLowerCase())) cut.pop();
  const out = cut.join(' ');
  return out.charAt(0).toUpperCase() + out.slice(1);
}
async function summarize(metas) {
  const out = {};
  let aiOk = !!process.env.GEMINI_API_KEY;
  for (let i = 0; i < metas.length; i += 10) {
    const batch = metas.slice(i, i + 10);
    if (aiOk) {
      try { Object.assign(out, await geminiShorts(batch)); await sleep(4500); } catch (e) { console.warn('AI headlines unavailable:', e.message); aiOk = false; }
    }
    for (const a of batch) {
      if (out[a.id]) continue;
      const he = await myMemory(a.title);
      if (he) out[a.id] = { en: headOf(a.title), he, v: SHORT_V };
    }
  }
  return out;
}

/* ---------- main ---------- */
await fs.mkdir(OUT, { recursive: true });
let index = { articles: [] };
try { index = JSON.parse(await fs.readFile(path.join(OUT, 'index.json'), 'utf8')); } catch { /* first run */ }
const known = new Map();
for (const m of index.articles) {
  if (m.id.startsWith('sw-') || (m.words || 0) < MIN_WORDS) continue;   // short texts are no longer shown
  known.set(m.id, { ...m, cat: m.sub ? 'business' : (OLD2NEW[m.cat] || m.cat) });
}

const fresh = [];
for (const feed of FEEDS) {
  try {
    for (const art of parseConversation(await get(feed.url), feed.cat)) fresh.push({ ...art, ...(feed.sub ? { sub: feed.sub } : {}), ...(feed.slow ? { slow: true } : {}) });
  } catch (e) { console.warn('feed failed', feed.url, e.message); }
}
for (const feed of RSS) {
  try { fresh.push(...parseRss(await get(feed.url), feed)); } catch (e) { console.warn('feed failed', feed.url, e.message); }
}

let added = 0;
for (const art of fresh) {
  if (art.words < MIN_WORDS) continue;
  const prev = known.get(art.id);
  if (prev) { if (art.sub && !prev.sub) { prev.sub = art.sub; prev.slow = art.slow; prev.cat = 'business'; } continue; }
  const { paragraphs, note, pixel, ...meta } = art;
  await fs.writeFile(path.join(OUT, art.id + '.json'), JSON.stringify({ ...meta, paragraphs, note, pixel }));
  known.set(art.id, meta);
  added++;
}

// keep it fresh and small: per tab (and per finance sub-tab) the newest articles, spread over the three levels
const groups = {};
for (const m of known.values()) (groups[m.cat + '/' + (m.sub || '')] = groups[m.cat + '/' + (m.sub || '')] || []).push(m);
const keep = [];
for (const list of Object.values(groups)) {
  list.sort((x, y) => new Date(y.date) - new Date(x.date));
  const perLevel = { beginner: [], intermediate: [], advanced: [] };
  for (const m of list) {
    const maxAge = (m.slow ? MAX_AGE_SLOW_DAYS : MAX_AGE_DAYS) * 864e5;
    if (Date.now() - new Date(m.date).getTime() <= maxAge) perLevel[m.level].push(m);
  }
  for (const l of Object.values(perLevel)) keep.push(...l.slice(0, Math.ceil(KEEP_PER_CAT / 3)));
}
const keepIds = new Set(keep.map((m) => m.id));
for (const file of await fs.readdir(OUT)) {
  if (file === 'index.json') continue;
  if (!keepIds.has(file.replace(/.json$/, ''))) await fs.unlink(path.join(OUT, file));
}

const patchBody = async (id, patch) => {
  const file = path.join(OUT, id + '.json');
  try { const body = JSON.parse(await fs.readFile(file, 'utf8')); Object.assign(body, patch); await fs.writeFile(file, JSON.stringify(body)); } catch { /* missing body */ }
};
// short headline (few English words) + its Hebrew meaning
// headlines made by the fallback are redone once the AI is available
const needShort = process.env.NO_SUMMARY ? [] : keep.filter((m) => !m.short || m.short.v !== SHORT_V || (process.env.GEMINI_API_KEY && !m.short.ai)).slice(0, 300);
const shorts = await summarize(needShort);
for (const m of needShort) if (shorts[m.id]) { m.short = shorts[m.id]; await patchBody(m.id, { short: m.short }); }
console.log('short headlines for', Object.keys(shorts).length, 'articles');
// openly licensed photo with credit (image === undefined means "not looked up yet")
let pics = 0;
for (const m of keep) {
  if (process.env.NO_PHOTOS || m.image !== undefined || pics >= 200) continue;
  m.image = await findImage(m);
  await patchBody(m.id, { image: m.image, cat: m.cat, ...(m.sub ? { sub: m.sub } : {}) });
  pics++;
}
console.log('looked up photos for', pics, 'articles');
for (const m of keep) await patchBody(m.id, { cat: m.cat, ...(m.sub ? { sub: m.sub } : {}) });

keep.sort((x, y) => new Date(y.date) - new Date(x.date));
await fs.writeFile(path.join(OUT, 'index.json'), JSON.stringify({ updated: new Date().toISOString(), articles: keep }));
const tally = keep.reduce((t, m) => { const k = m.cat + (m.sub ? '/' + m.sub : ''); t[k] = (t[k] || 0) + 1; return t; }, {});
console.log(`added ${added}, total ${keep.length}`, tally);
