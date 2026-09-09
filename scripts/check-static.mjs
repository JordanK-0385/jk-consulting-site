/*
 * Contrôles statiques, sans dépendance ni navigateur.
 * Encode les invariants que l'assemblage doit tenir.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const html = readFileSync('index.html', 'utf8');
const echecs = [];
const ok = [];
const verifier = (titre, condition, detail = '') =>
  condition ? ok.push(titre) : echecs.push(`${titre}${detail ? ` — ${detail}` : ''}`);

/* 1. Toutes les références locales existent sur le disque. */
{
  const refs = [...html.matchAll(/(?:href|src)="((?!https?:|#|mailto:|data:)[^"]+)"/g)].map(m => m[1]);
  const manquantes = refs.filter(r => !existsSync(join('.', r)));
  verifier(`${refs.length} références locales résolues`, !manquantes.length, manquantes.join(', '));
}

/* 2. Pas d'identifiant en double : c'était le premier risque de l'assemblage. */
{
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  const doubles = ids.filter((v, i) => ids.indexOf(v) !== i);
  verifier(`${ids.length} identifiants uniques`, !doubles.length, [...new Set(doubles)].join(', '));
}

/* 3. Chaque section porte un nom accessible qui pointe vers un titre réel. */
{
  const sections = [...html.matchAll(/<section[^>]*id="([^"]+)"[^>]*>/g)];
  const sans = sections.filter(([balise]) => !/aria-labelledby="([^"]+)"/.test(balise));
  const cassees = sections
    .map(([balise, id]) => [id, (balise.match(/aria-labelledby="([^"]+)"/) || [])[1]])
    .filter(([, cible]) => cible && !html.includes(`id="${cible}"`));
  verifier(`${sections.length} sections nommées`, !sans.length && !cassees.length,
    [...sans.map(s => s[1]), ...cassees.map(c => `${c[0]} -> ${c[1]} introuvable`)].join(', '));
}

/* 4. Emplacements réservés et bandeau d'alerte vont de pair.
      Si les faux témoignages restent, l'avertissement doit rester aussi. */
{
  const placeholders = (html.match(/data-placeholder/g) || []).length;
  const bandeau = html.includes('CONTENU FICTIF');
  verifier('bandeau « CONTENU FICTIF » cohérent avec les emplacements réservés',
    placeholders === 0 ? true : bandeau,
    `${placeholders} emplacement(s) sans bandeau`);
}

/* 5. Aucun nom réel dans un bloc marqué comme fictif. */
{
  const noms = /John Dalia|26 Academy/i;
  const blocs = [...html.matchAll(/<figure[^>]*data-placeholder[^>]*>([\s\S]*?)<\/figure>/g)];
  const fautifs = blocs.filter(b => noms.test(b[1]));
  verifier('aucun nom réel dans un emplacement réservé', !fautifs.length,
    `${fautifs.length} bloc(s) concerné(s)`);
}

/* 6. Les jalons du workflow restent la source unique lue par le module. */
{
  const jalons = (html.match(/<li data-tag="/g) || []).length;
  const js = readFileSync('assets/js/sections/workflow.js', 'utf8');
  const couleurs = (js.match(/const STEP_COLORS = \[([^\]]+)\]/) || [, ''])[1]
    .split(',').filter(s => s.trim()).length;
  verifier(`${jalons} jalons dans le balisage, autant de couleurs en code`,
    jalons > 0 && jalons === couleurs, `${jalons} contre ${couleurs}`);
}

/* 7. Aucun style en ligne : la CSP est servie sans 'unsafe-inline'. */
{
  const enLigne = (html.match(/\sstyle="/g) || []).length;
  verifier('aucun attribut style en ligne (CSP sans unsafe-inline)', enLigne === 0,
    `${enLigne} occurrence(s)`);
}

/* 8. vercel.json valide, et sa CSP cohérente avec ce que la page charge. */
{
  let conf = null;
  try { conf = JSON.parse(readFileSync('vercel.json', 'utf8')); } catch (e) { /* signalé plus bas */ }
  const csp = conf?.headers?.[0]?.headers?.find(h => h.key === 'Content-Security-Policy')?.value ?? '';
  const besoinGoogleFonts = html.includes('fonts.googleapis.com');
  verifier('vercel.json valide et CSP couvrant les polices',
    !!conf && (!besoinGoogleFonts || (csp.includes('fonts.googleapis.com') && csp.includes('fonts.gstatic.com'))));
}

/* 9. Les destinations de CTA encore à fournir sont signalées, pas oubliées. */
{
  const marques = (html.match(/data-cta-destination="à fournir"/g) || []).length;
  const ancresContact = (html.match(/href="#contact"/g) || []).length;
  verifier(`${marques} CTA marqué(s) « destination à fournir »`, marques > 0 || ancresContact === 0);
}

console.log('Contrôles statiques\n');
for (const o of ok) console.log(`  OK     ${o}`);
for (const e of echecs) console.log(`  ECHEC  ${e}`);
console.log(`\n${ok.length} réussi(s), ${echecs.length} échec(s)`);
process.exit(echecs.length ? 1 : 0);
