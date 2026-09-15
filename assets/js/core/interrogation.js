/*
 * LE « ? » DE LA CHARNIÈRE — la boucle s'aligne sur la bille.
 *
 * Le point du « ? » n'est pas dessiné. C'est la bille du fil conducteur, qui
 * se trouve déjà là : elle naît sur l'axe du rail et y attend. On n'aligne
 * donc pas la bille sur un cercle — on aligne LA BOUCLE sur la bille.
 *
 * L'ordre importe. Poser un cercle puis y amener le fil aurait fait deux
 * objets superposés dont l'un s'éteint quand l'autre part : un relais, comme
 * celui de la couture 2, avec la même dérive au bout. Ici la revendication du
 * fil n'est pas touchée du tout, et le delta X de la descente reste nul par
 * construction — il n'y a rien à réaligner, l'effet ne fait qu'habiller au
 * repos un point déjà sur l'axe.
 *
 * Même rôle que core/naissance.js et core/entree-process.js : le paramètre que
 * deux choses doivent partager — ici le balisage SVG et le module qui le pose —
 * ne vit dans aucun des deux.
 */

import { ancrageEtincelle } from './naissance.js';

/*
 * GÉOMÉTRIE DU GLYPHE, en em.
 *
 * Relevée dans le fichier de police lui-même (Space Grotesk latin, instancié
 * à wght=700, 1000 unités par em) : chasse 578, boucle x 34..536 y 230..714,
 * point centre (279, 81) rayon 95. Recoupée indépendamment par balayage de
 * pixels sur un rendu canvas à 400px, qui donne 0.5780 / 0.2787 / 0.1900 —
 * les deux méthodes concordent à 3 millièmes d'em près.
 *
 * En em et non en pixels : c'est la seule forme qui survit au changement de
 * corps entre le desktop et le repli.
 */
export const CHASSE  = 0.578;
export const POINT_D = 0.190;   // diamètre du point

/* Position du centre du point depuis le coin HAUT-GAUCHE du SVG, dont le
   viewBox « 0 -714 578 728 » embrasse la boucle et le point. C'est ce couple
   que le module de pose utilise : il n'a pas à connaître la ligne de base. */
export const POINT_DX = 0.279;
export const POINT_DY = 0.633;

/*
 * L'HORLOGE, unique : la progression du landing.
 *
 * L'écriture commence avec la condensation du bureau et s'achève quand il se
 * pose sur le rail — c'est-à-dire à la fin de sa dérive, juste avant que la
 * bille ne s'allume. Le texte s'écrit donc dans le sillage du bureau, et le
 * dernier caractère est posé à l'instant où l'étincelle naît.
 *
 * Les bornes sont celles des fenêtres du landing : CONDENSE[0] et DERIVE[1].
 * RATTRAPE est l'instant où le bord d'écriture rejoint le meneur ; avant, il
 * le rattrape, après il le suit exactement. Mesuré : le meneur reste immobile
 * à x=721 jusqu'à 0.62, puis file de 720 à 1170 en desktop, de 195 à 47 en
 * repli mobile.
 */
export const ECRITURE = [0.40, 0.87];
export const RATTRAPE = 0.62;

/**
 * Où poser le point — donc où aligner la boucle.
 * La même ancre que le landing et la méthode revendiquent : le centre de
 * #methode .line, à la hauteur où le bureau s'éteint.
 *
 * @returns {{x:number, y:number}|null} null si la méthode n'est pas là.
 */
export function ancragePoint(){
  return ancrageEtincelle();
}
