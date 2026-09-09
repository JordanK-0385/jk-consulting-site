/* Utilitaires numériques et couleur.
   Dédupliqués des protos 1, 3 et 4 (définitions identiques). */

/** Borne une valeur dans [0,1]. */
export const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

/** Borne un canal dans [0,255] et le tronque. */
const channel = v => Math.max(0, Math.min(255, v | 0));

/** Progression normalisée de `p` sur l'intervalle [a,b], bornée. */
export const seg = (p, a, b) => clamp01((p - a) / (b - a));

/** Interpolation linéaire entre deux triplets RGB. */
export const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

/** `rgba()` depuis un triplet RGB. */
export const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

/** `rgb()` depuis un triplet RGB. */
export const rgb = c => `rgb(${channel(c[0])},${channel(c[1])},${channel(c[2])})`;

/** Éclaircit (f>1) ou assombrit (f<1) un triplet — faces des volumes iso. */
export const shade = (c, f) => rgb([c[0] * f, c[1] * f, c[2] * f]);

/** Ease-out cubique. */
export const easeOut = t => 1 - Math.pow(1 - t, 3);
