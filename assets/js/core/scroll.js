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
export function stickyProgress(el, palier = 0){
  /* `palier` : hauteur, en pixels, d'un temps mort en FIN de section pendant
     lequel la scène reste collée mais n'avance plus. La progression atteint 1
     à l'entrée du palier au lieu de l'atteindre au décollage — c'est ce qui
     permet à une scène de rester à l'écran, achevée et immobile, le temps
     qu'autre chose se joue par-dessus. */
  const travel = el.offsetHeight - window.innerHeight - palier;
  if (travel <= 0) return 0;
  return clamp01(-el.getBoundingClientRect().top / travel);
}
