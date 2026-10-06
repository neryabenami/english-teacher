/* Small Gemini client for the daily tools (free tier). Google retires model names over time, so the stable Flash
   models on the key are listed at run time, newest first; a retired or overloaded model is dropped and the next one used. */
const KEY = process.env.GEMINI_API_KEY || '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let MODELS = null;
export const hasGemini = () => !!KEY;
export let geminiCalls = 0;

async function listModels() {
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': KEY } });
  const ok = r.ok ? ((await r.json()).models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map((m) => m.name.replace(/^models\//, ''))
    .filter((n) => /^gemini-[\d.]+-flash(-lite)?$/.test(n)) : [];
  const ver = (n) => parseFloat((n.match(/gemini-([\d.]+)/) || [0, 0])[1]);
  ok.sort((a, b) => (a.includes('lite') - b.includes('lite')) || ver(b) - ver(a));
  return [...new Set([process.env.GEMINI_MODEL, ...ok, 'gemini-flash-latest'].filter(Boolean))];
}

export async function gemini(system, user) {
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
      if (r.ok) {
        const j = await r.json();
        try { return JSON.parse(j.candidates[0].content.parts[0].text); } catch (e) { last = 'bad json'; continue; }
      }
      last = r.status + ' ' + (await r.text()).slice(0, 160);
      if (r.status === 429 || r.status >= 500) { await sleep(8000 * (a + 1)); continue; }
      break;
    }
    if (last === 'bad json' || /^4(00|01|03)\b/.test(last)) throw new Error('gemini ' + last);
    console.log(`model ${model} unavailable (${last.slice(0, 40)}), trying the next one`);
    MODELS.shift();
  }
  throw new Error('gemini: no model available');
}
