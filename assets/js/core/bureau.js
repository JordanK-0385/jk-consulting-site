/*
 * LA DALLE — un espace de travail, rendu au même endroit pour tout le site.
 *
 * Le récit s'ouvre sur un bureau qui se ramasse en étincelle et se ferme sur
 * un bureau qui se reconstruit dalle par dalle. Les deux doivent montrer LE
 * MÊME bureau, sinon la boucle ne se referme pas : on verrait deux plans
 * différents aux deux bouts du site.
 *
 * Ils avaient déjà divergé. Rendus séparément dans landing.js et liaison.js,
 * les dalles différaient sur tout — rayons 20/24 contre 14/16, trait 2.5
 * contre 2, opacité .95 contre .85, halo 7px/.9 contre 6px/.7.
 *
 * Un seul rendu ici, paramétré par le pas de la grille : les rayons suivent
 * la taille de la dalle, tout le reste est absolu, donc les deux plateaux se
 * ressemblent quelle que soit leur maille (4 unités à la landing sur une
 * grille 8×8, 2 unités à la liaison sur une grille 4×4 — même proportion).
 */

import { mk, roundPath } from './svg.js';
import { rgba } from './color.js';

/**
 * Dessine une dalle et retourne son groupe.
 *
 * @param {SVGElement} parent
 * @param {(gx:number, gy:number, gz?:number) => [number, number]} iso
 * @param {{gx:number, gy:number, taille:number, color:number[]}} spec
 */
export function dalle(parent, iso, { gx, gy, taille, color }){
  const g = mk('g', { class: 'dalle' });
  parent.appendChild(g);

  /* Le sol teinté est en retrait d'un dixième de la dalle : la bordure néon
     respire au lieu de le border. */
  const m = taille * 0.1;
  roundPath(g,
    [iso(gx + m, gy + m), iso(gx + taille - m, gy + m),
     iso(gx + taille - m, gy + taille - m), iso(gx + m, gy + taille - m)],
    7 * taille, rgba(color, .12));

  const bord = roundPath(g,
    [iso(gx, gy), iso(gx + taille, gy), iso(gx + taille, gy + taille), iso(gx, gy + taille)],
    8 * taille, 'none',
    { stroke: rgba(color, .85), 'stroke-width': '2', class: 'dalle-neon' });
  bord.style.filter = `drop-shadow(0 0 6px ${rgba(color, .7)})`;

  return { g, bord };
}
