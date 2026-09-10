/*
 * SECTION 5 — TÉMOIGNAGES · preuve sociale.
 * Seule section sans prototype.
 *
 * Révélation en cascade des cartes à l'entrée dans le champ. Comme la
 * section méthode, tout est piloté par le scroll : rien ne bouge de
 * lui-même, donc rien à geler en mouvement réduit — la feuille de style
 * neutralise la transition et les cartes s'affichent d'emblée.
 */

import { register } from '../core/raf.js';
import { clamp01, easeOut } from '../core/color.js';

/* Décalage entre deux cartes, en fraction de la progression. */
const STAGGER = 0.12;

export function initTemoignages(root){
  const quotes = [...root.querySelectorAll('.quote')];
  const survol = root.querySelector('.survol');
  const agent  = survol && survol.querySelector('.agent-plein');
  const papier = root.querySelector('.papier');

  /* Les deux réglages du survol vivent dans la feuille de style, où se trouve
     aussi l'avance en tête de section qui doit valoir la même course. Relus
     une fois : ce sont des constantes d'auteur, pas un état. */
  const reglages = getComputedStyle(root);
  const COURSE = (parseFloat(reglages.getPropertyValue('--survol-course')) || 60) / 100;
  const AVANT  = (parseFloat(reglages.getPropertyValue('--survol-avant')) || 110) / 100;
  const OMBRE  = parseFloat(reglages.getPropertyValue('--survol-ombre'));
  const OPACITE_OMBRE = Number.isFinite(OMBRE) ? OMBRE : 0.30;
  if (!quotes.length) return;

  /* L'état masqué est posé ici, pas dans la feuille de style : une carte en
     opacity:0 que personne ne vient révéler serait un témoignage perdu. */
  for (const quote of quotes){
    quote.style.opacity = 0;
    quote.style.transform = 'translateY(14px)';
  }

  /* Nommée, et jouée une fois avant l'enregistrement : la découpe du papier
     doit exister DÈS LA PREMIÈRE PEINTURE. register() ne réveille la boucle
     qu'au premier passage de l'observateur, et un lecteur qui arrive déjà
     positionné sur la couture — rechargement, lien profond — aurait vu une
     frame de papier plein par-dessus le bureau. */
  const rendre = () => {
    const rect = root.getBoundingClientRect();

    /* ---------- le survol ----------
       Le robot traverse le champ : il entre par le coin haut droit, lointain
       et petit, vient vers nous en diagonale et sort par le coin bas gauche
       en crevant le cadre. Le contenu est déjà en place derrière lui — il le
       masque le temps du passage, il ne le découvre pas.

       La course et l'opacité de l'ombre se règlent dans s5-temoignages.css,
       --survol-course et --survol-ombre. La course vaut aussi l'avance en tête
       de section : le titre arrive à sa position naturelle au moment où le
       robot sort. */
    if (agent){
      const vh = window.innerHeight, vw = window.innerWidth;
      /* Le vol commence AVANT que la section arrive : à --survol-avant écrans
         au-dessus de la couture, le bureau occupe encore tout l'écran et c'est
         là que le robot surgit, en haut à droite. Il enjambe ensuite la
         frontière, et le contenu blanc se dévoile en défilant sous son
         passage. */
      /* La section chevauche la précédente d'exactement --survol-avant : son
         bord haut est donc à ras du viewport au départ du vol, et l'avancement
         se lit directement dessus. Même valeur qu'avant le chevauchement — le
         retrait du contenu compense le débord au pixel. */
      const av = clamp01(-rect.top / ((AVANT + COURSE) * vh));

      /* La profondeur s'accélère : à distance égale parcourue, l'objet grossit
         de plus en plus vite. C'est ce qui donne le rapprochement plutôt
         qu'un glissement à plat. */
      const prof = av * av * 0.55 + av * 0.45;

      const x = (1.30 - 1.60 * av) * vw;
      const y = (-0.22 + 1.46 * av) * vh;
      const ech = 0.5 + 1.25 * prof;

      agent.style.setProperty('--x', `${x.toFixed(1)}px`);
      agent.style.setProperty('--y', `${y.toFixed(1)}px`);
      agent.style.setProperty('--s', ech.toFixed(3));
      agent.style.setProperty('--r', `${(-24 + 13 * av).toFixed(1)}deg`);

      /* Lumière fixe en haut de l'écran : l'ombre s'écarte du robot à mesure
         qu'il s'en éloigne, et s'élargit à mesure qu'il monte vers nous. */
      const dx = (x - vw * 0.5) * 0.11;
      const dy = (y - vh * 0.08) * 0.075 + 12;
      const flou = 14 + 30 * prof;
      agent.style.setProperty('--ombre',
        `drop-shadow(${dx.toFixed(0)}px ${dy.toFixed(0)}px ${flou.toFixed(0)}px rgba(10, 22, 40, ${OPACITE_OMBRE}))`);

      survol.style.visibility = (av <= 0 || av >= 1) ? 'hidden' : 'visible';

      /* ---------- LA LAME ----------
         Le clair n'est pas poussé par le bas : il est DÉCOUVERT DANS LE
         SILLAGE DU ROBOT. Là où il est passé, le papier ; devant lui, la nuit
         du bureau, toujours là. La séparation est une droite qu'il porte avec
         lui, perpendiculaire à sa course — une raclette tenue en biais.

         Son inclinaison est donc celle de sa trajectoire, jamais l'horizontale
         ni la verticale : elle est prise sur la dérivée de la course, la seule
         source de vérité de sa direction. Changer la trajectoire réoriente la
         lame sans qu'on ait à y toucher.

         Bord franc, sans adoucissement : c'est une coupe. */
      const coursex = -1.60 * vw, coursey = 1.46 * vh;
      const norme = Math.hypot(coursex, coursey);
      const ax = coursex / norme, ay = coursey / norme;   // vers l'avant
      const lx = -ay, ly = ax;                            // la lame

      if (papier){
        if (av >= 1){
          /* Traversée finie : plus rien à découper. */
          papier.style.clipPath = '';
        } else {
          /* Le demi-plan DERRIÈRE la lame — le sillage. Un rectangle démesuré
             suffit : il n'a qu'à déborder du viewport de tous les côtés. */
          const l = (vw + vh) * 2;
          /* Le découpage se lit dans le repère du papier, pas dans celui de
             la section : c'est lui qui porte le clip-path. */
          const cadre = papier.getBoundingClientRect();
          const px = x - cadre.left, py = y - cadre.top;
          const coins = [
            [px + lx * l,            py + ly * l],
            [px - lx * l,            py - ly * l],
            [px - lx * l - ax * l,   py - ly * l - ay * l],
            [px + lx * l - ax * l,   py + ly * l - ay * l],
          ];
          papier.style.clipPath =
            `polygon(${coins.map(([a, b]) => `${a.toFixed(0)}px ${b.toFixed(0)}px`).join(',')})`;
        }
      }
    }

    /* 0 quand le haut du CONTENU atteint le bas du viewport, 1 quand il a
       remonté d'un tiers d'écran. On retranche le débord : le bord de la
       section est remonté d'une avance entière, le contenu non — s'en servir
       tel quel aurait grillé toute la cascade pendant la traversée. */
    const haut = rect.top + AVANT * window.innerHeight;
    const entry = clamp01((window.innerHeight - haut) / (window.innerHeight * 0.66));

    quotes.forEach((quote, i) => {
      const shown = easeOut(clamp01((entry - i * STAGGER) / (1 - STAGGER * (quotes.length - 1) || 1)));
      quote.style.opacity = shown;
      quote.style.transform = `translateY(${(1 - shown) * 14}px)`;
    });
  };

  rendre();
  register(root, rendre);
}
