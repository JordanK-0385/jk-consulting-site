/*
 * LE FIL NE QUITTE PAS L'AXE DU RAIL PENDANT LA DESCENTE.
 *
 * C'est l'invariant de la charnière landing -> méthode : le bureau meurt sur
 * l'axe, l'étincelle y naît, le titre y pose le point de son « ? », et le fil
 * descend vers Diagnostic sans jamais s'en écarter. Tout mouvement latéral y
 * est la dérive qu'on a supprimée trois fois.
 *
 * Il ne s'agit pas de zéro partout : EN SORTIE de section le fil balaie
 * volontairement du rail vers l'axe du process — 450px en 1440x900, 148px en
 * 390x844. Le contrôle sépare donc les deux régimes par la géométrie de la
 * section, et vérifie les DEUX : l'axe tenu pendant la descente, et le
 * balayage bien présent ensuite.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI CE FICHIER EXISTE, ET CE QU'IL GARDE
 *
 * Sa première version vivait hors du dépôt et comportait une faute : elle
 * lisait `dot.left` sur l'ÉLÉMENT au lieu de son rect. `undefined` donne
 * `NaN`, `Math.abs(NaN) > max` est faux, et le maximum restait à sa valeur
 * initiale. Elle a donc rapporté « delta X = 0.00px » trois fois de suite
 * sans rien mesurer du tout.
 *
 * La leçon n'est pas « lire le bon champ » — c'est qu'une assertion de la
 * forme « l'écart reste petit » est TOUJOURS satisfaite par un instrument qui
 * n'observe rien. Le zéro d'une absence de mesure est indiscernable du zéro
 * d'un invariant tenu. D'où les deux gardes, qui valent plus que le test :
 *
 *   - le contrôle exige un nombre minimal d'échantillons exploitables, et
 *     toute valeur non finie l'interrompt au lieu d'être avalée par une
 *     comparaison ;
 *   - il exige de VOIR le balayage de sortie, dont on sait qu'il existe.
 *
 * Vérifié en le cassant exprès. Ancre décalée de 40px : « tient l'axe »
 * échoue à 40.01px sur les deux viewports. Ancre à NaN : le navigateur rejette
 * la transformation, le fil reste à l'origine, et l'écart explose à 1170px —
 * pris par le test lui-même, pas par la garde. Fil rendu invisible : « tient
 * l'axe » PASSE, à 0.00px, et seules les deux gardes rattrapent — 0 échantillon
 * et 0px de balayage. C'est ce dernier cas qui décrit exactement la panne
 * d'origine, et c'est pour lui que les gardes existent.
 * ---------------------------------------------------------------------------
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

/* Tolérance : le fil et le trait sont deux boîtes distinctes, dont les
   largeurs varient (le rayon du fil respire à l'accostage). Un demi-pixel
   d'arrondi de centrage n'est pas une dérive. */
const TOLERANCE = 0.5;
/* La DESCENTE, c'est avant que le couloir de sortie ne se dégage. Le quai s'y
   fige à section.bottom = 978 en 1440x900 et 866 en 390x844 : une borne à
   1.15 écran passe franchement au-dessus des deux. */
const DESCENTE = 1.15;
/* Amplitude minimale attendue du balayage de sortie. Bien en dessous des 148px
   du repli : on vérifie que le geste EXISTE, pas sa valeur. */
const BALAYAGE_MIN = 100;

const PAS = 15;
const VIEWPORTS = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];

const navigateur = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {});

const echecs = [], ok = [];
const verifier = (t, c, d = '') => c ? ok.push(t) : echecs.push(`${t}${d ? ` — ${d}` : ''}`);

for (const vp of VIEWPORTS){
  const ctx = await navigateur.newContext({ viewport: vp });
  const p = await ctx.newPage();
  await p.goto(URL_BASE, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);

  const nom = `${vp.width}x${vp.height}`;
  const bas = await p.evaluate(() =>
    document.querySelector('#methode').getBoundingClientRect().bottom + scrollY);

  let ecartDescente = 0, pireScroll = null, balayage = 0, mesures = 0, invalide = null;

  for (let y = 200; y <= bas - 0.3 * vp.height; y += PAS){
    await p.evaluate(v => scrollTo({ top: v, behavior: 'instant' }), y);
    await p.waitForTimeout(16);
    const e = await p.evaluate(() => {
      const t = document.querySelector('.thread-token');
      if (!t) return null;
      const cs = getComputedStyle(t);
      if (cs.visibility === 'hidden' || +cs.opacity < 0.05) return null;
      const d = document.querySelector('.thread-dot');
      const l = document.querySelector('#methode .line');
      const s = document.querySelector('#methode');
      if (!d || !l || !s) return null;
      const rd = d.getBoundingClientRect(), rl = l.getBoundingClientRect();
      if (!rd.width || !rl.width) return null;
      return { dx: (rd.left + rd.width / 2) - (rl.left + rl.width / 2),
               basSection: s.getBoundingClientRect().bottom };
    });
    if (!e) continue;
    /* GARDE 1 : une valeur non finie est un échec, jamais un zéro. */
    if (!Number.isFinite(e.dx) || !Number.isFinite(e.basSection)){
      invalide = `valeur non finie au scroll ${y}`;
      break;
    }
    mesures++;
    const a = Math.abs(e.dx);
    if (e.basSection > DESCENTE * vp.height){
      if (a > ecartDescente){ ecartDescente = a; pireScroll = y; }
    } else if (a > balayage) balayage = a;
  }

  verifier(`${nom} : mesures exploitables`, !invalide && mesures > 50,
    invalide ?? `${mesures} échantillon(s)`);
  verifier(`${nom} : le fil tient l'axe du rail pendant la descente`,
    !invalide && ecartDescente <= TOLERANCE,
    `écart maximal ${ecartDescente.toFixed(2)}px${pireScroll ? ` au scroll ${pireScroll}` : ''}`);
  /* GARDE 2 : sans balayage visible, le contrôle n'a rien observé du tout. */
  verifier(`${nom} : le balayage de sortie est bien observé`,
    !invalide && balayage >= BALAYAGE_MIN, `amplitude ${balayage.toFixed(0)}px`);

  await ctx.close();
}

await navigateur.close();
serveur.close();

console.log("L'axe du fil\n");
for (const o of ok) console.log(`  OK     ${o}`);
for (const e of echecs) console.log(`  ECHEC  ${e}`);
console.log(`\n${ok.length} réussi(s), ${echecs.length} échec(s)`);
process.exit(echecs.length ? 1 : 0);
