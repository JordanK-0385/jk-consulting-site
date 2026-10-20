/*
 * LE FIL CONDUCTEUR — un seul token pour toute la page.
 *
 * AMELIORATIONS, principe directeur : « c'est un point que le décor traverse ».
 * Le token n'appartient donc à aucune section. C'est un élément unique, en
 * position fixe, créé une fois et jamais détruit.
 *
 * Chaque section, pendant son tick, REVENDIQUE le token : où il devrait être
 * à l'écran, à quoi il devrait ressembler, et avec quel poids elle le
 * possède en ce moment. Une passe post-sections mélange les revendications
 * et rend le résultat.
 *
 * C'est ce mélange qui produit la passerelle : à une couture, les deux
 * sections sont visibles et tickent toutes les deux (marge de 25% de
 * l'IntersectionObserver). La première fait décroître son poids pendant que
 * la seconde fait croître le sien, et le token traverse sans coupure — sans
 * code de cas particulier par frontière.
 *
 * Le token se place en coordonnées VIEWPORT (pixels, origine en haut à
 * gauche de l'écran). Chaque section convertit depuis son propre repère :
 * c'est le seul espace commun aux quatre systèmes de coordonnées du site.
 */

import { registerAfter } from './raf.js';
import { clamp01 } from './color.js';

const DEFAULTS = { radius: 8, color: [127, 227, 255], tail: 0, opacity: 1 };

/** Revendications de la frame en cours, vidées à chaque rendu. */
let claims = [];

let root = null, dot = null, tail = null;

function build(){
  root = document.createElement('div');
  root.className = 'thread-token';
  root.setAttribute('aria-hidden', 'true');

  tail = document.createElement('span');
  tail.className = 'thread-tail';

  dot = document.createElement('span');
  dot.className = 'thread-dot';

  root.append(tail, dot);
  document.body.appendChild(root);
}

/**
 * Revendique le token pour la frame en cours.
 *
 * @param {object} c
 * @param {number} c.x        position écran, en pixels
 * @param {number} c.y        position écran, en pixels
 * @param {number} [c.weight] 0 à 1 — à quel point la section possède le token
 * @param {number} [c.radius] rayon du point, en pixels
 * @param {number[]} [c.color] triplet RGB
 * @param {number} [c.tail]   longueur de la traîne, en pixels (0 = aucune)
 * @param {number} [c.opacity] opacité propre à la revendication
 */
export function claim(c){
  if (!c || !(c.weight ?? 1)) return;
  claims.push(c);
}

function render(){
  const pending = claims;
  claims = [];

  let total = 0;
  for (const c of pending) total += clamp01(c.weight ?? 1);

  if (total <= 0){
    root.style.visibility = 'hidden';
    return;
  }

  let x = 0, y = 0, radius = 0, tailLen = 0, alpha = 0;
  const rgb = [0, 0, 0];
  for (const c of pending){
    const w = clamp01(c.weight ?? 1) / total;
    x += c.x * w;
    y += c.y * w;
    radius  += (c.radius  ?? DEFAULTS.radius)  * w;
    tailLen += (c.tail    ?? DEFAULTS.tail)    * w;
    alpha   += (c.opacity ?? DEFAULTS.opacity) * w;
    const col = c.color ?? DEFAULTS.color;
    for (let i = 0; i < 3; i++) rgb[i] += col[i] * w;
  }

  const [r, g, b] = rgb.map(v => Math.round(v));
  root.style.visibility = 'visible';
  /* Le total borné sert d'opacité : une section qui ne revendique qu'à
     moitié fait apparaître ou disparaître le token en fondu. */
  root.style.opacity = clamp01(total) * clamp01(alpha);
  root.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  root.style.setProperty('--token-r', `${radius}px`);
  root.style.setProperty('--token-color', `${r}, ${g}, ${b}`);
  root.style.setProperty('--token-tail', `${tailLen}px`);
}

/* Une seule initialisation, au chargement du module. Tant qu'aucune section
   ne revendique, le token reste masqué et ne coûte rien. */
build();
registerAfter(render);
