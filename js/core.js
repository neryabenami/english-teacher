/* Core: catalog, storage, spaced repetition (SM-2), speech, dictionary lookup, AI providers.
   Every external service sits behind a small provider object so it can be swapped later. */
(function () {
  'use strict';
  const D = window.APP_DATA;
  const ET = (window.ET = {});

  /* ---------- utils ---------- */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sample = (a, n) => shuffle(a).slice(0, n);
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const norm = (s) => String(s).toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
  Object.assign(ET, { esc, dayKey, shuffle, sample, hash, norm });

  /* ---------- levels ---------- */
  const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const BANDS = { beginner: { he: 'מתחילים', cefr: 'A2' }, intermediate: { he: 'בינוני', cefr: 'B1' }, advanced: { he: 'מתקדמים', cefr: 'C1' } };
  const bandOf = (cefr) => (LEVELS.indexOf(cefr) <= 1 ? 'beginner' : LEVELS.indexOf(cefr) <= 3 ? 'intermediate' : 'advanced');
  const lvlIdx = (l) => Math.max(0, LEVELS.indexOf(l));
  const POS = { n: 'שם עצם', v: 'פועל', adj: 'שם תואר', adv: 'תואר הפועל', phr: 'צירוף' };
  const KINDS = {
    slang: { he: 'סלנג', icon: '🔥' }, spoken: { he: 'Spoken English', icon: '🗣️' }, phrasal: { he: 'Phrasal Verbs', icon: '🧩' },
    idiom: { he: 'Idioms', icon: '🎭' }, expr: { he: 'ביטויים נפוצים', icon: '💬' }, texting: { he: 'Texting', icon: '📲' }
  };
  const SLANG_CATS = [
    { id: 'daily', he: 'Daily Slang' }, { id: 'american', he: 'American' }, { id: 'british', he: 'British' },
    { id: 'social', he: 'Social Media' }, { id: 'texting', he: 'Texting' }, { id: 'dating', he: 'Dating' },
    { id: 'friends', he: 'Friends' }, { id: 'work', he: 'Work' }, { id: 'abbr', he: 'Abbreviations' }
  ];
  const PATH = ['נחשפתי', 'הבנתי', 'שמעתי', 'ראיתי בהקשר', 'השתמשתי', 'חזרתי', 'זכרתי'];
  const PATH_BIT = { exposed: 0, understood: 1, heard: 2, context: 3, used: 4, reviewed: 5, remembered: 6 };
  Object.assign(ET, { LEVELS, BANDS, bandOf, lvlIdx, POS, KINDS, SLANG_CATS, PATH, PATH_BIT });

  /* ---------- catalog ---------- */
  const ITEMS = [];
  const BY_ID = {};
  const BY_TERM = {};
  const add = (it) => { ITEMS.push(it); BY_ID[it.id] = it; BY_TERM[it.t.toLowerCase()] = BY_TERM[it.t.toLowerCase()] || it; };
  D.CATEGORIES.forEach((cat) => {
    D.WORDS[cat.id].trim().split('\n').forEach((line) => {
      const [t, he, pos, lvl, emoji, ipa, ex, exHe] = line.split('|').map((s) => s.trim());
      add({ id: 'w:' + t.toLowerCase(), type: 'word', cat: cat.id, t, he, pos, lvl, emoji, ipa, ex, exHe });
    });
  });
  D.EXPRESSIONS.trim().split('\n').forEach((line) => {
    const [kind, cat, t, he, lit, real, ex, exHe, ctx, formal, region, freq, lvl] = line.split('|').map((s) => s.trim());
    add({ id: 'x:' + t.toLowerCase(), type: 'expr', kind, cat, t, he, lit, real, ex, exHe, ctx, formal: +formal, region, freq: +freq, lvl, emoji: KINDS[kind].icon, pos: 'phr' });
  });
  const LEX = {};
  window.APP_LEX.trim().split('\n').forEach((l) => { const i = l.indexOf('='); if (i > 0) LEX[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
  const CONTRACTIONS = {
    "i'm": 'אני (I am)', "it's": 'זה (it is)', "what's": 'מה (what is)', "let's": 'בוא נ־ (let us)', "i've": 'אני / יש לי (I have)',
    "you're": 'אתה (you are)', "we're": 'אנחנו (we are)', "they're": 'הם (they are)', "can't": 'לא יכול (cannot)', "won't": 'לא (will not)',
    "isn't": 'לא (is not)', "there's": 'יש (there is)', "that's": 'זה (that is)', "he's": 'הוא (he is)', "she's": 'היא (she is)',
    "i'd": 'הייתי (I would)', "i'll": 'אני (I will)', "doesn't": 'לא (does not)', "wasn't": 'לא היה (was not)', "you'll": 'אתה (you will)'
  };
  Object.assign(ET, { ITEMS, BY_ID, BY_TERM, LEX });
  ET.item = (id) => BY_ID[id];
  ET.wordsOf = (cat) => ITEMS.filter((i) => i.type === 'word' && i.cat === cat);
  ET.exprsOf = (kind, cat) => ITEMS.filter((i) => i.type === 'expr' && (kind === 'texting' ? (i.cat === 'texting' || i.cat === 'abbr') : i.kind === kind) && (!cat || i.cat === cat));

  /* ---------- storage provider (local first) ---------- */
  const StorageProvider = {
    key: 'english-teacher.v1',
    load() { try { return JSON.parse(localStorage.getItem(this.key)); } catch (e) { return null; } },
    save(data) { try { localStorage.setItem(this.key, JSON.stringify(data)); return true; } catch (e) { return false; } },
    clear() { try { localStorage.removeItem(this.key); } catch (e) { /* ignore */ } }
  };
  const defaults = () => ({
    v: 1, onboarded: false, created: Date.now(),
    profile: { level: 'beginner', cefr: 'A2', goal: 'all', interests: [], dailyMin: 10, accent: 'en-US', theme: 'system',
      correction: 'important', autoWifi: true, reminders: false, ai: 'local', geminiKey: '', geminiModel: 'gemini-2.5-flash', autoSpeak: false },
    items: {}, custom: {}, days: {}, chats: {}, reports: [], aiCache: {},
    stats: { quizzes: 0, qRight: 0, qTotal: 0, stories: {}, chats: 0, msgs: 0, games: 0, bestSpeed: 0, bestStreak: 0 },
    sync: { changes: 0, last: 0 }
  });
  const loaded = StorageProvider.load();
  const S = loaded && loaded.v === 1 ? loaded : defaults();
  const base = defaults();
  for (const k of Object.keys(base)) if (S[k] === undefined) S[k] = base[k];
  for (const k of Object.keys(base.profile)) if (S.profile[k] === undefined) S.profile[k] = base.profile[k];
  for (const k of Object.keys(base.stats)) if (S.stats[k] === undefined) S.stats[k] = base.stats[k];
  Object.values(S.custom).forEach((c) => { if (!BY_ID[c.id]) add(c); });
  ET.S = S;
  let saveTimer = null;
  ET.save = (now) => {
    S.sync.changes++;
    clearTimeout(saveTimer);
    if (now) StorageProvider.save(S); else saveTimer = setTimeout(() => StorageProvider.save(S), 250);
  };
  ET.resetAll = () => { StorageProvider.clear(); location.hash = ''; location.reload(); };
  ET.exportData = () => JSON.stringify(S, null, 1);
  ET.importData = (json) => {
    const d = JSON.parse(json);
    if (!d || d.v !== 1 || !d.profile) throw new Error('bad');
    StorageProvider.save(d);
  };

  /* Sync provider: interface ready for a free backend (e.g. Supabase free tier). Today: device only. */
  ET.SyncProvider = {
    name: 'device',
    connected: false,
    async sync() { return { ok: false, reason: 'not-connected' }; }
  };

  /* ---------- daily activity & streak ---------- */
  const today = () => (S.days[dayKey()] = S.days[dayKey()] || { sec: 0, learned: 0, reviewed: 0, active: false });
  ET.today = today;
  ET.activity = () => { const t = today(); if (!t.active) { t.active = true; const s = ET.streak(); if (s > S.stats.bestStreak) S.stats.bestStreak = s; } ET.save(); };
  ET.streak = () => {
    const d = new Date();
    if (!(S.days[dayKey(d)] || {}).active) d.setDate(d.getDate() - 1);
    let n = 0;
    while ((S.days[dayKey(d)] || {}).active) { n++; d.setDate(d.getDate() - 1); }
    return n;
  };
  ET.totalMinutes = () => Math.round(Object.values(S.days).reduce((a, d) => a + (d.sec || 0), 0) / 60);

  /* ---------- spaced repetition (SM-2 variant, local) ---------- */
  const DAY = 864e5;
  ET.rec = (id) => S.items[id];
  const ensure = (id) => (S.items[id] = S.items[id] || { s: 'new', ef: 2.5, iv: 0, reps: 0, due: 0, p: 0, saved: false, seen: 0, last: 0, lapses: 0 });
  ET.ensure = ensure;
  ET.mark = (id, bit) => { if (!BY_ID[id]) return; const r = ensure(id); r.p |= 1 << PATH_BIT[bit]; if (!r.seen) r.seen = Date.now(); ET.save(); };
  ET.preview = (id, q) => {
    const r = S.items[id] || { ef: 2.5, iv: 0, reps: 0, s: 'new' };
    if (q === 1) return 'עוד 10 דק׳';
    const iv = q === 5 ? (r.reps === 0 ? (r.s === 'new' ? 3 : 1) : r.reps === 1 ? 4 : Math.round(r.iv * r.ef)) : Math.max(1, Math.round(r.iv * 1.2));
    return iv <= 1 ? 'מחר' : `בעוד ${iv} ימים`;
  };
  ET.grade = (id, q) => {
    const r = ensure(id);
    const now = Date.now();
    const first = !r.last;
    if (q === 5) {
      r.iv = r.reps === 0 ? (r.s === 'new' ? 3 : 1) : r.reps === 1 ? 4 : Math.round(r.iv * r.ef);
      r.reps++; r.ef = Math.min(3, r.ef + 0.1); r.s = 'known';
    } else if (q === 3) {
      r.iv = Math.max(1, Math.round(r.iv * 1.2)); r.reps++; r.ef = Math.max(1.3, r.ef - 0.15); r.s = 'hard';
    } else {
      r.reps = 0; r.iv = 0; r.ef = Math.max(1.3, r.ef - 0.2); r.s = 'learning'; r.lapses++;
    }
    r.due = q === 1 ? now + 10 * 60e3 : now + r.iv * DAY;
    r.last = now; if (!r.seen) r.seen = now;
    r.p |= 1 << PATH_BIT.exposed;
    if (r.reps >= 2) r.p |= 1 << PATH_BIT.reviewed;
    if (r.iv >= 7) r.p |= 1 << PATH_BIT.remembered;
    const t = today(); if (first) t.learned++; else t.reviewed++;
    ET.activity();
  };
  ET.isDue = (id) => { const r = S.items[id]; return !!(r && r.last && r.due <= Date.now()); };
  ET.dueIds = () => Object.keys(S.items).filter((id) => BY_ID[id] && ET.isDue(id)).sort((a, b) => S.items[a].due - S.items[b].due);
  ET.toggleSave = (id) => { const r = ensure(id); r.saved = !r.saved; if (!r.seen) r.seen = Date.now(); ET.save(); return r.saved; };
  ET.status = (id) => { const r = S.items[id]; if (!r || !r.last) return r && r.saved ? 'saved' : 'new'; return r.s; };

  const userIdx = () => lvlIdx(S.profile.cefr);
  const interestCats = () => {
    const cats = new Set();
    S.profile.interests.forEach((i) => { const it = D.INTERESTS.find((x) => x.id === i); if (it) it.cats.forEach((c) => cats.add(c)); });
    return cats;
  };
  ET.newIds = (n) => {
    const max = Math.min(5, userIdx() + 1);
    const cats = interestCats();
    const goal = S.profile.goal;
    const wantExpr = ['slang', 'conversation', 'movies', 'all'].includes(goal);
    const fresh = ITEMS.filter((i) => !S.items[i.id] || !S.items[i.id].last).filter((i) => lvlIdx(i.lvl) <= max && !i.id.startsWith('c:'));
    const score = (i) => (cats.has(i.cat) ? 0 : 2) + (i.type === 'expr' ? (wantExpr ? 0 : 3) : 0) + Math.abs(lvlIdx(i.lvl) - userIdx()) + Math.random() * 2.5;
    return fresh.sort((a, b) => score(a) - score(b)).slice(0, n).map((i) => i.id);
  };
  ET.sessionSize = () => ({ 5: 8, 10: 12, 15: 15, 20: 20, 30: 25 }[S.profile.dailyMin] || 12);
  ET.buildSession = (kind, arg) => {
    const size = ET.sessionSize();
    const order = (list) => {
      const due = list.filter((i) => ET.isDue(i.id));
      const fresh = list.filter((i) => !S.items[i.id] || !S.items[i.id].last);
      const rest = shuffle(list.filter((i) => !due.includes(i) && !fresh.includes(i)));
      return [...due, ...shuffle(fresh), ...rest].map((i) => i.id);
    };
    if (kind === 'daily') { const due = ET.dueIds().slice(0, Math.ceil(size * 0.6)); return [...due, ...ET.newIds(size - due.length)]; }
    if (kind === 'review') return ET.dueIds().slice(0, 30);
    if (kind === 'cat') return order(ET.wordsOf(arg)).slice(0, 12);
    if (kind === 'real') { const [k, c] = arg.split('.'); return order(ET.exprsOf(k, c)).slice(0, 15); }
    if (kind === 'list') return shuffle(ET.myList(arg)).slice(0, 25);
    return [];
  };
  ET.myList = (tab) => {
    const ids = Object.keys(S.items).filter((id) => BY_ID[id]);
    const r = (id) => S.items[id];
    const recent = Date.now() - 3 * DAY;
    switch (tab) {
      case 'new': return ids.filter((id) => r(id).last && r(id).s !== 'known' && r(id).seen > recent);
      case 'hard': return ids.filter((id) => r(id).s === 'hard' || (r(id).lapses > 0 && r(id).s !== 'known'));
      case 'known': return ids.filter((id) => r(id).s === 'known');
      case 'saved': return ids.filter((id) => r(id).saved);
      case 'due': return ET.dueIds();
      default: return ids.filter((id) => r(id).last || r(id).saved);
    }
  };
  ET.recentIds = (n = 8) => Object.keys(S.items).filter((id) => BY_ID[id] && S.items[id].last).sort((a, b) => S.items[b].last - S.items[a].last).slice(0, n);
  ET.ofTheDay = (pool, salt) => pool[hash(dayKey() + salt) % pool.length];
  ET.wordOfDay = () => ET.ofTheDay(ITEMS.filter((i) => i.type === 'word' && lvlIdx(i.lvl) <= Math.min(5, userIdx() + 1)), 'w');
  ET.slangOfDay = () => ET.ofTheDay(ITEMS.filter((i) => i.type === 'expr' && i.kind === 'slang'), 's');
  ET.catProgress = (cat) => { const ws = ET.wordsOf(cat); const k = ws.filter((w) => ET.status(w.id) === 'known').length; return { known: k, total: ws.length }; };

  /* ---------- dictionary lookup ---------- */
  const variants = (w) => {
    const v = [w, w.replace(/'s$/, ''), w.replace(/s'$/, ''), w.replace(/ies$/, 'y'), w.replace(/es$/, ''), w.replace(/s$/, ''),
      w.replace(/ied$/, 'y'), w.replace(/ed$/, ''), w.replace(/ed$/, 'e'), w.replace(/d$/, ''), w.replace(/ing$/, ''), w.replace(/ing$/, 'e'),
      w.replace(/([bcdfgklmnprstvz])\1(ed|ing)$/, '$1'), w.replace(/ly$/, ''), w.replace(/ier$/, 'y'), w.replace(/iest$/, 'y'), w.replace(/er$/, ''), w.replace(/est$/, '')];
    return [...new Set(v)].filter((x) => x.length > 0);
  };
  ET.lookup = (raw) => {
    const w = String(raw).toLowerCase().replace(/[’]/g, "'").replace(/^'+|'+$/g, '');
    if (CONTRACTIONS[w]) return { t: raw, he: CONTRACTIONS[w] };
    for (const v of variants(w)) {
      const it = BY_TERM[v];
      if (it) return { t: it.t, he: it.he, item: it };
      if (LEX[v]) return { t: v, he: LEX[v] };
    }
    return { t: raw, he: null };
  };
  ET.search = (q, filter) => {
    q = q.trim().toLowerCase();
    if (!q) return [];
    const isHe = /[֐-׿]/.test(q);
    const match = (i) => (isHe ? (i.he + ' ' + (i.real || '')).includes(q) : i.t.toLowerCase().includes(q));
    const okType = (i) => !filter || filter === 'all' || (filter === 'word' ? i.type === 'word' : i.kind === filter);
    const res = ITEMS.filter((i) => okType(i) && match(i)).sort((a, b) => {
      const as = isHe ? 0 : a.t.toLowerCase().startsWith(q) ? 0 : 1;
      const bs = isHe ? 0 : b.t.toLowerCase().startsWith(q) ? 0 : 1;
      return as - bs || a.t.length - b.t.length;
    });
    if (!filter || filter === 'all' || filter === 'word') {
      Object.entries(LEX).forEach(([en, he]) => {
        if (res.length > 60 || BY_TERM[en]) return;
        if (isHe ? he.includes(q) : en.startsWith(q)) res.push({ id: 'lex:' + en, type: 'lex', t: en, he });
      });
    }
    return res.slice(0, 60);
  };
  ET.saveLexWord = (word, he, ex) => {
    const id = 'c:' + word.toLowerCase();
    if (!BY_ID[id]) { const it = { id, type: 'word', cat: 'custom', t: word.toLowerCase(), he, pos: '', lvl: 'B1', emoji: '📌', ipa: '', ex: ex || '', exHe: '' }; S.custom[id] = it; add(it); }
    return id;
  };

  /* ---------- speech (device TTS — free & offline) ---------- */
  const Speech = {
    ok: 'speechSynthesis' in window,
    voices: [],
    init() {
      if (!this.ok) return;
      const load = () => { this.voices = speechSynthesis.getVoices(); };
      load();
      speechSynthesis.onvoiceschanged = load;
    },
    voice(lang) {
      const v = this.voices;
      const same = v.filter((x) => x.lang.replace('_', '-') === lang);
      return same.find((x) => /enhanced|premium|natural|samantha|daniel/i.test(x.name)) || same[0] || v.find((x) => x.lang.startsWith('en'));
    },
    speak(text, opts = {}) {
      if (!this.ok) { opts.onerror && opts.onerror(); return false; }
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = opts.lang || S.profile.accent;
      const v = this.voice(u.lang);
      if (v) u.voice = v;
      u.rate = (opts.rate || 1) * 0.92;
      u.onend = () => opts.onend && opts.onend();
      u.onerror = () => opts.onend && opts.onend();
      speechSynthesis.speak(u);
      return true;
    },
    stop() { if (this.ok) speechSynthesis.cancel(); }
  };
  Speech.init();
  ET.Speech = Speech;

  /* ---------- grammar checker for the local tutor ---------- */
  const IRREG = { go: 'went', eat: 'ate', see: 'saw', buy: 'bought', have: 'had', do: 'did', make: 'made', take: 'took', come: 'came', get: 'got',
    meet: 'met', write: 'wrote', drink: 'drank', give: 'gave', find: 'found', think: 'thought', say: 'said', tell: 'told', know: 'knew', leave: 'left',
    feel: 'felt', sleep: 'slept', swim: 'swam', run: 'ran', begin: 'began', fly: 'flew', drive: 'drove', speak: 'spoke', sit: 'sat', win: 'won',
    lose: 'lost', pay: 'paid', send: 'sent', spend: 'spent', teach: 'taught', bring: 'brought', catch: 'caught', wake: 'woke', break: 'broke',
    choose: 'chose', forget: 'forgot', hear: 'heard', sing: 'sang', wear: 'wore', fall: 'fell', grow: 'grew', understand: 'understood' };
  const REG = ['watch', 'play', 'visit', 'work', 'walk', 'cook', 'call', 'travel', 'study', 'live', 'like', 'love', 'want', 'need', 'start', 'finish',
    'clean', 'talk', 'listen', 'stay', 'open', 'help', 'ask', 'learn', 'try', 'move', 'arrive', 'order', 'enjoy', 'decide', 'dance', 'use', 'plan', 'stop'];
  const PAST2BASE = {};
  Object.entries(IRREG).forEach(([b, p]) => { PAST2BASE[p] = b; });
  const pastOf = (v) => IRREG[v] || (v.endsWith('e') ? v + 'd' : /[^aeiou]y$/.test(v) ? v.slice(0, -1) + 'ied' : /^(stop|plan)$/.test(v) ? v + v.slice(-1) + 'ed' : v + 'ed');
  REG.forEach((b) => { PAST2BASE[pastOf(b)] = b; });
  const third = (v) => (v === 'have' ? 'has' : v === 'do' ? 'does' : v === 'go' ? 'goes' : /(s|sh|ch|x|o)$/.test(v) ? v + 'es' : /[^aeiou]y$/.test(v) ? v.slice(0, -1) + 'ies' : v + 's');
  const BASES = [...Object.keys(IRREG), ...REG];
  const S_FORMS = {}; BASES.forEach((b) => { S_FORMS[third(b)] = b; });
  const afterAux = (str, offset) => /\b(did|do|does|will|would|can|could|should|must|to|didn't|don't|doesn't|won't|can't|let|make|help|where|what|when|why|how)\s*$/i.test(str.slice(0, offset));
  const keepCase = (orig, rep) => (orig[0] === orig[0].toUpperCase() && orig[0] !== orig[0].toLowerCase() ? rep[0].toUpperCase() + rep.slice(1) : rep);

  const RULES = [
    { sev: 3, why: 'כשמדברים על העבר (yesterday, last week, ago) משתמשים בפועל בזמן עבר.',
      test: (t) => /\b(yesterday|last (night|week|month|year|summer|winter|weekend|time|friday|saturday|sunday)|ago|in 20\d\d)\b/i.test(t),
      re: new RegExp(`\\b(I|you|we|they|he|she|it)\\s+(${[...BASES, ...Object.keys(S_FORMS)].join('|')})\\b`, 'gi'),
      fix: (m, s, v, off, str) => { if (afterAux(str, off)) return m; const lv = v.toLowerCase(); const b = S_FORMS[lv] && !IRREG[lv] && !REG.includes(lv) ? S_FORMS[lv] : (BASES.includes(lv) ? lv : S_FORMS[lv]); return b ? `${s} ${pastOf(b)}` : m; } },
    { sev: 3, why: 'כשמדברים על העבר, am/is הופך ל־was ו־are הופך ל־were.',
      test: (t) => /\b(yesterday|last (night|week|month|year)|ago)\b/i.test(t),
      re: /\b(I am|I'm|he is|she is|it is|we are|they are|you are)\b/gi,
      fix: (m, g, off, str) => { if (afterAux(str, off)) return m; const l = m.toLowerCase(); return keepCase(m, l.startsWith("i") ? 'I was' : /^(he|she|it)/.test(l) ? l.split(' ')[0] + ' was' : l.split(' ')[0] + ' were'); } },
    { sev: 3, why: 'אחרי did / didn\'t / does / don\'t הפועל חוזר לצורת הבסיס (בלי ed ובלי s).',
      re: new RegExp(`\\b(didn't|did not|doesn't|does not|don't|do not|did|does)\\s+(${[...Object.keys(PAST2BASE), ...Object.keys(S_FORMS).filter((f) => !BASES.includes(f))].join('|')})\\b`, 'gi'),
      fix: (m, aux, v) => `${aux} ${PAST2BASE[v.toLowerCase()] || S_FORMS[v.toLowerCase()] || v}` },
    { sev: 3, why: 'עם he / she / it משתמשים ב־doesn\'t ולא ב־don\'t.', re: /\b(he|she|it) (don't|do not)\b/gi, fix: (m, s, d) => `${s} ${d.toLowerCase() === 'do not' ? 'does not' : "doesn't"}` },
    { sev: 3, why: 'בהווה פשוט, עם he / she / it מוסיפים s לפועל.',
      test: (t) => !/\b(yesterday|last|ago|did|will|can|could|should|would|must|to|let|make|help)\s+(he|she|it)\b/i.test(t) && !/\b(yesterday|last (night|week|month|year)|ago)\b/i.test(t),
      re: /\b(he|she|it|my (?:mother|father|brother|sister|friend|boss|teacher|mom|dad))\s+(go|have|do|like|want|need|work|live|love|play|watch|eat|drink|know|think|make|take|study|try|speak)\b/gi,
      fix: (m, s, v, off, str) => (afterAux(str, off) ? m : `${s} ${third(v.toLowerCase())}`) },
    { sev: 3, why: 'agree הוא פועל, לכן אומרים "I agree" בלי am.', re: /\b(I am|I'm) agree\b/gi, fix: () => 'I agree' },
    { sev: 3, why: 'באנגלית לא "יש" לנו שנים: גיל אומרים עם am – "I am 25 years old".', re: /\bI have (\d+) years(?! of)( old)?/gi, fix: (m, n) => `I am ${n} years old` },
    { sev: 3, why: 'people היא מילה ברבים, לכן משתמשים ב־are / were.', re: /\bpeople (is|was)\b/gi, fix: (m, v) => `people ${v.toLowerCase() === 'is' ? 'are' : 'were'}` },
    { sev: 2, why: 'המילה כבר בצורת השוואה (better, bigger…), אין צורך ב־more.', re: /\bmore (better|worse|easier|bigger|smaller|faster|cheaper|happier|older|younger|nicer)\b/gi, fix: (m, a) => a },
    { sev: 2, why: 'באנגלית אומרים "I really like" ולא "I very like".', re: /\b(I|we|they|you) very (like|love|enjoy|want)\b/gi, fix: (m, s, v) => `${s} really ${v}` },
    { sev: 2, why: 'אור ומכשירים מדליקים ומכבים עם turn on / turn off, לא open / close.', re: /\b(open|close) the (light|lights|tv|air conditioner|ac)\b/gi, fix: (m, v, o) => `turn ${v.toLowerCase() === 'open' ? 'on' : 'off'} the ${o}` },
    { sev: 2, why: 'אחרי explain צריך to: "explain to me".', re: /\bexplain (me|him|her|us|them)\b/gi, fix: (m, o) => `explain to ${o}` },
    { sev: 2, why: 'למשך זמן משתמשים ב־for. since מגיע לפני נקודת זמן (since 2020).', re: /\bsince (\d+|two|three|four|five|ten) (years|months|weeks|days|hours)\b/gi, fix: (m, n, u) => `for ${n} ${u}` },
    { sev: 2, why: 'boring = משעמם (משהו אחר). bored = משועמם (מה שאתה מרגיש).', re: /\b(I am|I'm) boring\b/gi, fix: (m, s) => `${s} bored` },
    { sev: 2, why: 'עם דברים שאפשר לספור (people, years, friends) משתמשים ב־many.', re: /\bhow much (people|years|days|friends|times|books|hours|kids|children|countries)\b/gi, fix: (m, n) => `how many ${n}` },
    { sev: 2, why: 'לפני מילה שמתחילה בצליל תנועה משתמשים ב־an.', re: /\ba ((?!one|use|uni|euro|useful)[aeio][a-z]+)/gi, fix: (m, w) => `${keepCase(m, 'an')} ${w}` },
    { sev: 2, why: 'לפני מילה שמתחילה בעיצור משתמשים ב־a.', re: /\ban ((?!hour|honest|honor)[bcdfgjklmnpqrstvwxyz][a-z]+)/gi, fix: (m, w) => `${keepCase(m, 'a')} ${w}` },
    { sev: 2, why: 'המילה I (אני) נכתבת תמיד באות גדולה.', re: /(^|\s)i(?=[\s',.!?]|$)/g, fix: (m, s) => `${s}I` },
    { sev: 1, why: 'משפט באנגלית מתחיל באות גדולה.', re: /^([a-z])/, fix: (m, c) => c.toUpperCase(), teacherOnly: true },
    { sev: 1, why: 'כדאי לסיים משפט בסימן פיסוק (נקודה, סימן שאלה או קריאה).', re: /([A-Za-z0-9])$/, fix: (m, c) => c + '.', teacherOnly: true }
  ];
  ET.checkGrammar = (text, level) => {
    const minSev = level === 'minimal' ? 3 : level === 'teacher' ? 1 : 2;
    let out = text.trim();
    const whys = [];
    for (const r of RULES) {
      if (r.sev < minSev || (r.teacherOnly && level !== 'teacher')) continue;
      if (r.test && !r.test(out)) continue;
      r.re.lastIndex = 0;
      const next = out.replace(r.re, r.fix);
      if (next !== out) { whys.push(r.why); out = next; }
    }
    return whys.length ? { was: text.trim(), now: out, why: whys } : null;
  };

  /* ---------- AI providers ---------- */
  const REACTIONS = [['Great!', 'מעולה!'], ['I see.', 'אני מבין.'], ['Nice!', 'נחמד!'], ['Sounds good!', 'נשמע טוב!'], ['Awesome!', 'מגניב!'], ['Got it.', 'הבנתי.'], ['Interesting!', 'מעניין!']];
  const LocalTutor = {
    id: 'local', he: 'מורה מקומי', offline: true,
    opening(sc) {
      if (sc.id === 'free') { const q = D.FREE_QUESTIONS[Math.floor(Math.random() * D.FREE_QUESTIONS.length)]; return { text: `Hi! I'm your English buddy. ${q[0]}`, he: `היי! אני חבר האנגלית שלך. ${q[1]}` }; }
      return { text: sc.steps[0][0], he: sc.steps[0][1] };
    },
    async reply({ sc, history, text, recent }) {
      const botTurns = history.filter((m) => m.from === 'bot').length;
      let r = REACTIONS[Math.floor(Math.random() * REACTIONS.length)];
      if (/\b(thanks|thank you)\b/i.test(text)) r = ["You're welcome!", 'בשמחה!'];
      else if (/\?\s*$/.test(text)) r = ["That's a good question! What do you think?", 'שאלה טובה! מה אתה חושב?'];
      else if (/^(no|nope|not really)\b/i.test(text)) r = ['No problem.', 'אין בעיה.'];
      else if (/^(yes|yeah|sure|ok|okay|of course)\b/i.test(text)) r = ['Perfect!', 'מושלם!'];
      let next;
      if (sc.id !== 'free' && botTurns < sc.steps.length) next = sc.steps[botTurns];
      else if (sc.id !== 'free' && botTurns === sc.steps.length) next = ['That was great practice! Want to keep talking? Tell me about your day.', 'זה היה תרגול מעולה! רוצה להמשיך לדבר? ספר לי על היום שלך.'];
      else { const used = new Set(history.map((m) => m.text)); next = D.FREE_QUESTIONS.find((q) => !used.has(q[0]) && !history.some((m) => m.text.includes(q[0]))) || D.FREE_QUESTIONS[botTurns % D.FREE_QUESTIONS.length]; }
      const firstWord = (s) => s.toLowerCase().match(/[a-z']+/)[0];
      const dup = firstWord(next[0]) === firstWord(r[0]) || /^(great|perfect|nice|thanks|thank you|sure|good)\b/i.test(next[0]);
      let en = dup ? next[0] : `${r[0]} ${next[0]}`;
      let he = dup ? next[1] : `${r[1]} ${next[1]}`;
      if (recent.length && botTurns % 3 === 2) {
        const w = recent[Math.floor(Math.random() * recent.length)];
        en += ` (Try to use the word "${w.t}" in your answer!)`;
        he += ` (נסה להשתמש במילה "${w.t}" – ${w.he})`;
      }
      return { text: en, he };
    }
  };
  const GeminiProvider = {
    id: 'gemini', he: 'Google Gemini (חינמי עם מפתח אישי)', offline: false,
    async call(system, contents) {
      const p = S.profile;
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(p.geminiModel)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': p.geminiKey },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { responseMimeType: 'application/json', temperature: 0.8 } })
      });
      if (!res.ok) throw new Error('http ' + res.status);
      const data = await res.json();
      return JSON.parse(data.candidates[0].content.parts[0].text);
    },
    opening(sc) { return LocalTutor.opening(sc); },
    async reply({ sc, history, recent }) {
      const p = S.profile;
      const corr = p.correction === 'minimal' ? 'Only correct serious mistakes that block understanding.' : p.correction === 'teacher' ? 'Act as a strict English teacher: correct every grammar, vocabulary and style mistake.' : 'Correct important grammar and vocabulary mistakes and ignore tiny ones.';
      const system = `You are ${sc.role} talking with a Hebrew-speaking English learner (CEFR level ${p.cefr}). Situation: ${sc.id === 'free' ? 'free conversation on any topic' : sc.role}. Keep replies short (1-3 sentences), natural and at the learner's level, and usually end with a question. Naturally use some of these recently learned words when it fits: ${recent.map((w) => w.t).join(', ') || 'none'}. ${corr} Reply ONLY with JSON: {"reply": string in English, "replyHe": Hebrew translation of reply, "correction": null or {"original": the learner's last message, "corrected": corrected version, "explanationHe": short explanation in Hebrew}}.`;
      const contents = history.map((m) => ({ role: m.from === 'me' ? 'user' : 'model', parts: [{ text: m.text }] }));
      if (contents.length && contents[0].role === 'model') contents.unshift({ role: 'user', parts: [{ text: 'Hi! Please start.' }] });
      const j = await this.call(system, contents);
      const c = j.correction && j.correction.corrected && norm(j.correction.corrected) !== norm(j.correction.original || '') ? { was: j.correction.original, now: j.correction.corrected, why: [j.correction.explanationHe] } : null;
      return { text: j.reply, he: j.replyHe, fix: c };
    },
    async story(words, level) {
      const j = await this.call('You write short graded reading texts for Hebrew-speaking English learners. Reply ONLY with JSON: {"title": string, "titleHe": string, "text": string with 3-4 short paragraphs separated by \\n}.',
        [{ role: 'user', parts: [{ text: `Write a short, fun story (about 150 words, CEFR ${level}) that uses ALL of these words: ${words.join(', ')}.` }] }]);
      return j;
    }
  };
  ET.AI = {
    providers: { local: LocalTutor, gemini: GeminiProvider },
    current() { return S.profile.ai === 'gemini' && S.profile.geminiKey && navigator.onLine ? GeminiProvider : LocalTutor; },
    async reply(args) {
      const p = this.current();
      const localFix = ET.checkGrammar(args.text, S.profile.correction);
      if (p === GeminiProvider) {
        try { return await p.reply(args); } catch (e) { const r = await LocalTutor.reply(args); return { ...r, fix: localFix, fellBack: true }; }
      }
      const r = await LocalTutor.reply(args);
      return { ...r, fix: localFix };
    }
  };
})();
