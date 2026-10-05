/* Daily news → original English learning articles (see the product spec).
   DISCOVERY (official RSS of known publishers) → VERIFICATION (real URL, source, date, title, content page)
   → FACT GATHERING (source pages; at least one solid source, preferably several) → DEDUPLICATION (URL + title)
   → RANKING (source, freshness, multi-source, category balance) → ORIGINAL LEARNING ARTICLE at the reader's level
   (Gemini, facts only) → QA (Gemini check + local number/copy checks) → STORAGE (data/news, cumulative).
   Sources are used behind the scenes only; the reader never leaves the app. Nothing is invented: if facts can't be
   gathered or the QA fails, the story is not published.
   Env: GEMINI_API_KEY (required for writing), READING_LEVEL (A1–C2, default B1), GEMINI_MODEL, DAILY_MAX. */
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve('data/news');
const LEVEL = /^(A1|A2|B1|B2|C1|C2)$/.test(process.env.READING_LEVEL || '') ? process.env.READING_LEVEL : 'B1';
let MODEL = process.env.GEMINI_MODEL || '';
const KEY = process.env.GEMINI_API_KEY || '';
const DAILY_MAX = +(process.env.DAILY_MAX || 18);   // articles per day (free Gemini quota: 2 calls per article)
const PER_CAT_DAY = 2;                               // keeps the feed balanced
const UA = 'Mozilla/5.0 (compatible; english-teacher-app; +https://github.com/neryabenami/english-teacher)';

export const CATS = ['tech', 'finance', 'business', 'travel', 'health', 'sports', 'entertainment', 'science', 'psychology', 'relationships', 'world', 'gaming', 'food', 'cars', 'fashion'];
const BBC = (p) => `https://feeds.bbci.co.uk/${p}`;
const GU = (p) => `https://www.theguardian.com/${p}/rss`;
const FEEDS = [
  [BBC('news/world/rss.xml'), 'BBC News', 'world', 3], [BBC('news/technology/rss.xml'), 'BBC News', 'tech', 3], [BBC('news/business/rss.xml'), 'BBC News', 'business', 3],
  [BBC('news/science_and_environment/rss.xml'), 'BBC News', 'science', 3], [BBC('news/health/rss.xml'), 'BBC News', 'health', 3],
  [BBC('news/entertainment_and_arts/rss.xml'), 'BBC News', 'entertainment', 3], [BBC('sport/rss.xml'), 'BBC Sport', 'sports', 3],
  [GU('world'), 'The Guardian', 'world', 3], [GU('technology'), 'The Guardian', 'tech', 3], [GU('business'), 'The Guardian', 'business', 3],
  [GU('science'), 'The Guardian', 'science', 3], [GU('travel'), 'The Guardian', 'travel', 3], [GU('food'), 'The Guardian', 'food', 3],
  [GU('fashion'), 'The Guardian', 'fashion', 3], [GU('games'), 'The Guardian', 'gaming', 3], [GU('money'), 'The Guardian', 'finance', 3],
  [GU('sport'), 'The Guardian', 'sports', 3], [GU('film'), 'The Guardian', 'entertainment', 3], [GU('lifeandstyle/relationships'), 'The Guardian', 'relationships', 3],
  [GU('science/psychology'), 'The Guardian', 'psychology', 3], [GU('lifeandstyle/health-and-wellbeing'), 'The Guardian', 'health', 3], [GU('technology/motoring'), 'The Guardian', 'cars', 3],
  ['https://feeds.npr.org/1001/rss.xml', 'NPR', 'world', 3], ['https://feeds.npr.org/1019/rss.xml', 'NPR', 'tech', 3], ['https://feeds.npr.org/1006/rss.xml', 'NPR', 'business', 3],
  ['https://feeds.npr.org/1007/rss.xml', 'NPR', 'science', 3], ['https://feeds.npr.org/1128/rss.xml', 'NPR', 'health', 3],
  ['https://www.cnbc.com/id/100003114/device/rss/rss.html', 'CNBC', 'business', 3], ['https://www.cnbc.com/id/10000664/device/rss/rss.html', 'CNBC', 'finance', 3],
  ['https://www.cnbc.com/id/19854910/device/rss/rss.html', 'CNBC', 'tech', 3],
  ['https://techcrunch.com/feed/', 'TechCrunch', 'tech', 2], ['https://www.theverge.com/rss/index.xml', 'The Verge', 'tech', 2], ['https://www.wired.com/feed/rss', 'Wired', 'tech', 2],
  ['https://arstechnica.com/feed/', 'Ars Technica', 'tech', 2], ['https://www.espn.com/espn/rss/news', 'ESPN', 'sports', 3],
  ['https://www.polygon.com/rss/index.xml', 'Polygon', 'gaming', 2], ['https://feeds.feedburner.com/ign/news', 'IGN', 'gaming', 2],
  ['https://electrek.co/feed/', 'Electrek', 'cars', 2], ['https://www.motor1.com/rss/news/all/', 'Motor1', 'cars', 2], ['https://www.eater.com/rss/index.xml', 'Eater', 'food', 2],
  ['https://www.psypost.org/feed/', 'PsyPost', 'psychology', 2], ['https://www.sciencedaily.com/rss/top/science.xml', 'ScienceDaily', 'science', 2],
  ['https://www.sciencedaily.com/rss/mind_brain.xml', 'ScienceDaily', 'psychology', 2]
].map(([url, source, cat, weight]) => ({ url, source, cat, weight }));
/* topic words (the spec's per-category queries) used to place a story in the right category */
const TOPIC_WORDS = {
  tech: 'technology artificial intelligence ai apple google microsoft cybersecurity startup app apps gadget smartphone software chip openai',
  finance: 'finance market markets investing investor stocks shares economy inflation interest rate rates bank banking cryptocurrency bitcoin bond bonds',
  business: 'company companies jobs workplace hiring careers career management entrepreneur ceo layoffs workers',
  travel: 'travel destination aviation airline airport tourism tourist hotel hotels holiday flights',
  health: 'fitness exercise nutrition diet sleep wellness health disease doctors hospital',
  sports: 'football basketball tennis nba champions league tournament match cup olympic f1 formula grand prix golf cricket rugby',
  entertainment: 'movie film television tv streaming netflix music album celebrity actor singer',
  science: 'science scientists discovery space astronomy nasa biology physics nature research study species planet',
  psychology: 'behavior behaviour habits memory motivation psychology psychologists brain mental anxiety',
  relationships: 'relationship relationships dating couples partner marriage friendship loneliness',
  world: 'war election president government minister international summit protest crisis united nations',
  gaming: 'video game games gaming console playstation xbox nintendo esports',
  food: 'food cooking recipe restaurant chef cuisine culinary',
  cars: 'car cars electric vehicle ev tesla automotive driving transportation',
  fashion: 'fashion clothing designer designers runway style brand'
};

/* items that are not news stories: opinion columns ("… | Author"), reader call-outs, recipes, quizzes, deals, live blogs */
const NOT_NEWS = /\s\|\s|^(send us|tell us|share your|post your|readers'|your questions)|\b(recipe|recipes|crossword|quiz|as it happened|live updates|podcast|newsletter|deal of the day|best deals|on sale|discount code|horoscope)\b|\b\d+ (everyday |best |great )?(items|things|products|gifts|buys|picks)\b/i;

/* ---------- helpers ---------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…' };
const decode = (s) => String(s || '').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENT[e.toLowerCase()] ?? m));
const strip = (h) => decode(String(h || '').replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const normUrl = (u) => { try { const x = new URL(u); x.hash = ''; [...x.searchParams.keys()].forEach((k) => { if (/^(utm_|at_|cmp|ref|src|ito|CMP)/i.test(k)) x.searchParams.delete(k); }); return (x.origin + x.pathname).replace(/\/$/, '') + (x.search || ''); } catch { return u; } };
const STOPW = new Set('the a an and or of to in on for with at by from as is are was were be been it its this that these those after over into about new says say said will can how why what who when amid more than up out not his her their they we you'.split(' '));
/* names in a headline (capitalised words after the first) — two shared names usually mean the same story */
const names = (t) => new Set((t.match(/(?<!^)\b[A-Z][a-z’'A-Z-]{2,}/g) || []).map((w) => w.toLowerCase()).filter((w) => !STOPW.has(w)));
const sameStory = (a, b) => jaccard(a.tokens, b.tokens) >= 0.45 || (jaccard(a.tokens, b.tokens) >= 0.15 && [...a.names].filter((x) => b.names.has(x)).length >= 2);
const tokens = (t) => new Set((t.toLowerCase().match(/[a-z0-9']+/g) || []).filter((w) => w.length > 2 && !STOPW.has(w)));
const jaccard = (a, b) => { let i = 0; for (const x of a) if (b.has(x)) i++; return i / Math.max(1, a.size + b.size - i); };
const hoursAgo = (d) => (Date.now() - new Date(d).getTime()) / 36e5;
const publisher = (it) => it.source.replace(/\s+(News|Sport)$/, ''); // BBC News and BBC Sport are one publisher
const words = (s) => (s.match(/[A-Za-z’'-]+/g) || []).length;

async function get(url, type = 'text', tries = 2) {
  for (let a = 0; a < tries; a++) {
    await sleep(a ? 4000 : 300);
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: type === 'json' ? 'application/json' : '*/*' }, redirect: 'follow' });
      if (r.status === 429 || r.status >= 500) continue;
      if (!r.ok) throw new Error(String(r.status));
      return type === 'json' ? await r.json() : await r.text();
    } catch (e) { if (a === tries - 1) throw e; }
  }
  throw new Error('gave up');
}

/* ---------- discovery ---------- */
function parseFeed(xml, feed) {
  const out = [];
  const blocks = xml.includes('<item') ? xml.split(/<item[\s>]/).slice(1) : xml.split(/<entry[\s>]/).slice(1);
  for (const b of blocks) {
    const tag = (t) => { const m = b.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)); return m ? m[1] : ''; };
    const title = strip(tag('title'));
    let link = strip(tag('link'));
    if (!link) link = (b.match(/<link[^>]*href="([^"]+)"/) || [])[1] || '';
    const date = strip(tag('pubDate')) || strip(tag('published')) || strip(tag('updated')) || strip(tag('dc:date'));
    const desc = strip(tag('description')) || strip(tag('summary')) || strip(tag('content'));
    if (!title || !/^https?:\/\//.test(link) || !date || isNaN(new Date(date))) continue; // verification: real URL, title, date
    if (/\/(live|video|videos|av|sounds|podcasts?|gallery|in-pictures|quiz|crosswords?)\//i.test(link)) continue; // not an article page
    if (NOT_NEWS.test(title)) continue;                                                                  // columns, call-outs, recipes, deals
    out.push({ title, url: normUrl(link), date: new Date(date).toISOString(), desc: desc.slice(0, 600), source: feed.source, hint: feed.cat, weight: feed.weight });
  }
  return out;
}
function categorize(item) {
  const t = ` ${(item.title + ' ' + item.desc).toLowerCase()} `;
  let best = item.hint, score = 0.5;
  for (const [cat, list] of Object.entries(TOPIC_WORDS)) {
    let s = 0;
    for (const w of list.split(' ')) if (t.includes(` ${w} `) || t.includes(` ${w}s `)) s++;
    if (cat === item.hint) s += 2.5; // the publisher's own section counts most
    if (s > score) { score = s; best = cat; }
  }
  return best;
}

/* ---------- facts: the publisher's own article page ---------- */
async function pageText(url) {
  try {
    const html = await get(url, 'text', 1);
    const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<nav[\s\S]*?<\/nav>|<footer[\s\S]*?<\/footer>|<aside[\s\S]*?<\/aside>/gi, ' ');
    const paras = [...body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => strip(m[1])).filter((p) => p.length > 60 && !/cookie|subscribe|newsletter|sign up|all rights reserved|advertis/i.test(p));
    const text = paras.join('\n');
    return text.split(/\s+/).slice(0, 1600).join(' ');
  } catch { return ''; }
}

/* ---------- Gemini ---------- */
let geminiCalls = 0;
// Google retires model names over time, so the stable Flash models on this key are listed at run time, newest first.
// A model that is retired or overloaded is dropped for the rest of the run and the next one is used.
let MODELS = null;
async function listModels() {
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': KEY } });
  const ok = r.ok ? ((await r.json()).models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map((m) => m.name.replace(/^models\//, ''))
    .filter((n) => /^gemini-[\d.]+-flash(-lite)?$/.test(n)) : [];
  const ver = (n) => parseFloat((n.match(/gemini-([\d.]+)/) || [0, 0])[1]);
  ok.sort((a, b) => (a.includes('lite') - b.includes('lite')) || ver(b) - ver(a));
  return [...new Set([MODEL, ...ok, 'gemini-flash-latest'].filter(Boolean))];
}
async function gemini(system, user) {
  if (!MODELS) { MODELS = await listModels(); console.log('models ' + MODELS.join(', ')); }
  while (MODELS.length) {
    const model = MODELS[0];
    let last = '';
    for (let a = 0; a < 4; a++) {
      geminiCalls++;
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: user }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.3 } })
      });
      if (r.ok) { MODEL = model; const j = await r.json(); return JSON.parse(j.candidates[0].content.parts[0].text); }
      last = r.status + ' ' + (await r.text()).slice(0, 160);
      if (r.status === 429 || r.status >= 500) { await sleep(8000 * (a + 1)); continue; }
      break;
    }
    if (/^4(00|01|03)\b/.test(last)) throw new Error('gemini ' + last);
    console.log(`model ${model} unavailable (${last.slice(0, 40)}), trying the next one`);
    MODELS.shift();
  }
  throw new Error('gemini: no model available');
}
const LEVEL_GUIDE = {
  A1: 'CEFR A1: very short simple sentences, present tense mostly, the 1000 most common words, 150-250 words.',
  A2: 'CEFR A2: short simple sentences, common words, simple past and future, 200-350 words.',
  B1: 'CEFR B1: clear sentences, everyday vocabulary plus key topic words, some linking words, 300-450 words.',
  B2: 'CEFR B2: varied sentences, wider vocabulary, some complex structures, 350-550 words.',
  C1: 'CEFR C1: natural, rich and precise language, complex structures allowed, 400-600 words.',
  C2: 'CEFR C2: sophisticated, idiomatic, nuanced language, 450-600 words.'
};
async function writeArticle(cluster, material) {
  const system = 'You turn verified news reporting into ORIGINAL English reading lessons for Hebrew-speaking learners. You never invent events, facts, numbers, dates, quotes, people, organizations, sources or URLs. You do not copy sentences or distinctive phrasing from the sources; you write a new text from the facts.';
  const user = `Reader level: ${LEVEL}. ${LEVEL_GUIDE[LEVEL]}
Category must be one of: ${CATS.join(', ')}.
Sources (the only allowed facts):
${material}

Return ONLY JSON:
{"is_real_news": true|false, "category": "...", "quality_score": 1-10, "interest_score": 1-10,
 "facts": [{"fact": "...", "sources": [1]}],
 "display_title": "2-6 English words, clear, not clickbait, not stronger than the sources",
 "display_title_he": "the display title in natural Hebrew",
 "short_summary": "1-2 English sentences",
 "article": "the learning article, paragraphs separated by a blank line; keep attributions like 'according to', 'researchers said'; forecasts stay forecasts; uncertainty stays",
 "glossary": [{"text": "word or multi-word expression exactly as in the article", "lemma": "base form", "pos": "noun|verb|adjective|adverb|phrasal verb|idiom|compound|name|other", "he": "short natural Hebrew meaning in THIS sentence (for names: the name in Hebrew letters)", "name": true|false}]}
Glossary: every content word and every multi-word expression (phrasal verbs, compound nouns like "interest rate", idioms, names like "New York") that appears in the article; skip only very basic words (the, a, is, and, of, to, in...). Up to 220 entries.
If the material is not a real, specific news story or the facts are too thin, set is_real_news false.`;
  return gemini(system, user);
}
async function checkArticle(material, a) {
  const system = 'You are a strict fact checker for news-based reading lessons.';
  const user = `Sources:
${material}

Lesson title: ${a.display_title}
Lesson text:
${a.article}

Check: 1) every name, number, date and claim in the lesson is supported by the sources; 2) nothing was added; 3) certainty and attributions are preserved; 4) the title matches the story and is not stronger than the sources; 5) the text is natural English and not a close copy of the sources.
Return ONLY JSON {"ok": true|false, "problems": ["..."]}`;
  return gemini(system, user);
}
const FOREIGN = /[^\s -ɏ֐-׿ -⁯₪€]/;
function localChecks(a, material) {
  const problems = [];
  const src = material.toLowerCase();
  for (const n of a.article.match(/\b\d[\d,.]*\b/g) || []) { const k = n.replace(/[,.]$/, ''); if (!src.includes(k.toLowerCase())) problems.push('number not in sources: ' + k); }
  const shingles = (t) => { const w = t.toLowerCase().match(/[a-z']+/g) || []; const s = new Set(); for (let i = 0; i + 8 <= w.length; i++) s.add(w.slice(i, i + 8).join(' ')); return s; };
  const as = shingles(a.article), ss = shingles(material);
  let shared = 0; for (const x of as) if (ss.has(x)) shared++;
  if (as.size && shared / as.size > 0.04) problems.push('too close to the source wording');
  const n = words(a.article);
  if (n < 120 || n > 750) problems.push('length ' + n);
  if (!a.display_title || a.display_title.split(/\s+/).length > 8) problems.push('title');
  // Hebrew text may hold only Hebrew, Latin letters, digits and punctuation (smaller models sometimes slip in Thai or Sinhala letters).
  if (FOREIGN.test(a.display_title_he || '') || FOREIGN.test(a.short_summary || '')) problems.push('stray letters in the Hebrew text');
  a.glossary = (a.glossary || []).filter((g) => !FOREIGN.test(g.he || ''));
  return problems;
}

/* ---------- photo: openly licensed (Wikimedia Commons), related to the title, with credit; otherwise none ---------- */
const QSTOP = new Set('the a an and or of to in on for with why how what who is are was were be can will this that it its as at by from into about after over more new says'.split(' '));
async function commonsImage(title) {
  const q = title.toLowerCase().replace(/[^a-z\s-]/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !QSTOP.has(w)).slice(0, 3).join(' ');
  if (!q) return null;
  try {
    const j = await get('https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=640&gsrsearch=' + encodeURIComponent('filetype:bitmap ' + q), 'json');
    for (const p of Object.values(j.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0))) {
      const ii = (p.imageinfo || [])[0]; const md = (ii && ii.extmetadata) || {};
      const lic = strip(md.LicenseShortName && md.LicenseShortName.value);
      if (!ii || !ii.thumburl || !/^(CC BY|CC0|Public domain|PD)/i.test(lic) || /NC/.test(lic) || (ii.thumbwidth || 0) < (ii.thumbheight || 0)) continue;
      return { url: ii.thumburl, credit: `${strip(md.Artist && md.Artist.value).slice(0, 60) || 'Wikimedia Commons'} · ${lic}`, page: ii.descriptionurl };
    }
  } catch { /* no photo */ }
  return null;
}

/* ---------- main ---------- */
await fs.mkdir(OUT, { recursive: true });
const readJson = async (f, d) => { try { return JSON.parse(await fs.readFile(path.join(OUT, f), 'utf8')); } catch { return d; } };
const index = await readJson('index.json', { articles: [] });
const runs = await readJson('runs.json', []);
const run = { run_id: new Date().toISOString(), level: LEVEL, sources_checked: 0, sources_failed: [], candidates: 0, rejected: 0, duplicates: 0, verified: 0, created: 0, published_by_cat: {}, errors: [] };
const today = run.run_id.slice(0, 10);
// Everything below is per reading level: after the reader changes level, a full set of articles is written at the new level.
const mine = index.articles.filter((a) => a.english_level === LEVEL);
const publishedToday = mine.filter((a) => a.first_published_in_app_at.slice(0, 10) === today);
const knownUrls = new Set(mine.flatMap((a) => a.sources.map((s) => s.url)));
const recentTitles = mine.filter((a) => hoursAgo(a.first_published_in_app_at) < 24 * 10).map((a) => { const t = a.sources.map((s) => s.title).join(' '); return { tokens: tokens(t), names: names(t) }; });

// 1. discovery
const items = [];
for (const feed of FEEDS) {
  run.sources_checked++;
  try { items.push(...parseFeed(await get(feed.url), feed)); } catch (e) { run.sources_failed.push(feed.source + ' ' + feed.url); }
}
run.candidates = items.length;

// 2. dedupe + cluster (same story from several publishers → one lesson with all sources)
const fresh = items.filter((it) => { if (knownUrls.has(it.url)) { run.duplicates++; return false; } return true; });
const clusters = [];
for (const it of fresh.sort((a, b) => b.weight - a.weight)) {
  const me = { tokens: tokens(it.title), names: names(it.title) };
  if (recentTitles.some((t) => sameStory(t, me))) { run.duplicates++; continue; }
  const c = clusters.find((cl) => sameStory(cl, me));
  if (c) { if (!c.items.some((x) => publisher(x) === publisher(it))) c.items.push(it); else run.duplicates++; continue; }
  clusters.push({ ...me, items: [it] });
}

// 3. time window: 24h, then 48h, then up to 7 days — per category, only if needed
const budget = Math.max(0, DAILY_MAX - publishedToday.length);
const perCatToday = {};
for (const a of publishedToday) perCatToday[a.category] = (perCatToday[a.category] || 0) + 1;
for (const c of clusters) {
  c.cat = categorize(c.items[0]);
  c.newest = Math.min(...c.items.map((x) => hoursAgo(x.date)));
  c.score = Math.max(...c.items.map((x) => x.weight)) + Math.min(3, c.items.length - 1) * 1.5 - Math.min(c.newest, 168) / 24 + Math.min(1, c.items[0].desc.length / 300);
}
// round-robin over categories (one each, then a second), widening the time window only when a category has nothing fresh
const picked = [];
for (let round = 1; round <= PER_CAT_DAY && picked.length < budget; round++) {
  for (const cat of CATS) {
    if (picked.length >= budget) break;
    if ((perCatToday[cat] || 0) + picked.filter((p) => p.cat === cat).length >= round) continue;
    for (const windowH of [24, 48, 168]) {
      const best = clusters.filter((c) => c.cat === cat && c.newest <= windowH && !picked.includes(c)).sort((a, b) => b.score - a.score)[0];
      if (best) { picked.push(best); break; }
    }
  }
}
const queue = picked;
console.log(`level ${LEVEL} · candidates ${items.length} · clusters ${clusters.length} · picked ${queue.length} (budget ${budget})`);

if (!KEY) {
  console.warn('GEMINI_API_KEY is not set: stories were found and verified, but no lessons can be written. Nothing published.');
  for (const c of queue.slice(0, 20)) console.log(` · [${c.cat}] ${c.items.map((x) => x.source).join(' + ')}: ${c.items[0].title}`);
} else {
  for (const c of queue) {
    try {
      // 4. facts from the publishers' own pages (fall back to the feed text); need enough real material
      const texts = [];
      for (const it of c.items.slice(0, 3)) {
        const page = await pageText(it.url);
        texts.push({ it, text: page.length > 400 ? page : it.desc });
      }
      const material = texts.map((t, i) => `[${i + 1}] ${t.it.source} — "${t.it.title}" (${t.it.date})\n${t.text}`).join('\n\n');
      if (words(texts.map((t) => t.text).join(' ')) < 150) { run.rejected++; continue; }
      run.verified++;
      // 5. original learning article at the reader's level
      const a = await writeArticle(c, material);
      if (!a.is_real_news || !CATS.includes(a.category) || !a.article || (a.quality_score || 0) < 6) { run.rejected++; continue; }
      // 6. QA: local checks + independent fact check
      const problems = localChecks(a, material);
      if (!problems.length) { const qa = await checkArticle(material, a); if (!qa.ok) problems.push(...(qa.problems || ['fact check failed'])); }
      if (problems.length) { run.rejected++; run.errors.push(`${c.items[0].title.slice(0, 60)}: ${problems.slice(0, 2).join('; ')}`); continue; }
      // 7. store
      const id = 'n-' + today.replace(/-/g, '') + '-' + Math.abs([...c.items[0].url].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7)).toString(36);
      const paragraphs = a.article.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
      const n = words(a.article);
      const meta = {
        id, category: a.category, display_title: a.display_title.trim(), display_title_he: (a.display_title_he || '').trim(), short_summary: a.short_summary,
        english_level: LEVEL, words: n, reading_time: Math.max(1, Math.round(n / 150)),
        image: await commonsImage(a.display_title + ' ' + c.items[0].title),
        sources: c.items.map((it) => ({ name: it.source, domain: new URL(it.url).hostname.replace(/^www\./, ''), url: it.url, title: it.title, published_at: it.date })),
        published_at: c.items.map((x) => x.date).sort()[0], first_published_in_app_at: new Date().toISOString(),
        quality_score: a.quality_score, interest_score: a.interest_score, verification_status: 'verified', content_status: 'published'
      };
      await fs.writeFile(path.join(OUT, id + '.json'), JSON.stringify({ ...meta, paragraphs, facts: a.facts, glossary: (a.glossary || []).filter((g) => g.text && g.he).slice(0, 260) }));
      index.articles.unshift(meta);
      c.items.forEach((it) => knownUrls.add(it.url));
      run.created++;
      run.published_by_cat[a.category] = (run.published_by_cat[a.category] || 0) + 1;
      console.log(` ✓ [${a.category}] ${meta.display_title} (${meta.sources.map((s) => s.name).join(', ')})`);
    } catch (e) {
      run.errors.push(String(e.message || e).slice(0, 160));
      if (/quota/.test(String(e.message))) break;
    }
  }
}

// cumulative: nothing is deleted; the app shows a clean recent window, favourites keep older ones
if (run.created || !index.updated) index.updated = new Date().toISOString();
await fs.writeFile(path.join(OUT, 'index.json'), JSON.stringify(index));
run.gemini_calls = geminiCalls;
run.end = new Date().toISOString();
runs.unshift(run);
await fs.writeFile(path.join(OUT, 'runs.json'), JSON.stringify(runs.slice(0, 60), null, 1));
console.log(JSON.stringify({ created: run.created, rejected: run.rejected, duplicates: run.duplicates, failed_sources: run.sources_failed.length, errors: run.errors.slice(0, 5) }));
