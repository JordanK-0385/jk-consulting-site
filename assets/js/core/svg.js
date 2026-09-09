/* Fabrique SVG partagée.
   `mk`, `poly`, `roundPath` et la projection isométrique étaient
   dupliqués à l'identique dans les protos 1, 3 et 4. */

export const NS = 'http://www.w3.org/2000/svg';

/** Crée un élément SVG avec ses attributs. */
export function mk(tag, attrs){
  const el = document.createElementNS(NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

/** Sérialise une liste de points [x,y] en attribut `points`. */
export const points = (...pts) => pts.map(p => p.join(',')).join(' ');

/** Polygone plein, ajouté au parent. */
export function poly(parent, fill, pts, extra){
  const el = mk('polygon', { points: pts, fill, ...(extra || {}) });
  parent.appendChild(el);
  return el;
}

/**
 * Polygone à coins arrondis (rayon `r`), ajouté au parent.
 * Chaque sommet devient une courbe quadratique — c'est ce qui donne
 * aux plateaux et tapis leur aspect « mascotte arrondie » de SPECS §2.
 */
export function roundPath(parent, pts, r, fill, extra){
  const n = pts.length;
  const towards = (from, to, dist) => {
    const dx = to[0] - from[0], dy = to[1] - from[1];
    const len = Math.hypot(dx, dy) || 1;
    return [from[0] + dx / len * dist, from[1] + dy / len * dist];
  };
  let d = '';
  for (let i = 0; i < n; i++){
    const cur  = pts[i];
    const prev = pts[(i - 1 + n) % n];
    const next = pts[(i + 1) % n];
    const a = towards(cur, prev, r);
    const b = towards(cur, next, r);
    d += (i === 0 ? `M ${a[0]} ${a[1]}` : ` L ${a[0]} ${a[1]}`)
       + ` Q ${cur[0]} ${cur[1]} ${b[0]} ${b[1]}`;
  }
  const el = mk('path', { d: d + ' Z', fill, ...(extra || {}) });
  parent.appendChild(el);
  return el;
}

/**
 * Fabrique une projection isométrique.
 * Les protos 1 et 4 utilisent la même maille (tw/th/hu) mais des
 * origines différentes — d'où la fabrique plutôt qu'une constante.
 *
 * @returns {(gx:number, gy:number, gz?:number) => [number, number]}
 */
export function makeIso({ cx, cy, tw = 150, th = 75, hu = 50 }){
  return (gx, gy, gz = 0) => [
    cx + (gx - gy) * tw / 2,
    cy + (gx + gy) * th / 2 - gz * hu,
  ];
}
