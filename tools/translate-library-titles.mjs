/* Adds a Hebrew translation (titleHe) to every reading-library article that has none yet (data/library/index.json).
   Runs in the daily content job, so articles imported later get theirs on the next run. Free Gemini, 40 titles a call (a long answer from a busy model can time out); a failed batch is retried, then skipped. */
import fs from 'node:fs';
import { gemini, hasGemini } from './gemini.mjs';

const FILE = 'data/library/index.json';
if (!hasGemini() || !fs.existsSync(FILE)) { console.log('library titles: skipped'); process.exit(0); }
const index = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const todo = index.articles.filter((a) => !a.titleHe);
const hebrew = (s) => typeof s === 'string' && /[֐-׿]/.test(s) && !/[^֐-׿\s\d.,:;!?%"'״׳()\-–—/&$€£]/.test(s.replace(/[A-Za-z]/g, ''));
let done = 0;
let fails = 0;
for (let i = 0; i < todo.length; i += 40) {
  const part = todo.slice(i, i + 40);
  for (let attempt = 1; attempt <= 2; attempt++) try {
    const res = await gemini('You translate English news headlines into natural, short Hebrew headlines for Hebrew speakers.',
      `Translate each headline into natural Hebrew (a headline, not a word-by-word translation; keep names, numbers and % as they are).
${part.map((a, k) => `${k + 1}. ${a.title}`).join('\n')}
Return ONLY JSON: {"items": {"<number>": "<Hebrew headline>"}}`);
    for (const [k, he] of Object.entries((res && res.items) || {})) {
      const a = part[+k - 1];
      if (a && hebrew(he) && he.length <= 160) { a.titleHe = he.trim(); done++; }
    }
    break;
  } catch (e) {
    console.warn(`library titles batch ${i / 40 + 1} failed (attempt ${attempt}):`, e.message);
    if (attempt === 2 && ++fails >= 3) i = todo.length; // the AI is down: stop, the next run continues
  }
}
if (done) fs.writeFileSync(FILE, JSON.stringify(index));
console.log(`library titles: +${done} · ${index.articles.filter((a) => !a.titleHe).length} still without a translation`);
