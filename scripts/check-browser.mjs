/*
 * Contrôles dans un vrai navigateur.
 * Reprend les vérifications qui ont attrapé les défauts pendant l'assemblage :
 * erreurs console, débordement, contraste, accessibilité, mouvement réduit.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const TYPES = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript',
                '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg' };

const serveur = createServer(async (q, r) => {
  let f = join(process.cwd(), decodeURI(q.url.split('?')[0]));
  if (f.endsWith('/')) f = join(f, 'index.html');
  try {
    const d = await readFile(f);
    r.writeHead(200, { 'Content-Type': TYPES[extname(f)] ?? 'text/plain' });
    r.end(d);
  } catch { r.writeHead(404); r.end(); }
});
await new Promise(res => serveur.listen(0, res));
const URL_BASE = `http://127.0.0.1:${serveur.address().port}/`;

const echecs = [], ok = [];
const verifier = (t, c, d = '') => c ? ok.push(t) : echecs.push(`${t}${d ? ` — ${d}` : ''}`);

/* En CI, Playwright installe le navigateur qu'il attend. En local, on peut
   pointer un Chromium déjà présent via PLAYWRIGHT_CHROMIUM_PATH — utile pour
   contrôler la suite avec la version exacte du lockfile sans retélécharger. */
const navigateur = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {});

/* --- 1. parcours complet : aucune erreur, aucune requête en échec --- */
for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]){
  const ctx = await navigateur.newContext({ viewport: vp });
  const p = await ctx.newPage();
  const erreurs = [], tierces = [];
  /* On ne fait échouer la CI que sur ce qui relève du site. Une panne de
     Google Fonts n'est pas une régression de notre code et ne doit pas
     bloquer une fusion — elle est signalée, pas sanctionnée. */
  const estTierce = u => !u.startsWith(URL_BASE);
  p.on('pageerror', e => erreurs.push(e.message));
  p.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    (/fonts\.(googleapis|gstatic)\.com|ERR_CONNECTION|ERR_NAME_NOT_RESOLVED/.test(t) ? tierces : erreurs).push(t);
  });
  p.on('requestfailed', r => (estTierce(r.url()) ? tierces : erreurs)
    .push(`requête échouée : ${r.url()}`));
  await p.goto(URL_BASE, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);

  const max = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  let debordement = 0;
  for (let y = 0; y <= max; y += Math.round(vp.height * 0.6)){
    await p.evaluate(v => scrollTo({ top: v, behavior: 'instant' }), y);
    await p.waitForTimeout(40);
    debordement = Math.max(debordement, await p.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth));
  }
  verifier(`${vp.width}px : aucune erreur au parcours complet`, !erreurs.length,
    [...new Set(erreurs)].slice(0, 3).join(' | '));
  if (tierces.length) console.log(`  note   ${vp.width}px : ${new Set(tierces).size} ressource(s) tierce(s) indisponible(s) — non bloquant`);
  verifier(`${vp.width}px : aucun débordement horizontal`, debordement === 0, `${debordement}px`);
  await ctx.close();
}

/* --- 2. les sept jalons sont exposés aux technologies d'assistance --- */
{
  const ctx = await navigateur.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(URL_BASE, { waitUntil: 'networkidle' });
  /* On vérifie le mécanisme lui-même plutôt qu'une capture d'arbre : les
     sept jalons sont dans le DOM, aucun ancêtre ne les masque aux
     technologies d'assistance, et l'écho visuel est bien marqué
     aria-hidden pour ne pas doubler l'annonce. Aucune API spécifique à une
     version de Playwright n'intervient. */
  const a11y = await p.evaluate(() => {
    const masque = el => {
      for (let e = el; e; e = e.parentElement){
        const cs = getComputedStyle(e);
        if (e.getAttribute?.('aria-hidden') === 'true') return 'aria-hidden';
        if (cs.display === 'none') return 'display:none';
        if (cs.visibility === 'hidden') return 'visibility:hidden';
        if (e.hasAttribute?.('hidden')) return 'hidden';
      }
      return null;
    };
    const items = [...document.querySelectorAll('#workflow .steps-source > li')];
    return {
      total: items.length,
      masques: items.map(li => masque(li)).filter(Boolean),
      complets: items.filter(li =>
        li.querySelector('h3')?.textContent.trim() &&
        li.querySelector('.lead')?.textContent.trim() &&
        li.querySelector('.detail')?.textContent.trim()).length,
      echoMasque: document.querySelector('#workflow .milestone')?.getAttribute('aria-hidden') === 'true'
               && document.querySelector('#workflow .governance')?.getAttribute('aria-hidden') === 'true',
    };
  });
  verifier(`${a11y.total} jalons exposés aux technologies d'assistance`,
    a11y.total === 7 && !a11y.masques.length && a11y.complets === 7,
    a11y.masques.length ? `masqués par ${[...new Set(a11y.masques)].join(', ')}`
                        : `${a11y.complets}/7 complets`);
  verifier('écho visuel du workflow marqué aria-hidden', a11y.echoMasque);

  /* hiérarchie des titres, sans saut de niveau */
  const sauts = await p.evaluate(() => {
    const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')];
    let prev = 0, n = 0;
    for (const h of hs){ const l = +h.tagName[1]; if (prev && l > prev + 1) n++; prev = l; }
    return n;
  });
  verifier('hiérarchie des titres sans saut de niveau', sauts === 0, `${sauts} saut(s)`);
  await ctx.close();
}

/* --- 3. contraste des textes sur fond clair --- */
{
  const ctx = await navigateur.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(URL_BASE, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const faibles = await p.evaluate(() => {
    const lum = c => { const [r,g,b] = c.map(v => { v/=255;
      return v <= 0.03928 ? v/12.92 : ((v+0.055)/1.055)**2.4; });
      return 0.2126*r + 0.7152*g + 0.0722*b; };
    const parse = s => (s.match(/[\d.]+/g) || [0,0,0]).slice(0,3).map(Number);
    const ratio = (f, b) => { const a = lum(parse(f)), c = lum(parse(b));
      const [hi, lo] = a > c ? [a, c] : [c, a]; return (hi + 0.05) / (lo + 0.05); };
    const fond = el => { let e = el;
      while (e){ const bg = getComputedStyle(e).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)') return bg; e = e.parentElement; }
      return 'rgb(255,255,255)'; };
    const out = [];
    for (const sec of document.querySelectorAll('.on-light')){
      for (const el of sec.querySelectorAll('p,h2,h3,a,summary,cite,span')){
        if (!el.textContent.trim() || el.children.length) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        const taille = parseFloat(cs.fontSize);
        const grand = taille >= 24 || (taille >= 18.66 && +cs.fontWeight >= 700);
        const r = ratio(cs.color, fond(el));
        if (r < (grand ? 3 : 4.5)) out.push(`${el.tagName}.${(el.className+'').split(' ')[0]} ${r.toFixed(2)}`);
      }
    }
    return out;
  });
  verifier('contraste AA sur toutes les sections claires', !faibles.length,
    [...new Set(faibles)].slice(0, 5).join(', '));
  await ctx.close();
}

/* --- 4. cibles tactiles et mouvement réduit --- */
{
  const ctx = await navigateur.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await p.goto(URL_BASE, { waitUntil: 'networkidle' });
  const petites = await p.evaluate(() =>
    [...document.querySelectorAll('a[href],button,summary')].map(e => {
      const b = e.getBoundingClientRect();
      return { n: e.textContent.trim().slice(0, 22), w: Math.round(b.width), h: Math.round(b.height) };
    }).filter(x => x.w && x.h && (x.w < 44 || x.h < 44)));
  verifier('aucune cible tactile sous 44px', !petites.length,
    petites.map(x => `${x.n} ${x.w}x${x.h}`).join(', '));
  await ctx.close();
}
{
  const ctx = await navigateur.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.goto(URL_BASE, { waitUntil: 'networkidle' });
  const bouge = await p.evaluate(async () => {
    const s = document.querySelector('#landing .scene');
    scrollTo({ top: 400, behavior: 'instant' });
    await new Promise(r => setTimeout(r, 300));
    const a = s.getAttribute('transform');
    await new Promise(r => setTimeout(r, 700));
    return a !== s.getAttribute('transform');
  });
  verifier('mouvement réduit : la scène reste figée', !bouge);
  await ctx.close();
}

await navigateur.close();
serveur.close();

console.log('Contrôles navigateur\n');
for (const o of ok) console.log(`  OK     ${o}`);
for (const e of echecs) console.log(`  ECHEC  ${e}`);
console.log(`\n${ok.length} réussi(s), ${echecs.length} échec(s)`);
process.exit(echecs.length ? 1 : 0);
