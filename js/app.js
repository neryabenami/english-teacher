/* UI layer: hash router, screens, actions. Plain JS, no build step. */
(function () {
  'use strict';
  const ET = window.ET;
  const D = window.APP_DATA;
  const S = ET.S;
  const esc = ET.esc;
  const Speech = ET.Speech;
  const $ = (s, r = document) => r.querySelector(s);
  const view = $('#view');
  const tabbarEl = $('#tabbar');
  const sheetRoot = $('#sheet-root');
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  const RT = {
    online: navigator.onLine, sheet: null, lastSheet: null, session: null, quiz: null, game: null, test: null,
    onb: { step: 'welcome', level: null, goal: 'all', interests: [], dailyMin: 10 },
    reading: false, rate: 1, chatBusy: false, rec: null, dictQ: '', dictF: 'all', myTab: 'all', slangCat: '', storyLvl: 'all',
    lastInput: Date.now(), confirmReset: false, myStory: null, after: null, swReg: null
  };

  /* ---------- icons ---------- */
  const I = {
    home: '<path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/>',
    learn: '<rect x="3" y="7" width="14" height="14" rx="3"/><path d="M7 3h11a3 3 0 0 1 3 3v11"/>',
    book: '<path d="M12 6.5C10 5 7 4.5 3 4.5v14c4 0 7 .5 9 2 2-1.5 5-2 9-2v-14c-4 0-7 .5-9 2z"/><path d="M12 6.5V20"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    back: '<path d="M9 5l7 7-7 7"/>',
    chev: '<path d="M15 5l-7 7 7 7"/>',
    speaker: '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/>',
    star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/>',
    flag: '<path d="M5 21V4"/><path d="M5 4h12l-2.5 4L17 12H5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    flame: '<path d="M12 22c4 0 7-2.7 7-6.6 0-3.2-2-5.6-3.7-7.4-.4 1.8-1.4 3-2.8 3.5.4-3.3-1-6.6-4-8.5.2 3-1.6 5.2-3.2 7.2C3.9 11.9 5 14 5 15.4 5 19.3 8 22 12 22z"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>',
    send: '<path d="M4 12l16-8-6 16-3-6z"/><path d="M11 14l9-10"/>',
    play: '<path d="M7 4.5l12 7.5-12 7.5z"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    chart: '<path d="M4 20V11M10 20V5M16 20v-6M21 20H3"/>',
    game: '<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 10.5v4M5 12.5h4"/><circle cx="16" cy="11.5" r=".8"/><circle cx="18.5" cy="14" r=".8"/>',
    quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><path d="M12 17.5v.01"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    repeat: '<path d="M4 12a8 8 0 0 1 14-5.3L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-14 5.3L4 15"/><path d="M4 20v-5h5"/>',
    bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
    cloud: '<path d="M7 18a5 5 0 0 1-.6-10A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z"/>',
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21a2 2 0 0 0 4 0"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
    logo: '<path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4 19.5l1.3-4.4A7.5 7.5 0 1 1 20 11.5z"/><path d="M7.8 14l2.2-5.5 2.2 5.5M8.6 12.3h2.8"/><circle cx="15" cy="12.6" r="1.5"/><path d="M16.5 11v3"/>',
    del: '<path d="M21 5H9l-6 7 6 7h12z"/><path d="M17 9l-5 6M12 9l5 6"/>'
  };
  const ic = (n, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;
  const icFill = (n) => `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;

  /* ---------- helpers ---------- */
  const parse = () => { const h = location.hash.replace(/^#\/?/, ''); const [name, ...args] = h.split('/').map((x) => decodeURIComponent(x)); return { name: name || 'home', args }; };
  const go = (path) => { if (location.hash === '#/' + path) render(); else location.hash = '#/' + path; };
  let toastT;
  const toast = (msg) => { const el = $('#toast'); el.textContent = msg; el.hidden = false; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 2400); };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const bandHe = (cefr) => ET.BANDS[ET.bandOf(cefr)].he;
  const lvlBadge = (l) => `<span class="badge lvl">${l} · ${bandHe(l)}</span>`;
  const catOf = (id) => D.CATEGORIES.find((c) => c.id === id);
  const STATUS = { known: ['יודע', 'good'], hard: ['קשה', 'warn'], learning: ['בלמידה', 'bad'], new: ['חדש', ''], saved: ['שמור', 'sun'] };
  const statusBadge = (id) => { const [t, c] = STATUS[ET.status(id)] || STATUS.new; return `<span class="badge ${c}">${t}</span>`; };
  const FORMAL = { 1: 'לא רשמי', 2: 'יומיומי', 3: 'רשמי' };
  const FREQ = { 1: 'פחות נפוץ', 2: 'נפוץ', 3: 'נפוץ מאוד' };
  /* isolates English runs inside Hebrew text so they display in the right order */
  const bidi = (s) => esc(s).replace(/([A-Za-z0-9][A-Za-z0-9&#;' ,/’.-]*[A-Za-z0-9])/g, '<bdi dir="ltr">$1</bdi>');
  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const topbar = (title, back, extra = '') => `<header class="topbar">${back ? `<button class="icon-btn" data-act="go" data-arg="${back}" aria-label="חזרה">${ic('back')}</button>` : ''}<h1>${title}</h1>${RT.online ? '' : '<span class="offline-pill">לא מקוון</span>'}${extra}</header>`;
  const li = (icon, title, sub, path, end = '') => `<button class="li" data-act="go" data-arg="${path}"><span class="ico">${I[icon] ? ic(icon) : icon}</span><span class="main"><span class="t">${title}</span>${sub ? `<span class="s" style="display:block">${sub}</span>` : ''}</span><span class="end">${end}${ic('chev', 'chev')}</span></button>`;
  const itemRow = (it, extra = '') => `<button class="li" data-act="item" data-arg="${esc(it.id)}"><span class="ico">${it.emoji || '📌'}</span><span class="main"><span class="t en" style="display:block">${esc(it.t)}</span><span class="s" style="display:block">${esc(it.he)}</span></span><span class="end">${extra}${ET.rec(it.id) ? statusBadge(it.id) : ''}</span></button>`;
  const speakBtn = (text, id, label = '', cls = '') => `<button class="speak ${cls}" data-act="say" data-arg="${esc(text)}" ${id ? `data-id="${esc(id)}"` : ''} aria-label="השמעה">${ic('speaker')}${label ? ' ' + label : ''}</button>`;
  const pathDots = (id) => { const p = (ET.rec(id) || {}).p || 0; const n = ET.PATH.filter((_, i) => p & (1 << i)).length; return `<div class="stack" style="gap:6px"><div class="path" title="${ET.PATH.join(' → ')}">${ET.PATH.map((l, i) => `<i class="${p & (1 << i) ? 'on' : ''}" title="${l}"></i>`).join('')}</div><div class="small muted" style="text-align:center">מסלול המילה: ${n ? ET.PATH.filter((_, i) => p & (1 << i)).slice(-1)[0] : 'עוד לא התחלנו'} (${n}/7)</div></div>`; };

  /* ---------- theme ---------- */
  const applyTheme = () => {
    const t = S.profile.theme;
    if (t === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = getComputedStyle(document.body).backgroundColor || '#F2F5F3';
  };

  /* ---------- tab bar ---------- */
  const TABS = [['home', 'home', 'בית'], ['learn', 'learn', 'לימוד'], ['reading', 'book', 'קריאה'], ['ai', 'chat', 'AI'], ['profile', 'user', 'פרופיל']];
  const TAB_OF = { cat: 'learn', real: 'learn', dict: 'learn', mywords: 'learn', games: 'learn', story: 'reading', mystory: 'reading', chat: 'ai', stats: 'profile', storage: 'profile', reports: 'profile', placement: 'profile' };
  const renderTabbar = (name) => {
    const cur = TAB_OF[name] || name;
    tabbarEl.innerHTML = `<nav aria-label="ניווט ראשי">${TABS.map(([id, icon, label]) => `<button class="tab ${cur === id ? 'on' : ''}" data-act="go" data-arg="${id}" ${cur === id ? 'aria-current="page"' : ''}>${ic(icon)}<span>${label}</span></button>`).join('')}</nav>`;
  };

  /* ---------- render ---------- */
  const SCREENS = {};
  const preserve = () => {
    const vals = {};
    document.querySelectorAll('#view input[id], #view textarea[id], #sheet-root textarea[id], #sheet-root input[id]').forEach((el) => { if (el.type !== 'file') vals[el.id] = el.value; });
    const a = document.activeElement;
    return { vals, focus: a && a.id ? a.id : null };
  };
  const restore = (k) => {
    Object.entries(k.vals).forEach(([id, v]) => { const el = document.getElementById(id); if (el && !el.value && v) el.value = v; });
    if (k.focus) { const el = document.getElementById(k.focus); if (el) el.focus({ preventScroll: true }); }
  };
  function render() {
    applyTheme();
    if (!S.onboarded) { tabbarEl.hidden = true; view.innerHTML = renderOnboarding(); renderSheet(); return; }
    const r = parse();
    const keep = preserve();
    const fn = SCREENS[r.name] || SCREENS.home;
    view.innerHTML = fn(...r.args);
    restore(keep);
    tabbarEl.hidden = ['session', 'quiz', 'game', 'placement'].includes(r.name);
    renderTabbar(r.name);
    renderSheet();
    if (RT.after) { const f = RT.after; RT.after = null; f(); }
  }
  ET.render = render;

  /* =========================================================
     ONBOARDING
     ========================================================= */
  const ONB_STEPS = ['welcome', 'level', 'goal', 'interests', 'daily'];
  function renderOnboarding() {
    const o = RT.onb;
    if (o.step === 'test') return testScreen('onb');
    const idx = ONB_STEPS.indexOf(o.step);
    const steps = `<div class="steps">${ONB_STEPS.slice(1).map((_, i) => `<i class="${i < idx ? 'on' : ''}"></i>`).join('')}</div>`;
    const back = `<button class="icon-btn" data-act="onb-back" aria-label="חזרה">${ic('back')}</button>`;
    if (o.step === 'welcome') {
      return `<div class="onb"><div class="welcome grow">
        <div class="logo">${ic('logo')}</div>
        <h1>מדברים אנגלית</h1>
        <p class="muted" style="max-width:340px">לומדים אנגלית אמיתית בקצב שלכם. חינם לגמרי, וגם בלי אינטרנט.</p>
        <div class="bullets">
          <div><span>🃏</span><span>כרטיסיות חכמות שזוכרות מתי לחזור על כל מילה</span></div>
          <div><span>📖</span><span>סיפורים עם תרגום בלחיצה על כל מילה</span></div>
          <div><span>🔥</span><span>סלנג ואנגלית של היום־יום</span></div>
          <div><span>💬</span><span>שיחה באנגלית עם תיקונים והסברים בעברית</span></div>
        </div></div>
        <div class="foot"><button class="btn block" data-act="onb-next">בואו נתחיל</button><p class="small muted" style="text-align:center">בלי הרשמה. הכול נשמר במכשיר שלך.</p></div></div>`;
    }
    if (o.step === 'level') {
      const opts = [['beginner', '🌱', 'מתחילים', 'מכיר מילים ומשפטים בסיסיים'], ['intermediate', '🌿', 'בינוני', 'מסתדר בשיחה פשוטה'], ['advanced', '🌳', 'מתקדמים', 'מדבר בחופשיות, רוצה לשפר'], ['unknown', '🤔', 'אני לא יודע', 'נעשה מבחן רמה קצר של 10 שאלות']];
      return `<div class="onb">${steps}<div class="row">${back}</div><div class="grow"><h1>מה רמת האנגלית שלך?</h1>
        <div class="options">${opts.map(([id, e, t, s]) => `<button class="opt ${o.level === id ? 'on' : ''}" data-act="onb-level" data-arg="${id}"><span class="emo">${e}</span><span class="grow"><b style="display:block">${t}</b><span class="small muted">${s}</span></span></button>`).join('')}</div></div></div>`;
    }
    if (o.step === 'goal') {
      return `<div class="onb">${steps}<div class="row">${back}</div><div class="grow"><h1>מה המטרה העיקרית שלך?</h1><p class="muted">נתאים לך את התוכן. אפשר לשנות בכל רגע בפרופיל.</p>
        <div class="chips wrap">${D.GOALS.map((g) => `<button class="chip ${o.goal === g.id ? 'on' : ''}" data-act="onb-goal" data-arg="${g.id}">${g.he}</button>`).join('')}</div></div>
        <div class="foot"><button class="btn block" data-act="onb-next">המשך</button></div></div>`;
    }
    if (o.step === 'interests') {
      return `<div class="onb">${steps}<div class="row">${back}</div><div class="grow"><h1>מה מעניין אותך?</h1><p class="muted">אפשר לבחור כמה נושאים. המילים והסיפורים יתחילו מהם.</p>
        <div class="chips wrap">${D.INTERESTS.map((g) => `<button class="chip ${o.interests.includes(g.id) ? 'on' : ''}" data-act="onb-int" data-arg="${g.id}">${g.he}</button>`).join('')}</div></div>
        <div class="foot"><button class="btn block" data-act="onb-next">${o.interests.length ? 'המשך' : 'דלג'}</button></div></div>`;
    }
    const mins = [[5, 'קליל', '8 כרטיסיות ביום'], [10, 'רגיל', '12 כרטיסיות ביום'], [15, 'רציני', '15 כרטיסיות ביום'], [20, 'אינטנסיבי', '20 כרטיסיות ביום'], [30, 'מקסימום', '25 כרטיסיות ביום']];
    return `<div class="onb">${steps}<div class="row">${back}</div><div class="grow"><h1>כמה זמן ביום מתאים לך?</h1>
      <div class="options">${mins.map(([m, t, s]) => `<button class="opt ${o.dailyMin === m ? 'on' : ''}" data-act="onb-daily" data-arg="${m}"><span class="emo tnum" style="font-family:var(--font-display);font-weight:600;min-width:2.2em">${m}</span><span class="grow"><b style="display:block">${m} דקות · ${t}</b><span class="small muted">${s}</span></span></button>`).join('')}</div></div>
      <div class="foot"><button class="btn block" data-act="onb-finish">סיימנו, מתחילים!</button></div></div>`;
  }

  /* ---------- placement test (onboarding + profile) ---------- */
  function testScreen(mode) {
    const t = RT.test || (RT.test = { i: 0, right: 0, picked: null, mode });
    const total = D.PLACEMENT.length;
    if (t.i >= total) {
      const cefr = t.right <= 3 ? 'A1' : t.right <= 5 ? 'A2' : t.right <= 7 ? 'B1' : t.right <= 8 ? 'B2' : 'C1';
      t.result = cefr;
      return `<div class="${mode === 'onb' ? 'onb' : 'screen no-tabs'}"><div class="result grow"><div class="big-emoji">🎯</div><h1>הרמה שלך: ${bandHe(cefr)}</h1>
        <p class="muted">ענית נכון על ${t.right} מתוך ${total} שאלות. ברמת CEFR זה בערך <b>${cefr}</b>.</p></div>
        <button class="btn block" data-act="test-done">המשך</button></div>`;
    }
    const q = D.PLACEMENT[t.i];
    const isEn = !/[֐-׿]/.test(q.q);
    return `<div class="${mode === 'onb' ? 'onb' : 'screen no-tabs'}">
      <header class="progress-top"><button class="icon-btn" data-act="test-exit" aria-label="סגירה">${ic('x')}</button><div class="bar"><i style="width:${(t.i / total) * 100}%"></i></div><span class="small muted tnum">${t.i + 1}/${total}</span></header>
      <div class="q-card"><div class="q-type">מבחן רמה · שאלה ${t.i + 1}</div><div class="q-prompt ${isEn ? 'en' : ''}">${esc(q.q)}</div>
      <div class="options">${q.o.map((o, i) => `<button class="opt" data-act="test-answer" data-arg="${i}"><span class="${/[֐-׿]/.test(o) ? '' : 'en'}">${esc(o)}</span></button>`).join('')}</div></div>
      <p class="small muted" style="text-align:center">לא בטוחים? בחרו את מה שנראה לכם הכי נכון.</p></div>`;
  }
  SCREENS.placement = () => testScreen('profile');

  /* =========================================================
     HOME
     ========================================================= */
  const ring = (pct) => { const c = 2 * Math.PI * 38; return `<div class="ring" role="img" aria-label="${Math.round(pct * 100)}% מהיעד היומי"><svg viewBox="0 0 88 88"><circle cx="44" cy="44" r="38" stroke="currentColor" stroke-opacity=".25" stroke-width="8" fill="none"/><circle cx="44" cy="44" r="38" stroke="currentColor" stroke-width="8" fill="none" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(1)}"/></svg><div class="ring-txt"><b class="tnum">${Math.round(pct * 100)}%</b><span>מהיעד</span></div></div>`; };
  const topicEmoji = (t) => (catOf(t) || { icon: '📘' }).icon;
  const storyCard = (s) => { const read = S.stats.stories[s.id]; return `<button class="card story-card" data-act="go" data-arg="story/${s.id}"><div class="cover">${topicEmoji(s.topic)}</div><div style="min-width:0"><div class="title">${esc(s.title)}</div><div class="muted small">${esc(s.he)}</div><div class="row wrap" style="gap:6px;margin-top:6px">${lvlBadge(s.level)}<span class="badge">${s.minutes} דק׳ קריאה</span>${read ? '<span class="badge good">נקרא ✓</span>' : ''}</div></div></button>`; };
  const recommendedStory = () => {
    const max = Math.min(5, ET.lvlIdx(S.profile.cefr) + 1);
    const ok = D.STORIES.filter((s) => ET.lvlIdx(s.level) <= max);
    const cats = new Set(); S.profile.interests.forEach((i) => (D.INTERESTS.find((x) => x.id === i) || { cats: [] }).cats.forEach((c) => cats.add(c)));
    return ok.find((s) => !S.stats.stories[s.id] && cats.has(s.topic)) || ok.find((s) => !S.stats.stories[s.id]) || ok[ok.length - 1] || D.STORIES[0];
  };
  const stat = (n, label) => `<div class="stat"><b>${n}</b><span>${label}</span></div>`;

  SCREENS.home = () => {
    const t = ET.today();
    const mins = Math.floor(t.sec / 60);
    const goal = S.profile.dailyMin;
    const pct = Math.min(1, t.sec / (goal * 60));
    const due = ET.dueIds().length;
    const wod = ET.wordOfDay();
    const sod = ET.slangOfDay();
    const h = new Date().getHours();
    const greet = h < 5 ? 'לילה טוב' : h < 12 ? 'בוקר טוב' : h < 17 ? 'צהריים טובים' : h < 21 ? 'ערב טוב' : 'לילה טוב';
    const started = t.learned + t.reviewed > 0;
    const quick = (icon, num, label, path) => `<button data-act="go" data-arg="${path}"><span class="q-ico">${ic(icon)}</span>${num !== '' ? `<span class="q-num tnum">${num}</span>` : ''}<span>${label}</span></button>`;
    return `<div class="screen">
      <div class="hello"><div><p class="muted small">${greet} 👋</p><h1>${started ? 'ממשיכים מאיפה שעצרת' : 'מוכנים ללמוד היום?'}</h1></div>
        <div class="streak" aria-label="${ET.streak()} ימים ברצף">${icFill('flame')}<span class="tnum">${ET.streak()}</span></div></div>
      ${RT.online ? '' : '<div class="note">אין חיבור לאינטרנט. הלימוד ממשיך לעבוד כרגיל וההתקדמות נשמרת במכשיר.</div>'}
      <section class="hero"><div><h2>הלימוד של היום</h2><p>${due ? `${due} מילים מחכות לחזרה · ` : ''}${mins} מתוך ${goal} דקות</p>
        <button class="btn" data-act="go" data-arg="session/daily">${ic('play')} ${started ? 'המשך ללמוד' : 'התחל ללמוד'}</button></div>${ring(pct)}</section>
      <div class="quick">${quick('repeat', due, 'לחזרה', 'session/review')}${quick('bookmark', ET.myList('saved').length, 'שמורות', 'mywords')}${quick('search', '', 'מילון', 'dict')}${quick('quiz', '', 'מבחן', 'quiz/mixed')}</div>
      <section class="section"><div class="section-head"><h2>של היום</h2></div><div class="daily">
        <button class="card daily-card" data-act="item" data-arg="${esc(wod.id)}"><div class="art">${wod.emoji}</div><div style="min-width:0"><div class="eyebrow">Word of the Day</div><div class="word">${esc(wod.t)}</div><div class="muted small">${esc(wod.he)}</div></div><span class="speak sm" data-act="say" data-arg="${esc(wod.t)}" data-id="${esc(wod.id)}" role="button" aria-label="השמעה">${ic('speaker')}</span></button>
        <button class="card daily-card" data-act="item" data-arg="${esc(sod.id)}"><div class="art">${sod.emoji}</div><div style="min-width:0"><div class="eyebrow">Slang of the Day</div><div class="word">${esc(sod.t)}</div><div class="muted small">${esc(sod.he)}</div></div><span class="speak sm" data-act="say" data-arg="${esc(sod.t)}" data-id="${esc(sod.id)}" role="button" aria-label="השמעה">${ic('speaker')}</span></button>
      </div></section>
      <section class="section"><div class="section-head"><h2>סיפור מומלץ</h2><button class="link" data-act="go" data-arg="reading">לכל הסיפורים</button></div>${storyCard(recommendedStory())}</section>
      <button class="card daily-card" data-act="go" data-arg="chat/free"><div class="art" style="background:var(--accent-soft);color:var(--accent)">${ic('chat')}</div><div style="min-width:0"><div class="eyebrow">AI</div><div style="font-weight:600">דבר עם AI</div><div class="muted small">שיחה באנגלית עם תיקונים והסברים בעברית</div></div>${ic('chev', 'chev')}</button>
      <section class="section"><div class="section-head"><h2>ההתקדמות שלי</h2><button class="link" data-act="go" data-arg="stats">כל הסטטיסטיקות</button></div>
        <div class="grid3">${stat(ET.myList('all').length, 'מילים שנלמדו')}${stat(ET.myList('known').length, 'מילים שאני יודע')}${stat(ET.totalMinutes(), 'דקות לימוד')}</div></section>
    </div>`;
  };

  /* =========================================================
     LEARN
     ========================================================= */
  const KIND_SUB = { slang: 'אמריקאי, בריטי, רשתות ודייטים', spoken: 'gonna, wanna, lemme…', phrasal: 'give up, figure out…', idiom: 'piece of cake…', texting: 'LOL, BTW, IDK…', expr: 'No worries, Fair enough…' };
  SCREENS.learn = () => `<div class="screen">${topbar('לימוד')}
    <button class="search" data-act="go" data-arg="dict" style="display:block;width:100%;text-align:start">${ic('search')}<span class="input" style="display:flex;align-items:center;color:var(--muted)">חיפוש מילה, ביטוי או סלנג…</span></button>
    <button class="card daily-card" data-act="go" data-arg="session/daily"><div class="art" style="background:var(--accent);color:var(--accent-ink)">${ic('play')}</div><div style="min-width:0"><div style="font-weight:600">המסלול היומי שלי</div><div class="muted small">${ET.sessionSize()} כרטיסיות לפי הרמה ותחומי העניין שלך</div></div>${ic('chev', 'chev')}</button>
    <section class="section"><div class="section-head"><h2>Real English</h2><span class="muted small">איך באמת מדברים</span></div>
      <div class="tiles">${['slang', 'spoken', 'phrasal', 'idiom', 'texting', 'expr'].map((k) => `<button class="tile" data-act="go" data-arg="real/${k}"><span class="emo">${ET.KINDS[k].icon}</span><span class="name">${ET.KINDS[k].he}</span><span class="sub">${esc(KIND_SUB[k])}</span><span class="sub">${ET.exprsOf(k).length} ביטויים</span></button>`).join('')}</div></section>
    <section class="section"><div class="section-head"><h2>לימוד לפי נושאים</h2></div>
      <div class="cats">${D.CATEGORIES.map((c) => { const p = ET.catProgress(c.id); return `<button class="cat" data-act="go" data-arg="cat/${c.id}"><span class="emo">${c.icon}</span><span class="name">${c.he}</span><div class="bar"><i style="width:${(p.known / p.total) * 100}%"></i></div><span class="small muted tnum">${p.known}/${p.total} מילים</span></button>`; }).join('')}</div></section>
    <section class="section"><div class="section-head"><h2>תרגול</h2></div><div class="list">
      ${li('quiz', 'מבחן מעורב', 'בחירה, השלמה, שמיעה, כתיבה ותמונות', 'quiz/mixed')}
      ${li('game', 'משחקים', 'התאמת זוגות, ניחוש מילה, מהירות ושמיעה', 'games')}
      ${li('bookmark', 'המילים שלי', `${ET.myList('all').length} מילים`, 'mywords')}
      ${li('search', 'מילון', 'חיפוש באנגלית ובעברית', 'dict')}
    </div></section></div>`;

  SCREENS.cat = (id) => {
    const c = catOf(id);
    if (!c) return SCREENS.learn();
    const ws = ET.wordsOf(id);
    const p = ET.catProgress(id);
    return `<div class="screen">${topbar(c.he, 'learn')}
      <div class="card stack"><div class="row"><span style="font-size:2.4rem">${c.icon}</span><div class="grow"><h2>${c.he}</h2><div class="small muted tnum">${p.known} מתוך ${p.total} מילים ידועות</div></div><span class="badge good">${ic('check').replace('<svg', '<svg width="14" height="14"')} זמין Offline</span></div>
        <div class="bar"><i style="width:${(p.known / p.total) * 100}%"></i></div>
        <button class="btn block" data-act="go" data-arg="session/cat/${id}">${ic('play')} למד את הנושא</button></div>
      <div class="list">${ws.map((w) => itemRow(w)).join('')}</div></div>`;
  };

  SCREENS.real = (kind) => {
    const k = ET.KINDS[kind] ? kind : 'slang';
    const cat = k === 'slang' ? RT.slangCat : '';
    const list = ET.exprsOf(k, cat || undefined);
    const chips = k === 'slang' ? `<div class="chips"><button class="chip ${!cat ? 'on' : ''}" data-act="slang-cat" data-arg="">הכול</button>${ET.SLANG_CATS.map((c) => `<button class="chip ${cat === c.id ? 'on' : ''}" data-act="slang-cat" data-arg="${c.id}">${c.he}</button>`).join('')}</div>` : '';
    return `<div class="screen">${topbar(ET.KINDS[k].he, 'learn')}
      ${k === 'slang' ? '<p class="muted">English Slang: איך מדברים באמת, עם הקשר, רמת רשמיות ואזור שימוש.</p>' : ''}
      ${chips}
      <button class="btn block" data-act="go" data-arg="session/real/${k}${cat ? '.' + cat : ''}">${ic('play')} תרגל בכרטיסיות (${Math.min(15, list.length)})</button>
      <div class="list">${list.map((it) => itemRow(it, it.region && it.region !== 'כללי' ? `<span class="badge">${esc(it.region)}</span>` : '')).join('') || '<div class="empty">אין ביטויים בקטגוריה הזאת</div>'}</div></div>`;
  };

  /* ---------- flashcards ---------- */
  const exprDetails = (it) => `<dl class="kv">
      <dt>משמעות בפועל</dt><dd>${esc(it.real)}</dd>
      ${it.lit ? `<dt>מילולית</dt><dd>${esc(it.lit)}</dd>` : ''}
      ${it.ctx ? `<dt>הקשר שימוש</dt><dd>${esc(it.ctx)}</dd>` : ''}
      <dt>רשמיות</dt><dd>${FORMAL[it.formal] || ''}</dd>
      <dt>אזור</dt><dd>${esc(it.region)}</dd>
      <dt>נפוצות</dt><dd>${FREQ[it.freq] || ''}</dd></dl>`;
  const exampleBox = (it) => (it.ex ? `<div class="example"><div class="row"><div class="en-line grow">${esc(it.ex)}</div>${speakBtn(it.ex, it.id, '', 'sm')}</div>${it.exHe ? `<div class="small muted">${esc(it.exHe)}</div>` : ''}</div>` : '');
  const flashcard = (it, rev) => {
    const r = ET.rec(it.id) || {};
    return `<article class="flash" ${rev ? '' : 'data-act="reveal"'}>
      <div class="top"><div class="row wrap" style="gap:6px">${lvlBadge(it.lvl)}${it.type === 'expr' ? `<span class="badge sun">${ET.KINDS[it.kind].he}</span>` : it.pos ? `<span class="badge">${ET.POS[it.pos] || ''}</span>` : ''}</div>
        <button class="icon-btn flat ${r.saved ? 'active' : ''}" data-act="save" data-arg="${esc(it.id)}" aria-label="${r.saved ? 'הסרה מהשמורים' : 'שמירה למילים שלי'}">${r.saved ? icFill('star') : ic('star')}</button></div>
      <div class="emoji" aria-hidden="true">${it.emoji || ''}</div>
      <div class="term">${esc(it.t)}</div>
      ${it.ipa ? `<div class="ipa">${esc(it.ipa)}</div>` : ''}
      <div class="speak-row">${speakBtn(it.t, it.id, 'השמע')}<button class="speak" data-act="say-slow" data-arg="${esc(it.t)}" data-id="${esc(it.id)}">🐢 לאט</button></div>
      ${rev ? `<div class="reveal"><div class="translation">${esc(it.he)}</div>${it.type === 'expr' ? exprDetails(it) : ''}${exampleBox(it)}${pathDots(it.id)}
        <button class="link small" data-act="report" data-arg="${esc(it.id)}" style="justify-self:center">${'דיווח על טעות'}</button></div>` : '<p class="small muted" style="text-align:center;margin-top:auto">נסו להיזכר בתרגום, ואז לחצו על הכרטיס</p>'}
    </article>`;
  };
  SCREENS.session = (kind, arg = '') => {
    const key = kind + '/' + arg;
    if (!RT.session || RT.session.key !== key) RT.session = { key, kind, arg, ids: ET.buildSession(kind, arg), i: 0, revealed: false, res: { 5: 0, 3: 0, 1: 0 } };
    const s = RT.session;
    const close = `<button class="icon-btn" data-act="exit-session" aria-label="סגירה">${ic('x')}</button>`;
    if (!s.ids.length) {
      return `<div class="screen no-tabs"><header class="topbar">${close}<h1>${kind === 'review' ? 'חזרה' : 'כרטיסיות'}</h1></header><div class="empty card"><div class="emo">${kind === 'review' ? '🎉' : '📭'}</div><h2>${kind === 'review' ? 'אין מילים לחזרה כרגע' : 'אין כאן כרטיסיות כרגע'}</h2><p>${kind === 'review' ? 'כל הכבוד! המערכת תזכיר לך כשיגיע הזמן לחזור על מילים.' : 'נסו נושא אחר או את המסלול היומי.'}</p><button class="btn" data-act="go" data-arg="session/daily">למסלול היומי</button></div></div>`;
    }
    if (s.i >= s.ids.length) {
      return `<div class="screen no-tabs"><header class="topbar">${close}<h1>סיימת סבב</h1></header>
        <div class="card result"><div class="big-emoji">🎉</div><h1>כל הכבוד!</h1><p class="muted">עברת על ${s.ids.length} כרטיסיות. המערכת תחזיר אליך כל מילה בדיוק בזמן הנכון.</p>
          <div class="grid3" style="width:100%">${stat(s.res[5], 'ידעתי')}${stat(s.res[3], 'קשה לי')}${stat(s.res[1], 'לא ידעתי')}</div></div>
        <button class="btn block" data-act="restart-session">עוד סבב</button><button class="btn ghost block" data-act="exit-session">סיום</button></div>`;
    }
    const it = ET.item(s.ids[s.i]);
    if (!it) { s.i++; return SCREENS.session(kind, arg); }
    if (!ET.rec(it.id) || !(ET.rec(it.id).p & 1)) ET.mark(it.id, 'exposed');
    return `<div class="screen no-tabs">
      <header class="topbar">${close}<div class="progress-top grow"><div class="bar"><i style="width:${(s.i / s.ids.length) * 100}%"></i></div><span class="small muted tnum">${s.i + 1}/${s.ids.length}</span></div></header>
      ${flashcard(it, s.revealed)}
      ${s.revealed ? '' : '<button class="btn soft block" data-act="reveal">הצג תרגום</button>'}
      <div class="grade">
        <button class="g-bad" data-act="grade" data-arg="1">לא ידעתי<small>${ET.preview(it.id, 1)}</small></button>
        <button class="g-hard" data-act="grade" data-arg="3">קשה לי<small>${ET.preview(it.id, 3)}</small></button>
        <button class="g-good" data-act="grade" data-arg="5">ידעתי<small>${ET.preview(it.id, 5)}</small></button>
      </div></div>`;
  };
  const sessionExitPath = () => { const s = RT.session; if (!s) return 'home'; return s.kind === 'cat' ? 'cat/' + s.arg : s.kind === 'real' ? 'real/' + s.arg.split('.')[0] : s.kind === 'list' ? 'mywords' : 'home'; };

  /* ---------- my words ---------- */
  const MY_TABS = [['all', 'הכול'], ['new', 'חדשות'], ['hard', 'קשות'], ['known', 'אני יודע'], ['saved', 'שמורות'], ['due', 'לחזרה']];
  SCREENS.mywords = () => {
    const ids = ET.myList(RT.myTab);
    const list = ids.map(ET.item).filter(Boolean).sort((a, b) => ((ET.rec(b.id) || {}).last || 0) - ((ET.rec(a.id) || {}).last || 0));
    return `<div class="screen">${topbar('המילים שלי', 'learn')}
      <div class="chips">${MY_TABS.map(([id, he]) => `<button class="chip ${RT.myTab === id ? 'on' : ''}" data-act="my-tab" data-arg="${id}">${he} <span class="tnum" style="opacity:.7">${ET.myList(id).length}</span></button>`).join('')}</div>
      ${list.length ? `<button class="btn block" data-act="go" data-arg="session/list/${RT.myTab}">${ic('play')} תרגל את הרשימה</button><div class="list">${list.map((it) => itemRow(it)).join('')}</div>`
        : `<div class="card empty"><div class="emo">🗂️</div><h2>הרשימה ריקה</h2><p>מילים יופיעו כאן כשתלמדו כרטיסיות, תשמרו מילים מהסיפורים או מהמילון.</p><button class="btn" data-act="go" data-arg="session/daily">להתחיל ללמוד</button></div>`}</div>`;
  };

  /* ---------- dictionary ---------- */
  const DICT_F = [['all', 'הכול'], ['word', 'מילים'], ['slang', 'סלנג'], ['phrasal', 'Phrasal Verbs'], ['idiom', 'Idioms'], ['spoken', 'Spoken'], ['expr', 'ביטויים']];
  const dictResults = () => {
    const q = RT.dictQ.trim();
    if (!q) {
      const all = ET.ITEMS.filter((i) => RT.dictF === 'all' || (RT.dictF === 'word' ? i.type === 'word' : i.kind === RT.dictF)).slice().sort((a, b) => a.t.localeCompare(b.t));
      return `<p class="small muted">כל הערכים במילון המקומי (${all.length}). אפשר לחפש גם בעברית.</p><div class="list">${all.slice(0, 80).map((it) => itemRow(it)).join('')}</div>`;
    }
    const res = ET.search(q, RT.dictF);
    if (!res.length) return `<div class="card empty"><div class="emo">🔎</div><p>לא מצאנו את "${esc(q)}" במילון המקומי.</p>${/^[a-z' -]+$/i.test(q) ? `<button class="btn soft small" data-act="say" data-arg="${esc(q)}">${ic('speaker')} להשמיע בכל זאת</button>` : ''}</div>`;
    return `<div class="list">${res.map((it) => (it.type === 'lex' ? `<button class="li" data-act="lex" data-arg="${esc(it.t)}"><span class="ico">📗</span><span class="main"><span class="t en" style="display:block">${esc(it.t)}</span><span class="s" style="display:block">${esc(it.he)}</span></span><span class="end"><span class="badge">מילון כללי</span></span></button>` : itemRow(it, it.type === 'expr' ? `<span class="badge sun">${ET.KINDS[it.kind].he}</span>` : ''))).join('')}</div>`;
  };
  SCREENS.dict = () => `<div class="screen">${topbar('מילון', 'learn')}
    <div class="search">${ic('search')}<input class="input" id="dict-q" type="search" placeholder="חפשו באנגלית או בעברית" value="${esc(RT.dictQ)}" data-input="dict" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="חיפוש במילון"></div>
    <div class="chips">${DICT_F.map(([id, he]) => `<button class="chip ${RT.dictF === id ? 'on' : ''}" data-act="dict-filter" data-arg="${id}">${he}</button>`).join('')}</div>
    <div id="dict-res">${dictResults()}</div></div>`;

  /* =========================================================
     QUIZ
     ========================================================= */
  const distractors = (it, k) => {
    const pool = ET.ITEMS.filter((x) => x.id !== it.id && x.type === it.type && x.he !== it.he && x.t.toLowerCase() !== it.t.toLowerCase() && !x.id.startsWith('c:'));
    const same = ET.shuffle(pool.filter((x) => x.cat === it.cat));
    const other = ET.shuffle(pool.filter((x) => x.cat !== it.cat));
    const out = [];
    for (const x of [...same, ...other]) { if (out.length >= k) break; if (!out.some((o) => o.he === x.he || o.t === x.t)) out.push(x); }
    return out;
  };
  const blankOf = (it) => { if (!it.ex) return null; const re = new RegExp(`\\b${escRe(it.t)}\\b`, 'i'); return re.test(it.ex) ? it.ex.replace(re, '_____') : null; };
  const quizPool = (n) => {
    let pool = ET.myList('all').map(ET.item).filter((i) => i && !i.id.startsWith('c:'));
    if (pool.length < n) {
      const max = Math.min(5, ET.lvlIdx(S.profile.cefr) + 1);
      const extra = ET.ITEMS.filter((i) => !i.id.startsWith('c:') && ET.lvlIdx(i.lvl) <= max && !pool.includes(i));
      pool = pool.concat(ET.sample(extra, n - pool.length));
    }
    return ET.sample(pool, n);
  };
  const makeQ = (it, mode) => {
    const types = mode === 'listen' ? ['listen'] : it.type === 'expr' ? ['mc_en', 'mc_he', 'context', 'listen'] : ['mc_en', 'mc_he', 'fill', 'listen', 'write', 'picture'];
    let type = types[Math.floor(Math.random() * types.length)];
    if (type === 'fill' && !blankOf(it)) type = 'mc_en';
    if (type === 'write' && it.t.length > 14) type = 'mc_he';
    if (type === 'context' && !it.ex) type = 'mc_en';
    const opts = ET.shuffle([it, ...distractors(it, 3)]);
    const heAns = type === 'mc_en' || type === 'context';
    return { type, id: it.id, options: type === 'write' ? null : opts.map((x) => (heAns ? x.he : x.t)), answer: heAns ? it.he : it.t, picked: null, ok: null };
  };
  const Q_LABEL = { mc_en: 'מה התרגום?', mc_he: 'איך אומרים באנגלית?', fill: 'השלימו את המשפט', listen: 'הקשיבו ובחרו את מה ששמעתם', write: 'כתבו באנגלית', picture: 'מה רואים בתמונה?', context: 'מה המשמעות בהקשר הזה?' };
  SCREENS.quiz = (mode = 'mixed') => {
    if (!RT.quiz || RT.quiz.mode !== mode || RT.quiz.restart) RT.quiz = { mode, qs: quizPool(10).map((it) => makeQ(it, mode)), i: 0, right: 0, done: false };
    const z = RT.quiz;
    const close = `<button class="icon-btn" data-act="quiz-exit" aria-label="סגירה">${ic('x')}</button>`;
    if (z.i >= z.qs.length) {
      if (!z.done) { z.done = true; S.stats.quizzes++; S.stats.qRight += z.right; S.stats.qTotal += z.qs.length; if (mode === 'listen') S.stats.games++; ET.activity(); }
      const pct = Math.round((z.right / z.qs.length) * 100);
      return `<div class="screen no-tabs"><header class="topbar">${close}<h1>תוצאות</h1></header>
        <div class="card result"><div class="score tnum">${pct}%</div><h2>${pct >= 80 ? 'מצוין! 🏆' : pct >= 50 ? 'יפה מאוד! 💪' : 'ממשיכים להתאמן 🌱'}</h2><p class="muted">ענית נכון על ${z.right} מתוך ${z.qs.length} שאלות. מילים שטעית בהן נוספו לחזרה.</p></div>
        <button class="btn block" data-act="quiz-again">מבחן נוסף</button><button class="btn ghost block" data-act="quiz-exit">סיום</button></div>`;
    }
    const q = z.qs[z.i];
    const it = ET.item(q.id);
    let prompt = '';
    if (q.type === 'mc_en') prompt = `<div class="row" style="justify-content:space-between"><div class="q-prompt en">${esc(it.t)}</div>${speakBtn(it.t, it.id)}</div>`;
    else if (q.type === 'mc_he') prompt = `<div class="q-prompt">${esc(it.he)}</div>`;
    else if (q.type === 'fill') prompt = `<div class="q-prompt en" style="font-size:1.15rem">${esc(blankOf(it))}</div><div class="small muted">${esc(it.exHe)}</div>`;
    else if (q.type === 'listen') prompt = `<div style="display:grid;place-items:center"><button class="btn" data-act="say" data-arg="${esc(it.t)}" data-id="${esc(it.id)}">${ic('speaker')} השמע שוב</button></div>`;
    else if (q.type === 'write') prompt = `<div class="row"><span style="font-size:2.2rem">${it.emoji || ''}</span><div class="q-prompt">${esc(it.he)}</div></div>`;
    else if (q.type === 'picture') prompt = `<div class="big-emoji">${it.emoji}</div>`;
    else if (q.type === 'context') prompt = `<div class="example"><div class="en-line">${esc(it.ex).replace(new RegExp(escRe(esc(it.t)), 'i'), (m) => `<mark style="background:var(--sun-soft);color:inherit;border-radius:4px;padding:0 3px">${m}</mark>`)}</div></div><div class="q-prompt en" style="font-size:1.1rem">${esc(it.t)}</div>`;
    const answered = q.picked !== null;
    const isHeOpt = q.type === 'mc_en' || q.type === 'context';
    const options = q.options ? `<div class="${isHeOpt ? 'options' : 'opts-grid'}">${q.options.map((o) => {
      const cls = answered ? (o === q.answer ? 'right' : o === q.picked ? 'wrong' : '') : '';
      return `<button class="opt ${cls}" data-act="answer" data-arg="${esc(o)}" ${answered ? 'disabled' : ''}><span class="${isHeOpt ? '' : 'en'}">${esc(o)}</span></button>`;
    }).join('')}</div>`
      : `<form data-form="write" class="stack"><input class="input" id="write-in" dir="ltr" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type in English" ${answered ? 'disabled' : ''} aria-label="תשובה באנגלית"><button class="btn block" ${answered ? 'disabled' : ''}>בדיקה</button></form>`;
    const fb = answered ? `<div class="feedback ${q.ok ? 'ok' : 'no'}">${q.ok ? 'נכון! ✓' : `לא בדיוק. התשובה הנכונה: <span class="en">${esc(q.answer)}</span>`}${q.type !== 'mc_en' && q.type !== 'context' ? ` · ${esc(it.he)}` : ''}</div><button class="btn block" data-act="next-q">${z.i + 1 < z.qs.length ? 'לשאלה הבאה' : 'לתוצאות'}</button>` : '';
    if (q.type === 'listen' && !answered && !q.played) { q.played = true; RT.after = () => Speech.speak(it.t); }
    return `<div class="screen no-tabs">
      <header class="topbar">${close}<div class="progress-top grow"><div class="bar"><i style="width:${(z.i / z.qs.length) * 100}%"></i></div><span class="small muted tnum">${z.i + 1}/${z.qs.length}</span></div></header>
      <div class="q-card"><div class="q-type">${Q_LABEL[q.type]}</div>${prompt}${options}</div>${fb}</div>`;
  };
  const answerQ = (val) => {
    const z = RT.quiz; const q = z.qs[z.i]; if (!q || q.picked !== null) return;
    q.picked = val;
    q.ok = ET.norm(val).replace(/^to /, '') === ET.norm(q.answer).replace(/^to /, '');
    if (q.ok) { z.right++; if (ET.rec(q.id)) ET.mark(q.id, 'understood'); } else ET.grade(q.id, 1);
    ET.activity();
    render();
  };

  /* =========================================================
     GAMES
     ========================================================= */
  SCREENS.games = () => `<div class="screen">${topbar('משחקים', 'learn')}
    <div class="tiles">
      <button class="tile" data-act="go" data-arg="game/match"><span class="emo">🧩</span><span class="name">התאמת זוגות</span><span class="sub">Word Match: חברו מילה לתרגום</span></button>
      <button class="tile" data-act="go" data-arg="game/guess"><span class="emo">🔤</span><span class="name">Guess the Word</span><span class="sub">בנו את המילה מהאותיות</span></button>
      <button class="tile" data-act="go" data-arg="game/speed"><span class="emo">⚡</span><span class="name">Speed Challenge</span><span class="sub">כמה תספיקו ב־60 שניות?${S.stats.bestSpeed ? ` שיא: ${S.stats.bestSpeed}` : ''}</span></button>
      <button class="tile" data-act="go" data-arg="quiz/listen"><span class="emo">🎧</span><span class="name">Listening Challenge</span><span class="sub">שומעים ומזהים</span></button>
    </div></div>`;
  const newGame = (id) => {
    if (id === 'match') { const items = quizPool(6).filter((i) => i.he.length < 28); return { id, items, he: ET.shuffle(items.map((i) => i.id)), en: ET.shuffle(items.map((i) => i.id)), selHe: null, selEn: null, done: [], errors: 0, err: null, t0: Date.now() }; }
    if (id === 'guess') {
      const pool = ET.ITEMS.filter((i) => i.type === 'word' && /^[a-z]{3,9}$/.test(i.t) && ET.lvlIdx(i.lvl) <= Math.min(5, ET.lvlIdx(S.profile.cefr) + 1));
      const items = ET.sample(pool, 8);
      return { id, items, i: 0, score: 0, picked: [], letters: ET.shuffle(items[0].t.split('')), wrong: false };
    }
    if (id === 'speed') return { id, end: 0, score: 0, q: null, started: false, over: false };
    return null;
  };
  SCREENS.game = (id) => {
    if (!RT.game || RT.game.id !== id) RT.game = newGame(id);
    const g = RT.game;
    if (!g) return SCREENS.games();
    const close = `<button class="icon-btn" data-act="game-exit" aria-label="סגירה">${ic('x')}</button>`;
    const again = `<button class="btn block" data-act="game-again">שחקו שוב</button><button class="btn ghost block" data-act="game-exit">חזרה למשחקים</button>`;
    if (id === 'match') {
      if (g.done.length === g.items.length) {
        if (!g.fin) { g.fin = Math.round((Date.now() - g.t0) / 1000); S.stats.games++; ET.activity(); }
        return `<div class="screen no-tabs"><header class="topbar">${close}<h1>התאמת זוגות</h1></header><div class="card result"><div class="big-emoji">🧩</div><h2>כל הזוגות הותאמו!</h2><p class="muted tnum">זמן: ${g.fin} שניות · טעויות: ${g.errors}</p></div>${again}</div>`;
      }
      const tile = (side, idd) => { const it = ET.item(idd); const done = g.done.includes(idd); const sel = (side === 'he' ? g.selHe : g.selEn) === idd; const err = g.err && g.err[side] === idd; return `<button class="mt ${done ? 'done' : ''} ${sel ? 'sel' : ''} ${err ? 'err' : ''} ${side === 'en' ? 'en' : ''}" data-act="m-pick" data-arg="${side}|${esc(idd)}">${esc(side === 'he' ? it.he : it.t)}</button>`; };
      return `<div class="screen no-tabs"><header class="topbar">${close}<h1>התאמת זוגות</h1><span class="badge tnum">${g.done.length}/${g.items.length}</span></header>
        <p class="muted">בחרו מילה בעברית ואת התרגום שלה באנגלית.</p>
        <div class="match"><div class="col">${g.he.map((x) => tile('he', x)).join('')}</div><div class="col">${g.en.map((x) => tile('en', x)).join('')}</div></div></div>`;
    }
    if (id === 'guess') {
      if (g.i >= g.items.length) {
        if (!g.fin) { g.fin = true; S.stats.games++; ET.activity(); }
        return `<div class="screen no-tabs"><header class="topbar">${close}<h1>Guess the Word</h1></header><div class="card result"><div class="score tnum">${g.score}/${g.items.length}</div><h2>${g.score >= 6 ? 'אלופים! 🏆' : 'יפה! ממשיכים 💪'}</h2></div>${again}</div>`;
      }
      const it = g.items[g.i];
      const typed = g.picked.map((k) => g.letters[k]);
      return `<div class="screen no-tabs"><header class="topbar">${close}<h1>Guess the Word</h1><span class="badge tnum">${g.i + 1}/${g.items.length}</span></header>
        <div class="q-card"><div class="big-emoji">${it.emoji}</div><div class="q-prompt" style="text-align:center">${esc(it.he)}</div>
          <div class="answer-slots" aria-label="התשובה שלך">${it.t.split('').map((_, i) => `<span class="slot">${esc(typed[i] || '')}</span>`).join('')}</div>
          ${g.wrong ? '<div class="feedback no" style="text-align:center">לא נכון, נסו שוב</div>' : ''}
          <div class="letters">${g.letters.map((l, i) => `<button class="letter ${g.picked.includes(i) ? 'used' : ''}" data-act="g-letter" data-arg="${i}">${esc(l)}</button>`).join('')}</div>
          <div class="grid2"><button class="btn ghost" data-act="g-del">${ic('del')} מחק</button><button class="btn ghost" data-act="g-skip">דלג</button></div></div></div>`;
    }
    if (id === 'speed') {
      if (!g.started) return `<div class="screen no-tabs"><header class="topbar">${close}<h1>Speed Challenge</h1></header><div class="card result"><div class="big-emoji">⚡</div><h2>60 שניות. כמה מילים תתרגמו?</h2><p class="muted">${S.stats.bestSpeed ? `השיא שלך: ${S.stats.bestSpeed}` : 'בחרו את התרגום הנכון כמה שיותר מהר.'}</p></div><button class="btn block" data-act="speed-start">${ic('play')} התחל</button></div>`;
      if (g.over) {
        return `<div class="screen no-tabs"><header class="topbar">${close}<h1>Speed Challenge</h1></header><div class="card result"><div class="score tnum">${g.score}</div><h2>${g.newBest ? 'שיא חדש! 🏆' : 'נגמר הזמן!'}</h2><p class="muted">תשובות נכונות ב־60 שניות</p></div>${again}</div>`;
      }
      const it = ET.item(g.q.id);
      return `<div class="screen no-tabs"><header class="topbar">${close}<h1>Speed</h1><span class="timer tnum" id="timer">${Math.max(0, Math.ceil((g.end - Date.now()) / 1000))}</span><span class="badge good tnum">${g.score}</span></header>
        <div class="q-card"><div class="q-type">מה התרגום?</div><div class="q-prompt en" style="text-align:center;font-size:1.8rem">${esc(it.t)}</div>
        <div class="options">${g.q.options.map((o) => `<button class="opt ${g.flash && g.flash.v === o ? (g.flash.ok ? 'right' : 'wrong') : ''}" data-act="speed-answer" data-arg="${esc(o)}">${esc(o)}</button>`).join('')}</div></div></div>`;
    }
    return SCREENS.games();
  };
  const speedNext = () => { const g = RT.game; const it = quizPool(1)[0]; g.q = { id: it.id, options: ET.shuffle([it, ...distractors(it, 3)]).map((x) => x.he), answer: it.he }; g.flash = null; };
  let speedTimer = null;
  const speedTick = () => {
    const g = RT.game;
    if (!g || g.id !== 'speed' || !g.started || g.over) { clearInterval(speedTimer); return; }
    const left = Math.ceil((g.end - Date.now()) / 1000);
    const el = $('#timer'); if (el) el.textContent = Math.max(0, left);
    if (left <= 0) { g.over = true; clearInterval(speedTimer); S.stats.games++; if (g.score > S.stats.bestSpeed) { S.stats.bestSpeed = g.score; g.newBest = true; } ET.activity(); if (parse().name === 'game') render(); }
  };

  /* =========================================================
     READING
     ========================================================= */
  const PHRASES = ET.ITEMS.filter((i) => i.type === 'expr' || (i.type === 'word' && / /.test(i.t)))
    .map((it) => {
      const clean = it.t.replace(/[?.!]+$/, '');
      const parts = clean.split(' ');
      const IRR = { give: 'gave|given', run: 'ran', come: 'came', find: 'found', hang: 'hung', catch: 'caught', break: 'broke', put: 'put', turn: 'turn\\w*', bite: 'bit', hit: 'hit', get: 'got' };
      let src = parts.map(escRe).join('\\s+');
      if (it.kind === 'phrasal' || it.kind === 'idiom' || it.pos === 'phr') src = `(?:${escRe(parts[0])}\\w*${IRR[parts[0].toLowerCase()] ? '|' + IRR[parts[0].toLowerCase()] : ''})` + (parts.length > 1 ? '\\s+' + parts.slice(1).map(escRe).join('\\s+') : '');
      return { it, multi: parts.length > 1, abbr: /^[A-Z]{2,}$/.test(clean), spoken: it.kind === 'spoken', src };
    })
    .sort((a, b) => b.it.t.length - a.it.t.length);
  const wordSpans = (seg) => seg.split(/([A-Za-z][A-Za-z'’]*(?:-[A-Za-z]+)*)/).map((part, i) => {
    if (!(i % 2)) return esc(part);
    const lk = ET.lookup(part);
    const known = lk.item && ET.status(lk.item.id) === 'known';
    return `<span class="w${known ? ' known' : ''}" data-act="word" data-arg="${esc(part)}">${esc(part)}</span>`;
  }).join('');
  const tokenize = (text, story) => {
    const ranges = [];
    for (const ph of PHRASES) {
      if (!(ph.multi || ph.abbr || ph.spoken || story.slang)) continue;
      const re = new RegExp(`(^|[^A-Za-z'])(${ph.src})(?=$|[^A-Za-z'])`, ph.abbr ? 'g' : 'gi');
      let m;
      while ((m = re.exec(text))) {
        const st = m.index + m[1].length; const en = st + m[2].length;
        if (!ranges.some((r) => st < r.en && en > r.st)) ranges.push({ st, en, id: ph.it.id });
      }
    }
    ranges.sort((a, b) => a.st - b.st);
    let out = ''; let pos = 0;
    for (const r of ranges) { out += wordSpans(text.slice(pos, r.st)); out += `<span class="ph" data-act="phrase" data-arg="${esc(r.id)}">${esc(text.slice(r.st, r.en))}</span>`; pos = r.en; }
    return out + wordSpans(text.slice(pos));
  };
  const BANDF = [['all', 'הכול'], ['A', 'מתחילים'], ['B', 'בינוני'], ['C', 'מתקדמים']];
  SCREENS.reading = () => {
    const list = D.STORIES.filter((s) => RT.storyLvl === 'all' || s.level[0] === RT.storyLvl);
    return `<div class="screen">${topbar('קריאה')}
      <div class="chips">${BANDF.map(([id, he]) => `<button class="chip ${RT.storyLvl === id ? 'on' : ''}" data-act="story-lvl" data-arg="${id}">${he}</button>`).join('')}</div>
      <button class="card daily-card" data-act="go" data-arg="mystory"><div class="art" style="background:var(--sun-soft);color:var(--warn)">${ic('sparkle')}</div><div style="min-width:0"><div style="font-weight:600">צור סיפור מהמילים שלי</div><div class="muted small">טקסט קצר שבנוי מהמילים שלמדת לאחרונה</div></div>${ic('chev', 'chev')}</button>
      <div class="stack">${list.map(storyCard).join('')}</div>
      <p class="note">כל הסיפורים שמורים במכשיר וזמינים גם בלי אינטרנט. לחיצה על מילה בסיפור מציגה תרגום, וביטויים מסומנים מקבלים משמעות לפי ההקשר.</p></div>`;
  };
  const storyView = (s, back) => {
    const paras = s.text.split('\n').filter((p) => p.trim());
    const read = S.stats.stories[s.id];
    const gem = S.profile.ai === 'gemini' && S.profile.geminiKey && RT.online;
    return `<div class="screen">${topbar('קריאה', back, lvlBadge(s.level))}
      <div><h1 class="en" style="text-align:left;font-size:1.8rem">${esc(s.title)}</h1><p class="muted">${esc(s.he)} · ${s.minutes} דק׳ קריאה</p></div>
      ${s.id === 'my' ? `<p class="note">${esc(s.note || '')}</p>${gem ? `<button class="btn soft block" data-act="ai-story">${ic('sparkle')} כתוב לי סיפור חדש עם AI</button>` : ''}` : ''}
      <div class="card tight player"><button class="btn small" data-act="read-aloud">${RT.reading ? ic('stop') + ' עצור' : ic('speaker') + ' הקרא לי'}</button>
        <div class="seg" role="group" aria-label="מהירות הקראה">${[0.75, 1, 1.25, 1.5].map((r) => `<button class="${RT.rate === r ? 'on' : ''}" data-act="rate" data-arg="${r}">${r}x</button>`).join('')}</div></div>
      <article class="reader" lang="en">${paras.map((p, i) => `<p data-p="${i}">${tokenize(p, s)}</p>`).join('')}</article>
      ${s.id === 'my' ? '' : `<button class="btn block ${read ? 'soft' : ''}" data-act="story-done" data-arg="${s.id}">${read ? 'נקרא ✓' : 'סיימתי לקרוא'}</button>`}</div>`;
  };
  SCREENS.story = (id) => { const s = D.STORIES.find((x) => x.id === id); return s ? storyView(s, 'reading') : SCREENS.reading(); };
  const localStory = (items) => {
    const sents = items.map((it) => it.ex).filter(Boolean);
    const half = Math.ceil(sents.length / 2);
    return { id: 'my', title: 'My Words Story', he: 'סיפור מהמילים שלי', level: S.profile.cefr, minutes: 1, slang: true,
      note: 'טקסט תרגול שנבנה מהמשפטים של המילים שלמדת לאחרונה. לחצו על כל מילה כדי לחזור עליה.',
      text: `Today I want to practice my new English words.\n${sents.slice(0, half).join(' ')}\n${sents.slice(half).join(' ')}\nWhat a day! Now I know these words: ${items.map((i) => i.t).join(', ')}.` };
  };
  SCREENS.mystory = () => {
    const items = ET.recentIds(8).map(ET.item).filter((i) => i && i.ex);
    if (items.length < 3) return `<div class="screen">${topbar('סיפור מהמילים שלי', 'reading')}<div class="card empty"><div class="emo">✨</div><h2>צריך עוד כמה מילים</h2><p>למדו לפחות 3 מילים בכרטיסיות, ואז נבנה מהן סיפור.</p><button class="btn" data-act="go" data-arg="session/daily">ללמוד מילים</button></div></div>`;
    const key = items.map((i) => i.id).join(',');
    if (!RT.myStory || RT.myStory.key !== key) { RT.myStory = localStory(items); RT.myStory.key = key; const cached = S.aiCache['story:' + key]; if (cached) Object.assign(RT.myStory, cached); }
    return storyView(RT.myStory, 'reading');
  };
  const readAloud = (i = 0) => {
    const ps = document.querySelectorAll('.reader p');
    document.querySelectorAll('.reader p.speaking').forEach((p) => p.classList.remove('speaking'));
    if (!RT.reading || i >= ps.length) { RT.reading = false; const b = $('[data-act="read-aloud"]'); if (b) b.innerHTML = ic('speaker') + ' הקרא לי'; return; }
    ps[i].classList.add('speaking');
    ps[i].scrollIntoView({ block: 'center', behavior: 'smooth' });
    const ok = Speech.speak(ps[i].textContent, { rate: RT.rate, onend: () => readAloud(i + 1) });
    if (!ok) { RT.reading = false; toast('ההקראה לא נתמכת בדפדפן הזה'); }
  };
  const sentenceOf = (el, word) => {
    const p = el.closest('p'); if (!p) return '';
    const sents = p.textContent.match(/[^.!?]+[.!?"]*/g) || [p.textContent];
    return (sents.find((s) => new RegExp(`\\b${escRe(word)}\\b`, 'i').test(s)) || sents[0]).trim();
  };

  /* =========================================================
     AI
     ========================================================= */
  const CORR = [['minimal', 'כמעט בלי'], ['important', 'חשובים'], ['teacher', 'מורה לאנגלית']];
  SCREENS.ai = () => {
    const local = ET.AI.current().id === 'local';
    return `<div class="screen">${topbar('שיחה עם AI')}
      <div class="card stack"><div class="row"><span class="ico" style="width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent)">${ic(local ? 'chat' : 'sparkle')}</span>
        <div class="grow"><b>${local ? 'מורה מקומי' : 'Google Gemini'}</b><div class="small muted">${local ? 'עובד גם בלי אינטרנט: תרחישי שיחה ותיקון של טעויות נפוצות. לשיחה חופשית חכמה יותר אפשר לחבר Gemini בחינם בפרופיל.' : 'מחובר. ההודעות נשלחות ל־Google כדי ליצור תשובה.'}</div></div></div>
        <div class="field"><label>רמת תיקון</label><div class="seg full">${CORR.map(([id, he]) => `<button class="${S.profile.correction === id ? 'on' : ''}" data-act="set" data-arg="correction:${id}">${he}</button>`).join('')}</div></div></div>
      <button class="card daily-card" data-act="go" data-arg="chat/free"><div class="art">💬</div><div style="min-width:0"><div style="font-weight:600">שיחה חופשית</div><div class="muted small">מדברים על כל נושא</div></div>${ic('chev', 'chev')}</button>
      <section class="section"><div class="section-head"><h2>סיטואציות לתרגול</h2></div>
        <div class="tiles">${D.SCENARIOS.filter((s) => s.id !== 'free').map((s) => `<button class="tile" data-act="go" data-arg="chat/${s.id}"><span class="emo">${s.icon}</span><span class="name">${esc(s.he)}</span>${(S.chats[s.id] || { msgs: [] }).msgs.length > 1 ? '<span class="sub">שיחה פתוחה</span>' : ''}</button>`).join('')}</div></section></div>`;
  };
  const msgHtml = (m, i) => {
    if (m.from === 'bot') {
      return `<div class="msg bot"><div class="bubble">${esc(m.text)}</div>${m.showHe && m.he ? `<div class="he">${esc(m.he)}</div>` : ''}
        <div class="tools">${speakBtn(m.text, '', '', 'sm')}${m.he ? `<button class="speak sm" data-act="toggle-he" data-arg="${i}">${m.showHe ? 'הסתר תרגום' : 'תרגום'}</button>` : ''}</div></div>`;
    }
    return `<div class="msg me"><div class="bubble">${esc(m.text)}</div>${m.fix ? `<div class="fix"><span class="lbl">מה אמרת</span><div class="was">${esc(m.fix.was)}</div><span class="lbl">נכון יותר</span><div class="now">${esc(m.fix.now)}</div><span class="lbl">למה</span><div>${m.fix.why.map(bidi).join('<br>')}</div></div>` : ''}</div>`;
  };
  SCREENS.chat = (id) => {
    const sc = D.SCENARIOS.find((s) => s.id === id) || D.SCENARIOS[0];
    const chat = S.chats[sc.id] || (S.chats[sc.id] = { msgs: [] });
    if (!chat.msgs.length) { const o = ET.AI.current().opening(sc); chat.msgs.push({ from: 'bot', text: o.text, he: o.he }); S.stats.chats++; ET.save(); }
    const recent = ET.recentIds(6).map(ET.item).filter(Boolean);
    RT.after = () => window.scrollTo(0, document.body.scrollHeight);
    return `<div class="screen chat-screen">${topbar(sc.icon + ' ' + esc(sc.he), 'ai', `<button class="icon-btn ${S.profile.autoSpeak ? 'active' : ''}" data-act="auto-speak" aria-label="הקראה אוטומטית של תשובות" aria-pressed="${S.profile.autoSpeak}">${ic('speaker')}</button><button class="icon-btn" data-act="chat-reset" data-arg="${sc.id}" aria-label="שיחה חדשה">${ic('refresh')}</button>`)}
      <div class="msgs" id="msgs">${chat.msgs.map(msgHtml).join('')}${RT.chatBusy ? '<div class="msg bot"><div class="bubble typing" aria-label="כותב…"><i></i><i></i><i></i></div></div>' : ''}</div>
      ${recent.length ? `<div class="suggest"><span class="muted">נסו להשתמש:</span>${recent.map((w) => `<button class="chip" data-act="insert" data-arg="${esc(w.t)}"><span class="en">${esc(w.t)}</span></button>`).join('')}</div>` : ''}
      <div class="chat-pad"></div>
      <form class="composer" data-form="chat" data-arg="${sc.id}"><div class="in">
        ${SR ? `<button type="button" class="icon-btn mic ${RT.rec ? 'rec' : ''}" data-act="mic" aria-label="${RT.rec ? 'עצירת הקלטה' : 'דיבור'}">${ic('mic')}</button>` : ''}
        <input class="input" id="chat-input" placeholder="Write in English…" autocomplete="off" enterkeyhint="send" aria-label="הודעה באנגלית">
        <button class="icon-btn send" aria-label="שליחה">${ic('send')}</button></div></form></div>`;
  };
  const sendChat = async (id, text) => {
    text = text.trim();
    if (!text || RT.chatBusy) return;
    const sc = D.SCENARIOS.find((s) => s.id === id) || D.SCENARIOS[0];
    const chat = S.chats[sc.id];
    chat.msgs.push({ from: 'me', text });
    S.stats.msgs++; ET.activity();
    ET.recentIds(30).forEach((rid) => { const it = ET.item(rid); if (it && new RegExp(`\\b${escRe(it.t.replace(/[?.!]+$/, ''))}\\b`, 'i').test(text)) { const had = (ET.rec(rid).p >> ET.PATH_BIT.used) & 1; ET.mark(rid, 'used'); if (!had) toast(`כל הכבוד! השתמשת במילה "${it.t}" 🎉`); } });
    RT.chatBusy = true; render();
    const recent = ET.recentIds(6).map(ET.item).filter(Boolean);
    const [r] = await Promise.all([ET.AI.reply({ sc, history: chat.msgs, text, recent }), wait(500)]);
    chat.msgs[chat.msgs.length - 1].fix = r.fix || null;
    chat.msgs.push({ from: 'bot', text: r.text, he: r.he });
    chat.msgs = chat.msgs.slice(-60);
    RT.chatBusy = false; ET.save();
    if (r.fellBack) toast('אין חיבור ל־Gemini, ענה המורה המקומי');
    if (parse().name === 'chat') render();
    if (S.profile.autoSpeak) Speech.speak(r.text);
  };

  /* =========================================================
     PROFILE / STATS / STORAGE
     ========================================================= */
  const seg = (key, opts) => `<div class="seg full" role="group">${opts.map(([v, he]) => `<button class="${String(S.profile[key]) === String(v) ? 'on' : ''}" data-act="set" data-arg="${key}:${v}">${he}</button>`).join('')}</div>`;
  SCREENS.profile = () => {
    const p = S.profile;
    const gem = p.ai === 'gemini';
    return `<div class="screen">${topbar('פרופיל')}
      <div class="card row"><span style="width:56px;height:56px;border-radius:50%;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;flex:none">${ic('user')}</span>
        <div class="grow"><h2>הפרופיל שלי</h2><div class="small muted">רמה: ${bandHe(p.cefr)} (${p.cefr}) · ${ET.streak()} ימים ברצף</div></div>
        <button class="btn small soft" data-act="go" data-arg="stats">${ic('chart')} נתונים</button></div>

      <section class="section"><h2>לימוד</h2><div class="card stack">
        <div class="field"><label>רמה</label>${seg('level', [['beginner', 'מתחילים'], ['intermediate', 'בינוני'], ['advanced', 'מתקדמים']])}<button class="link small" data-act="go" data-arg="placement" style="justify-self:start">לא בטוחים? עשו מבחן רמה קצר</button></div>
        <div class="field"><label>יעד לימוד יומי (דקות)</label>${seg('dailyMin', [[5, '5'], [10, '10'], [15, '15'], [20, '20'], [30, '30']])}</div>
        <div class="field"><label>מטרת הלימוד</label><div class="chips wrap">${D.GOALS.map((g) => `<button class="chip ${p.goal === g.id ? 'on' : ''}" data-act="set" data-arg="goal:${g.id}">${g.he}</button>`).join('')}</div></div>
        <div class="field"><label>תחומי עניין</label><div class="chips wrap">${D.INTERESTS.map((g) => `<button class="chip ${p.interests.includes(g.id) ? 'on' : ''}" data-act="toggle-interest" data-arg="${g.id}">${g.he}</button>`).join('')}</div></div>
        <div class="field"><label>מבטא להגייה</label>${seg('accent', [['en-US', 'אמריקאי 🇺🇸'], ['en-GB', 'בריטי 🇬🇧']])}<button class="link small" data-act="say" data-arg="Hello! How are you today?" style="justify-self:start">השמע דוגמה</button></div>
      </div></section>

      <section class="section"><h2>תצוגה</h2><div class="card stack"><div class="field"><label>ערכת נושא</label>${seg('theme', [['system', 'לפי המכשיר'], ['light', 'בהיר'], ['dark', 'כהה']])}</div></div></section>

      <section class="section"><h2>שיחה עם AI</h2><div class="card stack">
        <div class="field"><label>ספק AI</label>${seg('ai', [['local', 'מורה מקומי (Offline)'], ['gemini', 'Google Gemini']])}</div>
        ${gem ? `<p class="note">Gemini מציע שכבה חינמית. יוצרים מפתח אישי בחינם באתר Google AI Studio (aistudio.google.com) ומדביקים כאן. המפתח נשמר רק במכשיר שלך, וההודעות בצ'אט נשלחות ל־Google. אם אין אינטרנט, האפליקציה עוברת אוטומטית למורה המקומי.</p>
          <div class="field"><label for="gem-key">מפתח API</label><input class="input" id="gem-key" type="password" dir="ltr" autocomplete="off" value="${esc(p.geminiKey)}" placeholder="AIza…"></div>
          <div class="field"><label for="gem-model">מודל</label><input class="input" id="gem-model" dir="ltr" autocomplete="off" value="${esc(p.geminiModel)}"></div>
          <button class="btn soft block" data-act="gemini-save">שמירה ובדיקת חיבור</button>` : '<p class="small muted">המורה המקומי חינמי לגמרי ועובד בלי אינטרנט. הוא מנהל תרחישי שיחה ומתקן טעויות נפוצות.</p>'}
      </div></section>

      <section class="section"><h2>כללי</h2><div class="list">
        <div class="li"><span class="ico">${ic('bell')}</span><span class="main"><span class="t">תזכורת יומית</span><span class="s" style="display:block">תגיע בגרסה הבאה</span></span><span class="badge">בקרוב</span></div>
        ${li('download', 'הורדות ואחסון', 'תוכן Offline, גודל וניקוי Cache', 'storage')}
        ${li('flag', 'הדיווחים שלי', `${S.reports.length} דיווחים על טעויות`, 'reports')}
      </div></section>

      <section class="section"><h2>חשבון וסנכרון</h2><div class="card stack">
        <div class="row"><span class="ico" style="color:var(--accent)">${ic('cloud')}</span><div class="grow"><b>מצב אורח</b><div class="small muted">כל הנתונים נשמרים רק במכשיר הזה. התחברות (Apple, Google, אימייל) וסנכרון בין מכשירים יתווספו בגרסה הבאה. בינתיים אפשר לגבות לקובץ.</div></div></div>
        <div class="grid2"><button class="btn ghost" data-act="export">${ic('download')} ייצוא גיבוי</button><button class="btn ghost" data-act="import">ייבוא גיבוי</button></div>
        <input type="file" id="import-file" accept="application/json,.json" data-change="import" hidden>
      </div></section>

      <section class="section"><div class="card stack">
        ${RT.confirmReset ? `<p><b>למחוק את כל ההתקדמות?</b> הפעולה לא ניתנת לביטול.</p><div class="grid2"><button class="btn" style="background:var(--bad);color:#fff" data-act="reset-confirm">כן, למחוק</button><button class="btn ghost" data-act="reset-cancel">ביטול</button></div>`
          : `<button class="btn ghost block" style="color:var(--bad)" data-act="reset-ask">${ic('trash')} איפוס כל הנתונים</button>`}
      </div></section>
      <p class="small muted" style="text-align:center">גרסה 1.0 · חינמית לגמרי · בלי פרסומות ובלי מנויים</p></div>`;
  };

  const DAYS_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
  SCREENS.stats = () => {
    const st = S.stats;
    const week = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); week.push({ d, m: Math.round(((S.days[ET.dayKey(d)] || {}).sec || 0) / 60) }); }
    const max = Math.max(5, ...week.map((w) => w.m));
    const pct = st.qTotal ? Math.round((st.qRight / st.qTotal) * 100) + '%' : '–';
    return `<div class="screen">${topbar('סטטיסטיקות', 'profile')}
      <div class="card stack"><div class="section-head"><h2>דקות לימוד השבוע</h2><span class="small muted tnum">${week.reduce((a, w) => a + w.m, 0)} דק׳</span></div>
        <div class="week">${week.map((w) => `<div class="d"><span class="small tnum">${w.m || ''}</span><div class="col-bar ${w.m ? '' : 'zero'}" style="height:${Math.max(4, (w.m / max) * 90)}px"></div><span class="lbl">${DAYS_HE[w.d.getDay()]}</span></div>`).join('')}</div></div>
      <div class="grid2">
        ${stat(ET.myList('all').length, 'מילים שנלמדו')}${stat(ET.myList('known').length, 'מילים שאני יודע')}
        ${stat(ET.myList('saved').length, 'מילים שמורות')}${stat(ET.myList('hard').length, 'מילים קשות')}
        ${stat(ET.totalMinutes(), 'דקות לימוד בסך הכול')}${stat(ET.streak() + ' 🔥', 'ימים ברצף (Streak)')}
        ${stat(st.bestStreak, 'שיא ימים ברצף')}${stat(Object.keys(st.stories).length, 'סיפורים שנקראו')}
        ${stat(st.chats, 'שיחות AI')}${stat(st.msgs, 'הודעות ששלחתי')}
        ${stat(st.quizzes, 'מבחנים')}${stat(pct, 'אחוז הצלחה במבחנים')}
      </div></div>`;
  };

  const sizeOf = (o) => new Blob([typeof o === 'string' ? o : JSON.stringify(o)]).size;
  const kb = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
  SCREENS.storage = () => {
    const sw = 'serviceWorker' in navigator && navigator.serviceWorker.controller;
    const exprN = ET.ITEMS.filter((i) => i.type === 'expr').length;
    const packs = [['🗂️', 'כל הנושאים', `${D.CATEGORIES.length} נושאים · ${ET.ITEMS.filter((i) => i.type === 'word').length} מילים`, sizeOf(D.WORDS)],
      ['🔥', 'סלנג ו־Real English', `${exprN} ביטויים`, sizeOf(D.EXPRESSIONS)],
      ['📖', 'סיפורים', `${D.STORIES.length} סיפורים`, sizeOf(D.STORIES)],
      ['📗', 'מילון מקומי', `${Object.keys(ET.LEX).length + ET.ITEMS.length} ערכים`, sizeOf(window.APP_LEX)]];
    RT.after = () => {
      if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then((e) => { const el = $('#st-size'); if (el) el.textContent = kb(e.usage || 0); }).catch(() => {});
    };
    return `<div class="screen">${topbar('הורדות ואחסון', 'profile')}
      <div class="card row"><span style="font-size:1.8rem">${sw ? '✅' : 'ℹ️'}</span><div class="grow"><b>${sw ? 'האפליקציה שמורה במכשיר' : 'שמירה למצב Offline'}</b><div class="small muted">${sw ? 'כל התוכן הורד ועובד גם בלי אינטרנט.' : 'התוכן נשמר אוטומטית בביקור הראשון. אם ההודעה לא מתחלפת, רעננו את הדף פעם אחת.'}</div></div></div>
      <div class="grid2">${stat('<span id="st-size">…</span>', 'נפח בשימוש במכשיר')}${stat(kb(sizeOf(S)), 'ההתקדמות שלך')}</div>
      <section class="section"><h2>תוכן זמין Offline</h2><div class="list">${packs.map(([e, t, s, n]) => `<div class="li"><span class="ico">${e}</span><span class="main"><span class="t">${t}</span><span class="s" style="display:block">${s} · ${kb(n)}</span></span><span class="badge good">שמור ✓</span></div>`).join('')}</div></section>
      <div class="card stack">
        <div class="row"><div class="grow"><b>הורדה אוטומטית ב־Wi‑Fi</b><div class="small muted">בודק ומוריד תכנים ועדכונים חדשים כשיש Wi‑Fi</div></div><label class="switch"><input type="checkbox" id="auto-wifi" data-change="autowifi" ${S.profile.autoWifi ? 'checked' : ''} aria-label="הורדה אוטומטית ב-Wi-Fi"><span></span></label></div>
        <button class="btn ghost block" data-act="check-update">${ic('refresh')} בדיקת עדכונים עכשיו</button>
        <button class="btn ghost block" data-act="clear-cache">${ic('trash')} ניקוי Cache והורדה מחדש</button>
        <button class="btn ghost block" data-act="clear-chats">מחיקת היסטוריית השיחות</button>
      </div></div>`;
  };

  SCREENS.reports = () => `<div class="screen">${topbar('הדיווחים שלי', 'profile')}
    ${S.reports.length ? `<p class="note">הדיווחים נשמרים במכשיר. אפשר להעתיק אותם ולשלוח לנו. בגרסה הבאה הם יישלחו ישירות לצוות התוכן.</p>
      <button class="btn soft block" data-act="copy-reports">העתקת כל הדיווחים</button>
      <div class="list">${S.reports.map((r, i) => `<div class="li"><span class="ico">${ic('flag')}</span><span class="main"><span class="t"><span class="en">${esc(r.term)}</span> · ${esc(r.kind)}</span><span class="s" style="display:block">${esc(r.note || 'ללא הערה')} · ${new Date(r.at).toLocaleDateString('he-IL')}</span></span><button class="icon-btn flat" data-act="del-report" data-arg="${i}" aria-label="מחיקת דיווח">${ic('trash')}</button></div>`).join('')}</div>`
      : '<div class="card empty"><div class="emo">🙌</div><h2>אין דיווחים</h2><p>מצאתם טעות בתרגום, בהגייה או בדוגמה? לחצו על "דיווח על טעות" בכרטיס המילה.</p></div>'}</div>`;

  /* =========================================================
     SHEETS
     ========================================================= */
  const REPORT_KINDS = ['תרגום שגוי', 'משמעות שגויה', 'הגייה', 'סלנג מיושן', 'דוגמה לא נכונה', 'אחר'];
  const highlight = (sentence, word) => esc(sentence).replace(new RegExp(`\\b(${escRe(esc(word))})\\b`, 'i'), '<mark style="background:var(--accent-soft);color:inherit;border-radius:4px;padding:0 2px">$1</mark>');
  function sheetContent() {
    const sh = RT.sheet;
    if (sh.type === 'item') {
      const it = ET.item(sh.id);
      if (!it) return '';
      const r = ET.rec(it.id) || {};
      const ctx = sh.ctx || {};
      return `<div class="grab"></div>
        <div class="head"><div class="term">${esc(it.t)}</div>
          <button class="icon-btn flat ${r.saved ? 'active' : ''}" data-act="save" data-arg="${esc(it.id)}" aria-label="${r.saved ? 'הסרה מהשמורים' : 'שמירה'}">${r.saved ? icFill('star') : ic('star')}</button>
          <button class="icon-btn flat" data-act="close-sheet" aria-label="סגירה">${ic('x')}</button></div>
        <div class="row wrap" style="gap:6px">${it.ipa ? `<span class="muted en">${esc(it.ipa)}</span>` : ''}${it.lvl ? lvlBadge(it.lvl) : ''}${it.type === 'expr' ? `<span class="badge sun">${ET.KINDS[it.kind].he}</span>` : it.pos ? `<span class="badge">${ET.POS[it.pos] || ''}</span>` : ''}</div>
        <div class="row wrap">${speakBtn(it.t, it.id, 'השמע')}<button class="speak" data-act="say-slow" data-arg="${esc(it.t)}" data-id="${esc(it.id)}">🐢 לאט</button></div>
        <div class="translation" style="text-align:start">${it.emoji && it.type === 'word' ? it.emoji + ' ' : ''}${esc(it.he)}</div>
        ${ctx.phrase ? `<div class="ctx-box"><span class="lbl">משמעות בהקשר הזה</span><div>${esc(it.real || it.he)}</div>${it.lit ? `<div class="small muted">מילולית: ${esc(it.lit)}</div>` : ''}</div>` : ''}
        ${it.type === 'expr' && !ctx.phrase ? exprDetails(it) : ''}
        ${ctx.sentence ? `<div class="example"><div class="small muted">מתוך הטקסט</div><div class="en-line">${highlight(ctx.sentence, ctx.word || it.t)}</div></div>` : ''}
        ${exampleBox(it)}
        ${pathDots(it.id)}
        <div class="grid2"><button class="btn ${r.saved ? 'soft' : ''}" data-act="save" data-arg="${esc(it.id)}">${r.saved ? 'שמור ✓' : 'שמור למילים שלי'}</button><button class="btn ghost" data-act="report" data-arg="${esc(it.id)}">${ic('flag')} דיווח על טעות</button></div>`;
    }
    if (sh.type === 'lex') {
      const lk = ET.lookup(sh.word);
      const gem = S.profile.ai === 'gemini' && S.profile.geminiKey && RT.online;
      return `<div class="grab"></div>
        <div class="head"><div class="term">${esc(sh.word)}</div><button class="icon-btn flat" data-act="close-sheet" aria-label="סגירה">${ic('x')}</button></div>
        <div class="row wrap">${speakBtn(sh.word, '', 'השמע')}<button class="speak" data-act="say-slow" data-arg="${esc(sh.word)}">🐢 לאט</button></div>
        <div class="translation" style="text-align:start">${lk.he ? esc(lk.he) : '<span class="muted" style="font-size:1rem">אין תרגום למילה הזאת במילון המקומי</span>'}</div>
        ${lk.he && lk.t.toLowerCase() !== sh.word.toLowerCase() ? `<div class="small muted">צורת הבסיס: <span class="en">${esc(lk.t)}</span></div>` : ''}
        ${sh.ai ? `<div class="ctx-box"><span class="lbl">הסבר לפי ההקשר (AI)</span><div>${esc(sh.ai)}</div></div>` : ''}
        ${sh.sentence ? `<div class="example"><div class="small muted">מתוך הטקסט</div><div class="en-line">${highlight(sh.sentence, sh.word)}</div>${speakBtn(sh.sentence, '', 'השמע משפט', 'sm')}</div>` : ''}
        <div class="grid2">${lk.he ? `<button class="btn" data-act="save-lex">שמור למילים שלי</button>` : ''}${gem && !sh.ai ? `<button class="btn soft" data-act="ai-explain">${ic('sparkle')} הסבר לפי ההקשר</button>` : ''}<button class="btn ghost" data-act="report-lex">${ic('flag')} דיווח</button></div>`;
    }
    if (sh.type === 'report') {
      return `<div class="grab"></div><div class="head"><h2 style="flex:1">דיווח על טעות · <span class="en">${esc(sh.term)}</span></h2><button class="icon-btn flat" data-act="close-sheet" aria-label="סגירה">${ic('x')}</button></div>
        <div class="options">${REPORT_KINDS.map((k) => `<button class="opt ${sh.kind === k ? 'on' : ''}" data-act="report-kind" data-arg="${k}">${k}</button>`).join('')}</div>
        <div class="field"><label for="report-note">פרטים (לא חובה)</label><textarea class="input" id="report-note" placeholder="מה לא נכון? מה צריך להיות?"></textarea></div>
        <button class="btn block" data-act="send-report" ${sh.kind ? '' : 'disabled'}>שליחת דיווח</button>`;
    }
    return '';
  }
  function renderSheet() {
    if (!RT.sheet) { sheetRoot.innerHTML = ''; RT.lastSheet = null; return; }
    const keepNote = $('#report-note') ? $('#report-note').value : '';
    const same = RT.lastSheet === RT.sheet;
    sheetRoot.innerHTML = `<div class="backdrop" data-act="close-sheet"></div><div class="sheet" role="dialog" aria-modal="true" ${same ? 'style="animation:none"' : ''}>${sheetContent()}</div>`;
    if (keepNote && $('#report-note')) $('#report-note').value = keepNote;
    RT.lastSheet = RT.sheet;
  }
  const openItem = (id, ctx) => { RT.sheet = { type: 'item', id, ctx }; renderSheet(); };

  /* =========================================================
     ACTIONS
     ========================================================= */
  const say = (text, el, rate) => {
    if (!Speech.speak(text, { rate })) { toast('השמע לא נתמך בדפדפן הזה'); return; }
    if (el && el.dataset.id) ET.mark(el.dataset.id, 'heard');
  };
  const ACT = {
    go: (a) => go(a),
    say: (a, el) => say(a, el),
    'say-slow': (a, el) => say(a, el, 0.6),
    item: (a) => openItem(a),
    lex: (a) => { RT.sheet = { type: 'lex', word: a }; renderSheet(); },
    word: (a, el) => {
      const lk = ET.lookup(a);
      const sentence = sentenceOf(el, a);
      if (lk.item) { ET.mark(lk.item.id, 'context'); openItem(lk.item.id, { sentence, word: a }); } else { RT.sheet = { type: 'lex', word: a, sentence }; renderSheet(); }
    },
    phrase: (a, el) => { ET.mark(a, 'context'); openItem(a, { phrase: true, sentence: sentenceOf(el, el.textContent), word: el.textContent }); },
    'close-sheet': () => { RT.sheet = null; renderSheet(); },
    save: (a) => { const on = ET.toggleSave(a); toast(on ? 'נשמר למילים שלי ⭐' : 'הוסר מהשמורים'); render(); },
    'save-lex': () => { const sh = RT.sheet; const lk = ET.lookup(sh.word); const id = ET.saveLexWord(lk.t, lk.he, sh.sentence); ET.toggleSave(id) || ET.toggleSave(id); ET.mark(id, 'context'); toast('נשמר למילים שלי ⭐'); RT.sheet = null; render(); },
    report: (a) => { const it = ET.item(a); RT.sheet = { type: 'report', id: a, term: it ? it.t : a, kind: null }; renderSheet(); },
    'report-lex': () => { const w = RT.sheet.word; RT.sheet = { type: 'report', id: 'lex:' + w, term: w, kind: null }; renderSheet(); },
    'report-kind': (a) => { RT.sheet.kind = a; renderSheet(); },
    'send-report': () => {
      const sh = RT.sheet; if (!sh.kind) return;
      S.reports.unshift({ id: sh.id, term: sh.term, kind: sh.kind, note: ($('#report-note') || {}).value || '', at: Date.now() });
      ET.save(); RT.sheet = null; toast('הדיווח נשמר. תודה! 🙏'); render();
    },
    reveal: () => { const s = RT.session; if (!s) return; s.revealed = true; ET.mark(s.ids[s.i], 'understood'); render(); },
    grade: (a) => { const s = RT.session; if (!s) return; ET.grade(s.ids[s.i], +a); s.res[a]++; s.i++; s.revealed = false; Speech.stop(); render(); window.scrollTo(0, 0); },
    'exit-session': () => { const p = sessionExitPath(); RT.session = null; go(p); },
    'restart-session': () => { RT.session = null; render(); },
    'my-tab': (a) => { RT.myTab = a; render(); },
    'slang-cat': (a) => { RT.slangCat = a; render(); },
    'dict-filter': (a) => { RT.dictF = a; render(); },
    'story-lvl': (a) => { RT.storyLvl = a; render(); },
    'read-aloud': () => { if (RT.reading) { RT.reading = false; Speech.stop(); readAloud(99999); } else { RT.reading = true; $('[data-act="read-aloud"]').innerHTML = ic('stop') + ' עצור'; readAloud(0); } },
    rate: (a) => { RT.rate = +a; document.querySelectorAll('[data-act="rate"]').forEach((b) => b.classList.toggle('on', +b.dataset.arg === RT.rate)); },
    'story-done': (a) => { if (!S.stats.stories[a]) { S.stats.stories[a] = Date.now(); ET.activity(); toast('כל הכבוד! עוד סיפור נקרא 📖'); } render(); },
    'ai-story': async () => {
      const s = RT.myStory; if (!s) return;
      toast('כותב סיפור…');
      try {
        const items = ET.recentIds(8).map(ET.item).filter(Boolean);
        const j = await ET.AI.providers.gemini.story(items.map((i) => i.t), S.profile.cefr);
        const upd = { title: j.title, he: j.titleHe, text: j.text, note: 'סיפור שנכתב עם AI מהמילים שלמדת לאחרונה.' };
        Object.assign(s, upd); S.aiCache['story:' + s.key] = upd; ET.save(); render();
      } catch (e) { toast('לא הצלחנו ליצור סיפור עכשיו. בדקו את החיבור והמפתח.'); }
    },
    'ai-explain': async () => {
      const sh = RT.sheet; if (!sh) return;
      toast('בודק את ההקשר…');
      try {
        const j = await ET.AI.providers.gemini.call('You explain English words to Hebrew speakers. Reply ONLY with JSON: {"he": "short explanation in Hebrew of the meaning in this context"}', [{ role: 'user', parts: [{ text: `Word: "${sh.word}". Sentence: "${sh.sentence || sh.word}". What does the word mean here?` }] }]);
        sh.ai = j.he; renderSheet();
      } catch (e) { toast('לא הצלחנו לקבל הסבר עכשיו.'); }
    },
    set: (a) => {
      const i = a.indexOf(':'); const k = a.slice(0, i); let v = a.slice(i + 1);
      if (k === 'dailyMin') v = +v;
      S.profile[k] = v;
      if (k === 'level') S.profile.cefr = ET.BANDS[v].cefr;
      if (k === 'accent') say('Hello! How are you today?');
      ET.save(); render();
    },
    'toggle-interest': (a) => { const l = S.profile.interests; const i = l.indexOf(a); if (i >= 0) l.splice(i, 1); else l.push(a); ET.save(); render(); },
    'gemini-save': async () => {
      S.profile.geminiKey = ($('#gem-key') || {}).value.trim();
      S.profile.geminiModel = ($('#gem-model') || {}).value.trim() || 'gemini-2.5-flash';
      ET.save(true);
      if (!S.profile.geminiKey) { toast('נשמר. בלי מפתח ייעשה שימוש במורה המקומי.'); return; }
      toast('בודק חיבור…');
      try { await ET.AI.providers.gemini.call('Reply ONLY with JSON {"ok": true}', [{ role: 'user', parts: [{ text: 'ping' }] }]); toast('מחובר ל־Gemini ✓'); } catch (e) { toast('החיבור נכשל. בדקו את המפתח ואת שם המודל.'); }
      render();
    },
    answer: (a) => answerQ(a),
    'next-q': () => { RT.quiz.i++; render(); window.scrollTo(0, 0); },
    'quiz-again': () => { RT.quiz.restart = true; render(); window.scrollTo(0, 0); },
    'quiz-exit': () => { const m = RT.quiz && RT.quiz.mode; RT.quiz = null; go(m === 'listen' ? 'games' : 'learn'); },
    'game-exit': () => { RT.game = null; clearInterval(speedTimer); go('games'); },
    'game-again': () => { const id = RT.game.id; RT.game = newGame(id); render(); },
    'm-pick': (a) => {
      const g = RT.game; const [side, id] = a.split('|');
      if (side === 'he') g.selHe = id; else g.selEn = id;
      g.err = null;
      if (g.selHe && g.selEn) {
        if (g.selHe === g.selEn) { g.done.push(g.selHe); ET.mark(g.selHe, 'understood'); } else { g.errors++; g.err = { he: g.selHe, en: g.selEn }; setTimeout(() => { if (RT.game === g) { g.err = null; render(); } }, 700); }
        g.selHe = null; g.selEn = null;
      }
      render();
    },
    'g-letter': (a) => {
      const g = RT.game; const it = g.items[g.i];
      g.picked.push(+a); g.wrong = false;
      if (g.picked.length === it.t.length) {
        const word = g.picked.map((k) => g.letters[k]).join('');
        if (word === it.t) { g.score++; say(it.t); toast('נכון! ✓'); g.i++; if (g.i < g.items.length) { g.letters = ET.shuffle(g.items[g.i].t.split('')); g.picked = []; } }
        else { g.wrong = true; g.picked = []; }
      }
      render();
    },
    'g-del': () => { RT.game.picked.pop(); RT.game.wrong = false; render(); },
    'g-skip': () => { const g = RT.game; toast(`המילה הייתה: ${g.items[g.i].t}`); ET.grade(g.items[g.i].id, 1); g.i++; if (g.i < g.items.length) { g.letters = ET.shuffle(g.items[g.i].t.split('')); g.picked = []; g.wrong = false; } render(); },
    'speed-start': () => { const g = RT.game; g.started = true; g.end = Date.now() + 60000; speedNext(); clearInterval(speedTimer); speedTimer = setInterval(speedTick, 250); render(); },
    'speed-answer': (a) => {
      const g = RT.game; if (g.over || g.flash) return;
      const ok = a === g.q.answer; if (ok) g.score++;
      g.flash = { v: a, ok }; render();
      setTimeout(() => { if (RT.game === g && !g.over) { speedNext(); render(); } }, ok ? 250 : 700);
    },
    'auto-speak': () => { S.profile.autoSpeak = !S.profile.autoSpeak; ET.save(); toast(S.profile.autoSpeak ? 'התשובות יוקראו אוטומטית' : 'הקראה אוטומטית כבויה'); render(); },
    'chat-reset': (a) => { S.chats[a] = { msgs: [] }; ET.save(); render(); },
    'toggle-he': (a) => { const id = parse().args[0]; const m = S.chats[id].msgs[+a]; m.showHe = !m.showHe; render(); },
    insert: (a) => { const inp = $('#chat-input'); if (!inp) return; inp.value = (inp.value ? inp.value.replace(/\s*$/, ' ') : '') + a + ' '; inp.focus(); },
    mic: () => {
      if (RT.rec) { RT.rec.stop(); return; }
      try {
        const r = new SR(); r.lang = S.profile.accent; r.interimResults = false; r.maxAlternatives = 1;
        r.onresult = (e) => { const t = e.results[0][0].transcript; const inp = $('#chat-input'); if (inp) inp.value = (inp.value ? inp.value + ' ' : '') + t; };
        r.onerror = (e) => toast(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'צריך לאשר גישה למיקרופון' : 'לא הצלחתי לשמוע, נסו שוב');
        r.onend = () => { RT.rec = null; render(); };
        RT.rec = r; r.start(); render();
      } catch (e) { RT.rec = null; toast('זיהוי דיבור לא זמין כאן'); }
    },
    'onb-next': () => { const o = RT.onb; const i = ONB_STEPS.indexOf(o.step); o.step = ONB_STEPS[Math.min(ONB_STEPS.length - 1, i + 1)]; render(); },
    'onb-back': () => { const o = RT.onb; const i = ONB_STEPS.indexOf(o.step); o.step = ONB_STEPS[Math.max(0, i - 1)]; render(); },
    'onb-level': (a) => {
      const o = RT.onb; o.level = a;
      if (a === 'unknown') { RT.test = null; o.step = 'test'; } else { S.profile.level = a; S.profile.cefr = ET.BANDS[a].cefr; o.step = 'goal'; }
      render();
    },
    'onb-goal': (a) => { RT.onb.goal = a; render(); },
    'onb-int': (a) => { const l = RT.onb.interests; const i = l.indexOf(a); if (i >= 0) l.splice(i, 1); else l.push(a); render(); },
    'onb-daily': (a) => { RT.onb.dailyMin = +a; render(); },
    'onb-finish': () => {
      const o = RT.onb;
      Object.assign(S.profile, { goal: o.goal, interests: o.interests.slice(), dailyMin: o.dailyMin });
      S.onboarded = true; ET.save(true); location.hash = '#/home'; render();
    },
    'test-answer': (a) => { const t = RT.test; if (+a === D.PLACEMENT[t.i].a) t.right++; t.i++; render(); },
    'test-exit': () => { const mode = RT.test && RT.test.mode; RT.test = null; if (mode === 'onb') { RT.onb.step = 'level'; render(); } else go('profile'); },
    'test-done': () => {
      const t = RT.test; S.profile.cefr = t.result; S.profile.level = ET.bandOf(t.result); ET.save(); RT.test = null;
      if (!S.onboarded) { RT.onb.step = 'goal'; render(); } else { toast(`הרמה עודכנה: ${bandHe(S.profile.cefr)}`); go('profile'); }
    },
    export: () => {
      const blob = new Blob([ET.exportData()], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `english-backup-${ET.dayKey()}.json`;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      toast('קובץ הגיבוי נוצר');
    },
    import: () => $('#import-file').click(),
    'reset-ask': () => { RT.confirmReset = true; render(); },
    'reset-cancel': () => { RT.confirmReset = false; render(); },
    'reset-confirm': () => ET.resetAll(),
    'check-update': async () => {
      if (!RT.swReg) { toast('אין חיבור לשירות העדכונים כרגע'); return; }
      try { await RT.swReg.update(); toast(RT.online ? 'האפליקציה מעודכנת ✓' : 'אין אינטרנט. ננסה שוב כשיחזור החיבור'); } catch (e) { toast('הבדיקה נכשלה, נסו שוב'); }
    },
    'clear-cache': async () => {
      if (!('caches' in window)) { toast('אין Cache לניקוי'); return; }
      if (!RT.online) { toast('צריך אינטרנט כדי להוריד מחדש'); return; }
      const keys = await caches.keys(); await Promise.all(keys.map((k) => caches.delete(k)));
      toast('ה־Cache נוקה. מוריד מחדש…'); setTimeout(() => location.reload(), 800);
    },
    'clear-chats': () => { S.chats = {}; ET.save(); toast('היסטוריית השיחות נמחקה'); },
    'copy-reports': () => {
      const txt = S.reports.map((r) => `${r.term} | ${r.kind} | ${r.note || ''}`).join('\n');
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => toast('הועתק ✓'), () => toast('ההעתקה נכשלה')); else toast('ההעתקה לא נתמכת');
    },
    'del-report': (a) => { S.reports.splice(+a, 1); ET.save(); render(); }
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = ACT[el.dataset.act];
    if (fn) { e.preventDefault(); e.stopPropagation(); fn(el.dataset.arg, el, e); }
  });
  document.addEventListener('submit', (e) => {
    const f = e.target.closest('form[data-form]');
    if (!f) return;
    e.preventDefault();
    if (f.dataset.form === 'chat') { const inp = $('#chat-input'); const v = inp.value; inp.value = ''; sendChat(f.dataset.arg, v); }
    if (f.dataset.form === 'write') { const v = ($('#write-in') || {}).value || ''; if (v.trim()) answerQ(v.trim()); }
  });
  document.addEventListener('input', (e) => {
    if (e.target.dataset.input === 'dict') { RT.dictQ = e.target.value; const r = $('#dict-res'); if (r) r.innerHTML = dictResults(); }
  });
  document.addEventListener('change', (e) => {
    const k = e.target.dataset.change;
    if (k === 'autowifi') { S.profile.autoWifi = e.target.checked; ET.save(); }
    if (k === 'import') {
      const f = e.target.files[0]; if (!f) return;
      f.text().then((t) => { ET.importData(t); toast('הגיבוי שוחזר ✓'); setTimeout(() => location.reload(), 600); }).catch(() => toast('הקובץ לא תקין'));
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && RT.sheet) { RT.sheet = null; renderSheet(); } });
  window.addEventListener('hashchange', () => { Speech.stop(); RT.reading = false; RT.sheet = null; RT.confirmReset = false; render(); window.scrollTo(0, 0); });
  window.addEventListener('online', () => { RT.online = true; render(); ET.SyncProvider.sync(); });
  window.addEventListener('offline', () => { RT.online = false; render(); });
  if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

  /* study-time tracker: counts active time on learning screens */
  const LEARN_ROUTES = new Set(['session', 'story', 'chat', 'quiz', 'game', 'real', 'cat', 'dict', 'mywords', 'mystory']);
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((ev) => addEventListener(ev, () => { RT.lastInput = Date.now(); }, { passive: true }));
  setInterval(() => {
    if (document.visibilityState !== 'visible' || !S.onboarded) return;
    if (!LEARN_ROUTES.has(parse().name) || Date.now() - RT.lastInput > 90e3) return;
    ET.today().sec += 10; ET.save();
  }, 10000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') ET.save(true); });

  /* offline support */
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      RT.swReg = reg;
      const conn = navigator.connection;
      if (S.profile.autoWifi && RT.online && !(conn && (conn.type === 'cellular' || conn.saveData))) reg.update().catch(() => {});
    }).catch(() => {});
  }

  render();
})();
