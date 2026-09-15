/*
 * L'ANCRE DE L'ÉTINCELLE — où le bureau meurt, où le fil conducteur naît, et
 * où la méthode l'attend.
 *
 * Trois gestes, un seul point. Tant que chacun calculait le sien — le landing
 * sur le foyer du bureau projeté, la méthode sur l'axe du rail — le mélange
 * pondéré de thread.js interpolait entre deux abscisses distantes de 450px :
 * la bille descendait en diagonale au lieu de descendre, et vacillait.
 *
 * Une seule source, lue dans le DOM par les deux sections, rend le delta nul
 * PAR CONSTRUCTION — en desktop où le rail est à droite comme en mobile où il
 * passe à gauche, puisque c'est le même élément qui est mesuré des deux côtés.
 *
 * Même rôle que core/passage.js pour la couture workflow -> liaison : un
 * paramètre de couture que deux sections partagent ne vit dans aucune des deux.
 */

/* Éléments et empreinte, retenus au premier accès. L'empreinte du bureau ne
   dépend ni du scroll ni du viewport : c'est une boîte en unités de scène.
   (Le landing la mesure aussi pour son propre rendu — même getBBox sur le même
   élément, donc la même valeur ; ce n'est pas un état dupliqué.) */
let scene = null, ligne = null, foyer = null;

function elements(){
  if (!scene)  scene = document.querySelector('#landing .scene');
  if (!ligne)  ligne = document.querySelector('#methode .line');
  return !!(scene && ligne);
}

/**
 * Le point où le bureau s'éteint et où l'étincelle s'allume, en pixels écran.
 *
 * @returns {{x:number, y:number}|null} null si l'une des deux sections manque —
 *          chaque appelant retombe alors sur son comportement d'origine.
 */
export function ancrageEtincelle(){
  if (!elements()) return null;

  if (!foyer){
    try {
      const boite = scene.getBBox();
      if (boite.width > 0){
        foyer = { x: boite.x + boite.width / 2, y: boite.y + boite.height / 2 };
      }
    } catch { /* getBBox indisponible avant la mise en page : on réessaiera */ }
  }
  const m = foyer && scene.getScreenCTM();
  if (!m) return null;

  const r = ligne.getBoundingClientRect();

  /* L'ordonnée est ramenée au repère du stage COLLÉ. Sans cette correction
     elle file vers le haut avec la scène qui se décolle en fin de section, et
     la méthode n'a plus rien de stable où s'accrocher : c'est la correction
     d'ancre de core/passage.js, pour la même raison. */
  const stage = scene.closest('.stage');
  const haut = stage ? stage.getBoundingClientRect().top : 0;

  /* VARIANTE A — LE POINT DE RENCONTRE MONTE DANS LE SOMBRE.
     Le titre de charnière s'écrit autour de ce point : le laisser à mi-écran
     le mettait à cheval sur la bande de raccord, moitié sur la nuit moitié
     sur le papier. Ici les trois gestes remontent ENSEMBLE — le bureau y
     meurt, l'étincelle y naît, le titre s'y écrit — et le titre ne rencontre
     jamais la bande.
     Deux hauteurs parce que le titre n'a pas la même forme : une ligne en
     desktop, trois en repli, le « ? » sur la dernière. Plus haut en repli et
     les deux premières lignes sortiraient par le haut. */
  const etroit = window.innerWidth <= 720;
  const plafond = window.innerHeight * (etroit ? 0.34 : 0.22);

  return {
    x: r.left + r.width / 2,
    y: Math.min(m.b * foyer.x + m.d * foyer.y + m.f - haut, plafond),
  };
}
