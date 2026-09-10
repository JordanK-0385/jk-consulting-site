/*
 * LA DESCENTE DE L'AGENT, entre le nœud « En service » et le bureau.
 *
 * Le paramètre est ici, et non dans l'une des deux sections, parce que les
 * DEUX en dépendent : le workflow doit savoir quand cacher son agent, la
 * liaison quand révéler le sien et à quel rythme dessiner le sol. Chacune le
 * calcule depuis SA propre géométrie, sans connaître l'autre — la frontière
 * entre les deux sections est le bas du workflow ET le haut de la liaison,
 * c'est le même nombre.
 *
 * Le rendu de l'agent qui tombe, lui, ne peut PAS vivre dans une section :
 * les deux scènes sont des SVG dans des stages découpés, et un objet qui
 * traverse la frontière s'y fait raboter. Il est donc peint sur une couche
 * fixée au viewport, au-dessus des deux — le même mécanisme que le survol
 * vers les témoignages.
 */

import { clamp01 } from './color.js';

/* Fenêtre de la chute, en hauteurs d'écran de part et d'autre de la frontière.
   AVANT : le détachement commence quand la frontière est encore un écran plus
   bas, c'est-à-dire quand la scène du workflow commence à se décoller.
   APRÈS : l'atterrissage a lieu un demi-écran après la frontière. */
const AVANT = 1.00;
const APRES = 0.55;

/**
 * @param {number} frontiere  position écran de la frontière workflow/bureau
 *                            (bas du workflow, ou haut de la liaison)
 * @param {number} vh         hauteur du viewport
 * @returns {number} 0 au détachement, 1 à l'atterrissage
 */
export function descente(frontiere, vh){
  return clamp01((AVANT * vh - frontiere) / ((AVANT + APRES) * vh));
}

/**
 * ANCRE ÉCRAN D'UN OBJET, RAMENÉE AU REPÈRE DE SON STAGE COLLÉ.
 *
 * Les deux bouts de la chute vivent dans des scènes qui défilent encore : le
 * nœud file vers le haut avec le workflow qui se décolle, le bureau monte
 * encore par le bas. Interpoler entre deux ancres VIVANTES faisait remonter
 * l'agent au milieu de sa chute — il suivait ses repères au lieu de tomber.
 *
 * En retranchant le rectangle du stage on lit chaque ancre là où elle est
 * quand SON stage est collé : le départ tel qu'il était au détachement, et
 * l'arrivée telle qu'elle sera à l'atterrissage. Deux points fixes pendant
 * toute la traversée, et justes chacun à son instant — car à cet instant-là
 * le stage concerné est collé, et la correction vaut zéro.
 */
export function ancre(el){
  const m = el && el.getScreenCTM();
  if (!m) return null;
  const stage = el.closest('.stage');
  const r = stage ? stage.getBoundingClientRect() : { left: 0, top: 0 };
  return { x: m.e - r.left, y: m.f - r.top, u: Math.abs(m.d) };
}
