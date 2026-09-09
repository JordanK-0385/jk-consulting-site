/* Progression de scroll normalisée. */

import { clamp01 } from './color.js';

/**
 * Progression 0→1 d'une section immersive (conteneur haut + enfant sticky).
 *
 * 0 quand le haut de la section atteint le haut du viewport,
 * 1 quand son bas l'atteint. Le calcul est relatif au viewport, il reste
 * donc valable où que la section se trouve dans la page — c'est ce qui
 * permet de réutiliser les protos tels quels dans un document long.
 */
export function stickyProgress(el){
  const travel = el.offsetHeight - window.innerHeight;
  if (travel <= 0) return 0;
  return clamp01(-el.getBoundingClientRect().top / travel);
}

/**
 * Progression d'une section éditoriale (flux normal), mesurée à la ligne
 * médiane du viewport. Utilisée par la timeline de la section 2 : un jalon
 * s'allume quand il croise le milieu de l'écran, pas quand il entre.
 */
export function midlineProgress(el){
  const rect = el.getBoundingClientRect();
  if (rect.height <= 0) return 0;
  return clamp01((window.innerHeight * 0.5 - rect.top) / rect.height);
}
