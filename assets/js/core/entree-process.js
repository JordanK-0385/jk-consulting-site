/*
 * LA COUTURE MÉTHODE -> WORKFLOW — l'entrée du fil dans le process.
 *
 * Des trois coutures du site, c'était la seule sans module partagé. La
 * méthode revendiquait le fil sur l'axe de son rail, le workflow sur l'ancre
 * de son process — deux abscisses distantes de 450px en 1440x900, de 148px en
 * 390x844 — et leurs fenêtres de poids se recouvraient. Le trajet entre les
 * deux n'était écrit nulle part : c'était le sous-produit du mélange de
 * thread.js, une dérive en diagonale avec un creux en Y.
 *
 * Ici, contrairement aux deux autres coutures, le mouvement latéral est VOULU :
 * le process est centré autour de son ancre, on ne le recentre pas. Ce qui est
 * partagé n'est donc pas une ancre commune mais LA CIBLE et L'INSTANT : la
 * méthode y conduit le fil par une trajectoire explicite, le workflow l'y
 * reprend. Quand les deux revendiquent la même chose au même moment, le
 * mélange ne déplace rien.
 */

/*
 * OÙ LE WORKFLOW PREND LE FIL, en fraction de son approche. Partagé parce que
 * les deux en dépendent : la méthode y termine son arc, le workflow y commence
 * sa revendication. Le déplacer déplace les deux ensemble.
 *
 * 0.25 et non 0.10 : à 0.10 il ne restait que 135px de défilement dégagé pour
 * 450px de dérive, soit 3.3px latéraux par pixel de scroll — le double des
 * gestes validés du site. À 0.25 l'arc court sur 279px, soit 1.6px/px, dans
 * la même famille que la glissade d'entrée (1.8) et le survol (1.5).
 */
export const DEBUT_WORKFLOW = 0.25;

/* Les deux teintes de la couture : le cyan assombri du contexte clair, et le
   néon de la nuit. La bascule de l'un à l'autre se lit sur la bande de
   raccord, pas sur les poids. */
export const CLAIR  = [23, 121, 163];
export const SOMBRE = [127, 227, 255];

/**
 * La cible du fil : l'ancre du process, en pixels écran.
 *
 * Le plafond à la médiane en fait partie et n'est pas un détail : pendant
 * l'approche l'ancre est encore à plus d'un écran sous la fenêtre, et c'est la
 * médiane qui est la vraie cible — le fil l'attend au lieu de plonger à sa
 * rencontre. Les deux sections lisent cette même expression, donc elles
 * visent le même point au même instant.
 *
 * @param {number} vh hauteur du viewport
 * @returns {{x:number, y:number}|null} null si le workflow n'est pas là
 */
export function ancreProcess(vh){
  const ancre = document.querySelector('#workflow .ancre-process');
  const m = ancre && ancre.getScreenCTM();
  if (!m) return null;
  return { x: m.e, y: Math.min(m.f, vh * 0.5) };
}
