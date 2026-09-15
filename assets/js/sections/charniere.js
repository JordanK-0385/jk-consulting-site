/*
 * LA CHARNIÈRE LANDING -> MÉTHODE — « Comment on fait ? » s'écrit, le « ? »
 * se pose sur la bille.
 *
 * Trois gestes sur UNE SEULE HORLOGE, la progression du landing :
 *   - le texte s'écrit dans le sillage du bureau qui se condense et dérive ;
 *   - son « ? » arrive sur l'axe du rail à l'instant où la bille s'y allume,
 *     et la bille EN EST LE POINT — rien n'est dessiné là ;
 *   - la boucle se referme sur elle, puis le titre ne bouge plus.
 *
 * Ce qui n'est PAS fait ici, délibérément : aucune revendication du fil. Le
 * module ne touche ni à sa position, ni à son rayon, ni à sa couleur. C'est
 * la boucle qui vient à la bille, jamais l'inverse — donc le delta X de la
 * descente vers Diagnostic reste exactement celui d'avant.
 *
 * Enregistré sur #methode et non sur #landing : le titre doit vivre pendant
 * tout le palier de repos, qui court 600px en desktop et 1000px en repli,
 * bien après que le landing soit sorti du champ de l'observateur.
 */

import { registerAfter } from '../core/raf.js';
import { stickyProgress } from '../core/scroll.js';
import { clamp01, seg, lerp, rgb } from '../core/color.js';
import { smoother } from '../core/dock.js';
import { CLAIR, SOMBRE } from '../core/entree-process.js';
import { ancragePoint, POINT_DX, POINT_DY, ECRITURE, RATTRAPE } from '../core/interrogation.js';

/* Le néon de la nuit et le cyan assombri du papier — les deux teintes du fil,
   reprises telles quelles. Le titre et le fil sont alors rigoureusement de la
   même couleur à chaque instant, ce qui est le but. */
const NEON = SOMBRE;

/* La boucle se referme sur la bille APRÈS qu'elle se soit posée : le meneur
   s'arrête sur l'axe, et il reste 0.3 em de glyphe à découvrir à sa droite.
   Ce court retard est le geste de fermeture, pas un rattrapage. */
const FERMETURE = 0.95;

/* Le titre s'efface quand le chapô de la méthode monte le rejoindre. Critère
   géométrique et non fenêtre de défilement : il s'ajuste seul à la mise en
   page, comme le dégagement du couloir en sortie de section. */
const GARDE = 160;

/* VARIANTE B — LA REMONTÉE. Le titre s'écrit à la hauteur de la bille, puis
   monte se figer dans le sombre pendant qu'elle descend. Les deux mouvements
   sont opposés et pilotés par LA MÊME grandeur : la descente de la bille
   elle-même, lue sur le fil déjà rendu. Pas deux horloges, pas de poids
   concurrents — le titre monte exactement de ce que la bille descend, à
   l'échelle près.
   HAUTEUR : où le titre se fige, en fraction d'écran. COURSE : de combien la
   bille doit descendre pour que la remontée soit achevée. */
/* OÙ LE TITRE SE FIGE. Pas une simple fraction d'écran : sur un téléphone le
   titre fait trois lignes, et une fraction qui convient au desktop l'y ferait
   sortir par le haut. La cible est donc « aussi haut que le bloc le permet,
   sans jamais dépasser 22% de l'écran » — MARGE_HAUT sous le bord, ou le
   plafond, le plus bas des deux.
   Mesuré : le desktop est inchangé (le plafond gagne partout au-dessus de
   720px), et la remontée passe de 92 à 163px en 390x844, de 103 à 205px en
   430x932. En 390x667 elle plafonne à 64px — le bloc y occupe presque toute
   la hauteur disponible au-dessus de l'ancre, et réduire le corps du titre
   pour gagner quelques pixels coûterait plus en lisibilité que ça ne
   rapporterait en mouvement. */
const MARGE_HAUT = 44;
const PLAFOND    = 0.22;
const COURSE  = 420;
const MARGE   = 300;

export function initCharniere(root){
  const bloc  = root.querySelector('.charniere');
  const titre = bloc && bloc.querySelector('.titre-charniere');
  const mots  = titre ? [...titre.querySelectorAll('.mot')] : [];
  const glyphe = bloc && bloc.querySelector('.q svg');
  const bande = root.querySelector('.seam--to-light');
  const chapo = root.querySelector('.intro h2');
  const landing = document.querySelector('#landing');
  const scene = landing && landing.querySelector('.scene');
  if (!bloc || !titre || !mots.length || !glyphe || !landing) return;

  /* GÉOMÉTRIE DE LECTURE, relevée une fois sur la mise en page nue.
     Pour chaque mot, son début et sa fin le long du chemin de lecture ; et la
     position du point du « ? » sur ce même chemin. En desktop le chemin est
     l'axe horizontal, en repli c'est la suite des trois lignes — d'où la
     mesure par cumul plutôt que par abscisse. */
  let plan = null;
  function mesurer(){
    const etroit = window.innerWidth <= 720;
    const b = titre.getBoundingClientRect();
    const g = glyphe.getBoundingClientRect();
    const corps = parseFloat(getComputedStyle(titre).fontSize);
    const bornes = [];
    let cumul = 0;
    for (const m of mots){
      const r = m.getBoundingClientRect();
      if (etroit){ bornes.push([cumul, cumul + r.width]); cumul += r.width; }
      else       { bornes.push([r.left - b.left, r.right - b.left]); }
    }
    const total = etroit ? cumul : bornes[bornes.length - 1][1];
    /* Le point, sur le chemin de lecture et depuis le coin du bloc. */
    const surChemin = etroit
      ? bornes[bornes.length - 1][0] + POINT_DX * corps
      : (g.left - b.left) + POINT_DX * corps;
    plan = {
      etroit, bornes, total, surChemin,
      /* Décalage du centre du point par rapport au coin haut-gauche du bloc :
         c'est lui qui sert à poser le titre sur l'ancre. */
      ox: (g.left - b.left) + POINT_DX * corps,
      oy: (g.top  - b.top)  + POINT_DY * corps,
    };
  }
  /* La mise en page nue : on neutralise le volet le temps de la mesure, sinon
     les boîtes des mots sont celles du texte déjà rogné. */
  function remesurer(){
    for (const m of mots) m.style.clipPath = 'none';
    mesurer();
    for (const m of mots) m.style.clipPath = '';
  }
  remesurer();
  addEventListener('resize', remesurer, { passive: true });

  /* PASSE POST-SECTIONS, comme le fil conducteur — et non une section de plus.
     Deux raisons. La charnière est une couche de page, pas une scène : elle ne
     fait que lire une ancre que les sections viennent de poser, et elle doit la
     lire APRÈS elles. Et register() est indexé par élément : s'enregistrer sur
     #methode, déjà pris par la méthode, aurait remplacé son tick et réduit
     toute la section au silence. */
  registerAfter(() => {
    const ancre = ancragePoint();
    if (!ancre || !plan){ bloc.style.opacity = '0'; return; }
    const p = stickyProgress(landing);

    /* LE BORD D'ÉCRITURE. En desktop il rattrape l'abscisse écran du bureau
       puis la suit exactement : le texte s'écrit derrière le meneur et n'est
       jamais rendu sous lui. Le meneur est lu dans le DOM — la matrice de la
       scène, déjà calculée par le landing — plutôt que recalculé ici.

       En repli, le meneur va de 195 à 47, c'est-à-dire À CONTRESENS de la
       lecture : aucun bord ne peut le suivre. L'écriture s'y fait donc ligne
       par ligne sur la même horloge, et s'achève sur le « ? » à l'instant où
       il se pose. La promesse est la même, tenue autrement. */
    let avance;
    if (plan.etroit){
      avance = plan.surChemin * seg(p, ECRITURE[0], ECRITURE[1]);
    } else {
      const m = scene && scene.getScreenCTM();
      const bb = scene && scene.getBBox();
      const meneur = (m && bb)
        ? m.a * (bb.x + bb.width / 2) + m.c * (bb.y + bb.height / 2) + m.e
        : ancre.x;
      const gauche = ancre.x - plan.ox;               /* bord gauche du bloc posé */
      const vise = Math.max(0, Math.min(meneur - gauche, plan.surChemin));
      /* Avant RATTRAPE le bord rejoint le meneur depuis le début du texte ;
         après, il EST le meneur. Continu en RATTRAPE, où le facteur vaut 1. */
      avance = p < RATTRAPE ? vise * seg(p, ECRITURE[0], RATTRAPE) : vise;
    }
    /* LA FERMETURE : le reste du glyphe, découvert après la pose. La boucle se
       referme sur la bille au lieu de s'achever avant elle. */
    avance += (plan.total - plan.surChemin) * seg(p, ECRITURE[1], FERMETURE);

    for (let i = 0; i < mots.length; i++){
      const [a, b] = plan.bornes[i];
      const part = b > a ? clamp01((avance - a) / (b - a)) : 0;
      mots[i].style.clipPath = `inset(0 ${(100 * (1 - part)).toFixed(2)}% 0 0)`;
    }

    const r0 = bande ? bande.getBoundingClientRect() : null;

    /* LA POSE, puis LA REMONTÉE. En X rien ne bouge jamais : le point reste
       sur l'ancre, donc sur l'axe du rail, donc le delta X de la descente est
       intact. En Y le titre part de l'ancre — la bille est son point — puis
       s'en détache vers le haut À MESURE QUE LA BILLE DESCEND.

       La progression est la descente elle-même, lue sur le fil déjà rendu :
       thread.js s'exécute avant cette passe. Un seul nombre commande les deux
       sens, il n'y a donc rien à synchroniser. Le titre se fige quand la
       course est faite, et n'en bouge plus. */
    /* CE QUI COMMANDE LA REMONTÉE : l'arrivée du jour, c'est-à-dire le haut
       de la bande de raccord qui monte vers le titre. Le titre lui cède la
       place en remontant dans la nuit.

       Ce n'est PAS la descente de la bille, bien qu'on l'ait cru : le fil
       « descend le rail » dans le document mais REMONTE à l'écran, puisque
       la page défile sous lui — mesuré, il va de 414 à 162. Piloter la
       remontée par ce déplacement l'aurait déclenchée après que le titre se
       soit déjà effacé, et dans le même sens que la bille au lieu du sens
       opposé. La bande, elle, monte franchement et tôt. */
    const bande0 = r0 ? r0.top : Infinity;
    const montee = smoother(clamp01((ancre.y + MARGE - bande0) / COURSE));
    const haut = Math.max(MARGE_HAUT + plan.oy, window.innerHeight * PLAFOND);
    const posY = ancre.y + (haut - ancre.y) * montee;

    titre.style.transform =
      `translate(${(ancre.x - plan.ox).toFixed(2)}px, ${(posY - plan.oy).toFixed(2)}px)`;

    /* LA TEINTE SE LIT SUR LA GÉOMÉTRIE DE LA BANDE, pas sur une fenêtre de
       défilement. Au-dessus de la bande on est sur la nuit : néon. En dessous
       on est sur le papier : cyan assombri, le seul des deux qui passe le
       contraste AA sur fond clair (4.52:1 contre 1.35:1). La bascule suit donc
       exactement celle du fil, et pour la même raison qu'en sortie de section. */
    const r = r0;
    /* VARIANTE B — la teinte se lit à la position COURANTE du point, pas à
       l'ancre : le titre remonte, donc son rapport à la bande change aussi
       par son propre mouvement. Lire l'ancre donnerait la couleur d'un endroit
       où le titre n'est plus. */
    const teinte = r ? lerp(NEON, CLAIR, seg(posY, r.top, r.bottom)) : NEON;
    bloc.style.color = rgb(teinte);

    /* Présent dès que l'écriture commence, effacé quand le chapô de la méthode
       monte le rejoindre : les deux ne se superposent jamais. Critère
       géométrique, donc juste quelle que soit la mise en page. */
    const entree = seg(p, ECRITURE[0] - 0.03, ECRITURE[0] + 0.02);
    const bt = titre.getBoundingClientRect().bottom;
    const margeJour = r ? r.top - bt : Infinity;
    const margeChapo = chapo ? chapo.getBoundingClientRect().top - bt : Infinity;
    bloc.style.opacity = (entree * seg(Math.min(margeJour, margeChapo), 0, GARDE)).toFixed(3);
  });
}
