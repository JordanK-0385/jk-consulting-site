/*
 * PRÉFÉRENCE DE MOUVEMENT — source de vérité unique.
 *
 * Constat de l'audit : les protos déclaraient `const reduce = matchMedia(...)`
 * puis ne s'en servaient pas (protos 1 et 4) ou seulement pour les paquets
 * `animateMotion` (proto 3). Couper les `@keyframes` CSS ne suffisait donc pas :
 * les blobs pulsaient, les satellites orbitaient, les motes volaient.
 *
 * Le principe ici :
 *   - le mouvement AMBIANT (autonome, non sollicité) est gelé sur une pose
 *     statique lisible, via `ambientTime()` ;
 *   - le mouvement PILOTÉ PAR LE SCROLL reste vivant : l'utilisateur garde
 *     le contrôle de ce qu'il déclenche lui-même.
 */

const query = matchMedia('(prefers-reduced-motion: reduce)');
const listeners = new Set();

let reduced = query.matches;

/**
 * Pose statique de référence.
 *
 * Les scènes animent via `Math.sin(now * f)` / `Math.cos(now * f)`. À t = 0 les
 * sinus valent 0 (décalages neutres) et les pulsations de la forme
 * `1 + Math.sin(...) * k` valent 1 (échelle au repos). C'est donc le cadrage
 * neutre de toutes les scènes, sans avoir à écrire une pose par section.
 */
const STATIC_POSE = 0;

function apply(){
  document.documentElement.classList.toggle('reduced-motion', reduced);
}

query.addEventListener('change', event => {
  reduced = event.matches;
  apply();
  for (const fn of listeners) fn(reduced);
});

apply();

/** L'utilisateur a-t-il demandé moins de mouvement ? */
export const prefersReducedMotion = () => reduced;

/**
 * Horloge du mouvement ambiant. Les sections passent `now` de la boucle rAF
 * et récupèrent une pose figée si la préférence est active.
 */
export const ambientTime = now => reduced ? STATIC_POSE : now;

/**
 * S'abonne aux changements de préférence à chaud (l'utilisateur peut basculer
 * le réglage système sans recharger la page).
 * @returns {() => void} désabonnement
 */
export function onMotionPreferenceChange(fn){
  listeners.add(fn);
  return () => listeners.delete(fn);
}
