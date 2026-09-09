/*
 * LE DOCKING — le rythme du fil.
 *
 * AMELIORATIONS §2 : « le token ralentit en arrivant sur un nœud, le nœud
 * pulse une fois, puis il repart ». Une micro-pause par étape, pas une
 * descente uniforme.
 *
 * Ce n'est pas un effet visuel mais une déformation du temps : on remplace
 * la correspondance linéaire scroll -> position par une courbe qui s'aplatit
 * au voisinage de chaque nœud. Le token passe par chaque nœud exactement au
 * même endroit du scroll qu'avant — seule son allure change entre deux.
 */

import { clamp01 } from './color.js';

/* Lissage de Perlin : dérivée nulle aux deux extrémités, donc arrivée et
   départ progressifs de part et d'autre de chaque nœud. */
const smoother = t => t * t * t * (t * (t * 6 - 15) + 10);

/**
 * Fabrique une fonction de docking.
 *
 * @param {number[]} stops  positions des nœuds, en fractions de 0 à 1
 * @param {number} [strength] 0 = descente linéaire, 1 = docking pleinement marqué
 * @returns {(p:number) => number} progression remodelée, monotone et bornée
 */
export function makeDock(stops, strength = 0.85){
  /* Les bornes 0 et 1 encadrent les nœuds : le fil ralentit aussi en entrant
     et en sortant, pas seulement au milieu. */
  const anchors = [0, ...stops, 1]
    .filter(v => v >= 0 && v <= 1)
    .sort((a, b) => a - b)
    .filter((v, i, a) => i === 0 || v - a[i - 1] > 1e-6);

  return p => {
    const x = clamp01(p);
    let i = 0;
    while (i < anchors.length - 2 && x > anchors[i + 1]) i++;
    const a = anchors[i], b = anchors[i + 1];
    if (b - a < 1e-6) return x;
    const f = (x - a) / (b - a);
    return a + (f + (smoother(f) - f) * strength) * (b - a);
  };
}

/**
 * Proximité d'un nœud, pour la pulsation visuelle : 1 quand le fil est
 * dessus, 0 au-delà du rayon.
 */
export const dockNearness = (distance, radius) => clamp01(1 - Math.abs(distance) / radius);
