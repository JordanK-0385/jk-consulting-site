/*
 * LE FIL NE DOIT CROISER AUCUN TEXTE.
 *
 * Le fil conducteur est une pastille en position fixe qui traverse toute la
 * page. Rien dans le code ne l'empêche de passer sur un titre : c'est une
 * propriété qu'on ne peut que MESURER, en balayant le défilement et en
 * comparant sa boîte à celle de chaque feuille de texte visible.
 *
 * Deux défauts de ce contrôle ont laissé passer une collision réelle, et sont
 * corrigés ici :
 *
 *  - il tournait en DESKTOP par défaut. Le viewport était un argument, et
 *    toutes les passes de régression l'ont appelé sans argument. L'arc mobile
 *    n'a jamais été balayé, et il traversait « Voyons un agent s'installer »
 *    sur 96px de défilement. Les deux viewports tournent donc en une passe,
 *    sans qu'on ait à y penser.
 *
 *  - le pas valait 60px. Une fenêtre de collision de 96px n'y donnait qu'un
 *    échantillon : le défaut existait, mais au bord du sous-échantillonnage.
 *    À 24px elle en donne quatre.
 *
 * Et il ne signalait rien à l'appelant. Il sort maintenant en échec, pour
 * qu'un futur arc qui croise un texte fasse tomber `npm run check` tout seul.
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

/* Assez fin pour qu'une fenêtre de collision courte donne plusieurs
   échantillons. La charnière méthode -> workflow en fait 96px. */
const PAS = 24;

/* Les deux bouts de la plage : le repli mobile et le desktop. Les deux, en
   une passe — c'est le défaut qui a laissé passer la collision. */
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 390,  height: 844 },
];

const navigateur = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {});

const echecs = [], ok = [];

for (const vp of VIEWPORTS){
  const ctx = await navigateur.newContext({ viewport: vp });
  const p = await ctx.newPage();
  await p.goto(URL_BASE, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);

  const hauteur = await p.evaluate(() => document.documentElement.scrollHeight);
  const parTexte = {};

  for (let y = 0; y <= hauteur - vp.height; y += PAS){
    await p.evaluate(v => scrollTo({ top: v, behavior: 'instant' }), y);
    await p.waitForTimeout(24);
    const croisements = await p.evaluate(() => {
      const t = document.querySelector('.thread-token');
      if (!t) return [];
      const cs = getComputedStyle(t);
      if (cs.visibility !== 'visible' || +cs.opacity < 0.05) return [];
      const d = document.querySelector('.thread-dot');
      if (!d) return [];
      const q = d.getBoundingClientRect();
      if (!q.width) return [];
      const x = q.left + q.width / 2, cy = q.top + q.height / 2, r = q.width / 2;

      const trouves = [];
      for (const el of document.querySelectorAll('h1,h2,h3,h4,p,li,a,span,summary')){
        if (el.children.length) continue;               // feuilles seulement
        if (!el.textContent.trim()) continue;
        if (el.closest('[aria-hidden="true"]')) continue;
        /* Le fil est CENSÉ toucher ce texte : il est le point du « ? » de la
           charnière, et c'est tout le geste. Une exemption nommée, portée par
           le balisage, plutôt qu'une géométrie qui l'éviterait par hasard —
           le contrôle reste ainsi vrai partout ailleurs. */
        if (el.closest('[data-fil-contact]')) continue;
        /* Opacité CUMULÉE : un parent effacé rend la feuille invisible même si
           sa propre opacité vaut 1. Sans ça on signale du faux — le .hero de
           la landing, effacé par son conteneur pendant la condensation. */
        let op = 1, cache = false;
        for (let n = el; n && n !== document.body; n = n.parentElement){
          const c = getComputedStyle(n);
          if (c.visibility === 'hidden' || c.display === 'none'){ cache = true; break; }
          op *= +c.opacity;
        }
        if (cache || op < 0.15) continue;
        const b = el.getBoundingClientRect();
        if (!b.width || !b.height) continue;
        if (x + r > b.left && x - r < b.right && cy + r > b.top && cy - r < b.bottom){
          const sec = el.closest('section');
          trouves.push({
            cle: `${sec ? sec.id : '?'} › ${el.tagName.toLowerCase()}`
               + ` «${el.textContent.trim().slice(0, 32)}»`,
            detail: `boîte ${Math.round(b.left)}..${Math.round(b.right)}`
                  + ` × ${Math.round(b.top)}..${Math.round(b.bottom)}`
                  + ` | fil ${Math.round(x)},${Math.round(cy)} r=${r.toFixed(1)}`,
          });
        }
      }
      return trouves;
    });
    for (const c of croisements){
      (parTexte[c.cle] ||= { n: 0, de: y, a: y, detail: c.detail });
      parTexte[c.cle].n++;
      parTexte[c.cle].a = y;
    }
  }

  const cles = Object.keys(parTexte).sort();
  const nom = `${vp.width}x${vp.height}`;
  if (!cles.length){
    ok.push(`${nom} : le fil ne croise aucun texte (${Math.ceil((hauteur - vp.height) / PAS)} échantillons, pas ${PAS}px)`);
  } else {
    for (const k of cles){
      const t = parTexte[k];
      echecs.push(`${nom} : ${k} — ${t.n} échantillon(s), scrolls ${t.de} à ${t.a} [${t.detail}]`);
    }
  }
  await ctx.close();
}

await navigateur.close();
serveur.close();

console.log('Croisements du fil conducteur\n');
for (const o of ok) console.log(`  OK     ${o}`);
for (const e of echecs) console.log(`  ECHEC  ${e}`);
console.log(`\n${ok.length} réussi(s), ${echecs.length} échec(s)`);
process.exit(echecs.length ? 1 : 0);
