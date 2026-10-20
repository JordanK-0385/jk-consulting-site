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
import { prefersReducedMotion } from '../core/motion.js';
import { stickyProgress } from '../core/scroll.js';
import { clamp01, seg, rgb } from '../core/color.js';
import { SOMBRE } from '../core/entree-process.js';
import { ancragePoint, reposCharniere, POINT_DX, POINT_DY, ECRITURE, RATTRAPE } from '../core/interrogation.js';

/* Le néon de la nuit, repris tel quel au fil. Le titre vivant sur le stage
   sombre du début à la fin, c'est sa seule couleur. */
const NEON = SOMBRE;

/* La boucle se referme sur la bille APRÈS qu'elle se soit posée : le meneur
   s'arrête sur l'axe, et il reste 0.3 em de glyphe à découvrir à sa droite.
   Ce court retard est le geste de fermeture, pas un rattrapage. */
const FERMETURE = 0.95;

/* LE DÉCROCHAGE, dans la fin du repos (--repos-charniere). Le titre commence
   à monter pendant que la bille, elle, ne bouge pas : le point se détache de
   la boucle sous les yeux, lentement, au lieu d'être arraché d'un coup quand
   le stage décolle. Course en em pour tenir sur les deux corps. Courbe
   cubique : la vitesse d'arrivée (~0.9 px par px de défilement en 1440x900)
   rejoint celle du stage qui prend le relais — pas d'à-coup à la reprise. */
const DECROCHE = [0.55, 1];
const DECROCHE_EM = 0.9;

export function initCharniere(root){
  const bloc  = root.querySelector('.charniere');
  const titre = bloc && bloc.querySelector('.titre-charniere');
  const mots  = titre ? [...titre.querySelectorAll('.mot')] : [];
  const glyphe = bloc && bloc.querySelector('.q svg');
  const landing = document.querySelector('#landing');
  const stage = landing && landing.querySelector('.stage');
  const scene = landing && landing.querySelector('.scene');
  if (!bloc || !titre || !mots.length || !glyphe || !landing) return;

  /* LE TITRE EMBARQUE SUR LE STAGE. Il cesse d'être une couche autonome pour
     devenir un passager, comme le logo et le bouton : immobile tant que le
     stage est collé, puis emporté vers le haut à la vitesse du défilement.
     C'est ce qui règle d'un coup les deux défauts des versions précédentes —
     il ne rencontre jamais le fond clair, et rien de la méthode ne passe
     dessous, puisqu'il est sorti bien avant qu'elle n'arrive.

     Pas en mouvement réduit : le balisage reste alors dans la méthode, où il
     se lit en flux normal, entier et immobile. C'est la raison pour laquelle
     le déménagement est ici et non dans index.html. */
  /* MOUVEMENT RÉDUIT : le module s'arrête ici, et c'est tout le correctif.
     Il ne suffit pas de sauter le déménagement : tant que la boucle tourne,
     elle écrit clip-path, transform et color EN LIGNE sur les éléments, et le
     style en ligne l'emporte sur la feuille. Les règles de repli étaient donc
     sans effet — vérifié, le titre restait invisible, volets fermés, et son
     transform le faisait chevaucher le chapô de 71px en desktop, 104px en
     repli. En ne peignant rien, la feuille reprend la main : statique dans le
     flux de la méthode, entier, point dessiné. */
  if (prefersReducedMotion()) return;
  if (stage) stage.appendChild(bloc);

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
      etroit, bornes, total, surChemin, corps,
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
  /* LA POLICE ARRIVE APRÈS LA MESURE. Space Grotesk est servie par le réseau :
     au premier passage, les mots sont composés dans la police de repli
     (system-ui), plus étroite sur macOS. Le décalage du « ? » relevé alors
     était faux, et la boucle se posait à côté de la bille — mesuré à 102px en
     simulant 800ms de latence. On remesure dès que la vraie police est là. */
  if (document.fonts){
    document.fonts.ready.then(remesurer);
    document.fonts.addEventListener('loadingdone', remesurer);
  }

  /* PASSE POST-SECTIONS, comme le fil conducteur — et non une section de plus.
     Deux raisons. La charnière est une couche de page, pas une scène : elle ne
     fait que lire une ancre que les sections viennent de poser, et elle doit la
     lire APRÈS elles. Et register() est indexé par élément : s'enregistrer sur
     #methode, déjà pris par la méthode, aurait remplacé son tick et réduit
     toute la section au silence. */
  registerAfter(() => {
    const ancre = ancragePoint();
    if (!ancre || !plan){ bloc.style.opacity = '0'; return; }
    const repos = reposCharniere();
    const p = stickyProgress(landing, repos);
    /* Avancée dans le repos : 0 à son entrée, 1 quand le stage décolle. */
    const course = landing.offsetHeight - window.innerHeight - repos;
    const tenue = repos > 0
      ? clamp01((-landing.getBoundingClientRect().top - course) / repos)
      : 0;

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

    /* LA POSE, puis LA REMONTÉE. En X rien ne bouge jamais : le point reste
       sur l'ancre, donc sur l'axe du rail, donc le delta X de la descente est
       intact. En Y le titre part de l'ancre — la bille est son point — puis
       s'en détache vers le haut À MESURE QUE LA BILLE DESCEND.

       La progression est la descente elle-même, lue sur le fil déjà rendu :
       thread.js s'exécute avant cette passe. Un seul nombre commande les deux
       sens, il n'y a donc rien à synchroniser. Le titre se fige quand la
       course est faite, et n'en bouge plus. */
    /* LA POSE, et rien d'autre. Le titre ne remonte plus par lui-même : il se
       pose sur l'ancre — la même que le landing et la méthode revendiquent —
       et n'en bouge pas. C'est le stage qui monte sous lui. Un mouvement de
       moins, et le point reste sur l'axe du rail tant qu'il est là. */
    const d = seg(tenue, DECROCHE[0], DECROCHE[1]);
    const leve = DECROCHE_EM * plan.corps * d * d * d;
    titre.style.transform =
      `translate(${(ancre.x - plan.ox).toFixed(2)}px, ${(ancre.y - plan.oy - leve).toFixed(2)}px)`;

    /* NÉON CONSTANT. Le titre ne quitte jamais la nuit du stage : il n'y a
       plus de bande à traverser, donc plus de fond qui change sous l'encre.
       Mesuré sur toute sa trajectoire et sur les deux viewports, 12.2 à
       12.7:1. Le défaut de contraste des versions précédentes n'est pas
       rattrapé — il a cessé d'exister. */
    bloc.style.color = rgb(NEON);

    /* PLUS D'EFFACEMENT. Le titre est présent dès que la scène le porte, et
       c'est la sortie du stage qui l'emporte, pas un fondu. Le volet des mots
       suffit à le rendre invisible avant l'écriture : un seul mécanisme au
       lieu de deux. */
    bloc.style.opacity = '1';
  });
}
