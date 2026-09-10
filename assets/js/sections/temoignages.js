/*
 * SECTION 5 — TÉMOIGNAGES · preuve sociale.
 * Seule section sans prototype.
 *
 * LA COUTURE EST UN ÉCHANGE DE CALQUES, PAS UN DÉFILEMENT. Pendant toute la
 * traversée, deux images sont à l'écran, complètes et immobiles : le bureau
 * de la liaison, collé sur son palier final, et cette section, collée à sa
 * position définitive. Le seul objet qui bouge est le robot, et la lame
 * diagonale qu'il porte. Elle échange l'une contre l'autre.
 *
 * C'est pourquoi il n'y a plus AUCUNE animation d'entrée ici — ni cascade de
 * cartes, ni texte qui monte. Tout mouvement du contenu pendant le passage
 * creuse un vide : une zone d'où le contenu s'est écarté et que rien ne
 * remplace encore. Le contenu est en place avant que le robot n'entre ;
 * il est simplement caché par le calque du bureau jusqu'à ce que la lame
 * le découvre.
 */

import { register } from '../core/raf.js';
import { clamp01 } from '../core/color.js';

/* Jusqu'où le vol se prolonge après la traversée du cadre, en fraction de
   celle-ci. Il faut qu'il ait le temps de sortir entièrement ; au-delà, la
   borne évite de faire enfler un objet devenu invisible. */
const DEBORD = 1.60;

/* Vitesse de la sortie, en multiples de celle de la traversée. */
const FUITE = 4;

export function initTemoignages(root){
  const survol = root.querySelector('.survol');
  const agent  = survol && survol.querySelector('.agent-plein');
  const papier = root.querySelector('.papier');

  /* Réglages d'auteur, relus une fois. La longueur de la traversée est un
     jeton partagé avec la liaison : la même valeur y tient sa scène immobile
     et ici décide du chevauchement. La lire au même endroit est ce qui
     garantit que les deux calques sont fixes AU MÊME MOMENT. */
  const OMBRE = parseFloat(getComputedStyle(root).getPropertyValue('--survol-ombre'));
  const OPACITE_OMBRE = Number.isFinite(OMBRE) ? OMBRE : 0.30;
  const couture = () =>
    (parseFloat(getComputedStyle(document.documentElement)
      .getPropertyValue('--couture')) || 170) / 100 * window.innerHeight;
  if (!agent || !papier) return;

  /* Nommée, et jouée une fois avant l'enregistrement : la découpe du papier
     doit exister DÈS LA PREMIÈRE PEINTURE. register() ne réveille la boucle
     qu'au premier passage de l'observateur, et un lecteur qui arrive déjà
     positionné sur la couture — rechargement, lien profond — aurait vu une
     frame de papier plein par-dessus le bureau. */
  const rendre = () => {
    const rect = root.getBoundingClientRect();
    /* AVANCEMENT DE LA TRAVERSÉE. Le bord haut de la section atteint le
       viewport à l'instant précis où la liaison achève son dézoom et entre
       dans son palier immobile : l'avancement se lit donc directement dessus.
       0 = les deux calques viennent de se mettre en place, 1 = l'échange est
       fait. */
    const brut = -rect.top / couture();
    const av = clamp01(brut);

    /* ---------- le survol ----------
       Le robot entre par le coin haut droit, lointain et petit, vient vers
       nous en diagonale et sort par le coin bas gauche en crevant le cadre.
       Il surgit sur l'écran du bureau : à cet instant la scène de la liaison
       occupe encore tout l'écran, arrêtée sur son palier. L'opacité de son
       ombre se règle dans s5-temoignages.css, --survol-ombre. */
    {
      const vh = window.innerHeight, vw = window.innerWidth;
      /* IL FINIT SA LIGNE, il n'est pas coupé. La traversée du cadre s'achève
         à 1 — c'est là que le contenu se pose — mais à cet instant une arche
         de 190px de lui est encore à l'écran en 1440x900, et les trois quarts
         du cadre en 390x844 : l'éteindre là faisait un saut de montage, pas
         une sortie. Il poursuit donc la même droite jusqu'à ce que sa dernière
         trace ait quitté le cadre, et il file — au plus près de l'objectif,
         c'est là qu'il balaie le plus vite. */
      const vol = brut <= 1 ? brut : Math.min(1 + (brut - 1) * FUITE, DEBORD);

      /* La profondeur s'accélère : à distance égale parcourue, l'objet grossit
         de plus en plus vite. C'est ce qui donne le rapprochement plutôt
         qu'un glissement à plat.

         Elle s'arrête net à la fin de la traversée : il est alors au plus
         près, et continuer à le grandir en le poussant dehors l'agrandissait
         plus vite qu'il ne s'écartait — sur un écran étroit il ne sortait
         jamais du cadre. La sortie est un glissement, pas une approche. */
      const prof = Math.min(vol, 1) ** 2 * 0.55 + Math.min(vol, 1) * 0.45;

      const x = (1.30 - 1.60 * vol) * vw;
      const y = (-0.22 + 1.46 * vol) * vh;
      const ech = 0.5 + 1.25 * prof;

      agent.style.setProperty('--x', `${x.toFixed(1)}px`);
      agent.style.setProperty('--y', `${y.toFixed(1)}px`);
      agent.style.setProperty('--s', ech.toFixed(3));
      agent.style.setProperty('--r', `${(-24 + 13 * Math.min(vol, 1)).toFixed(1)}deg`);

      /* Lumière fixe en haut de l'écran : l'ombre s'écarte du robot à mesure
         qu'il s'en éloigne, et s'élargit à mesure qu'il monte vers nous. */
      const dx = (x - vw * 0.5) * 0.11;
      const dy = (y - vh * 0.08) * 0.075 + 12;
      const flou = 14 + 30 * prof;
      agent.style.setProperty('--ombre',
        `drop-shadow(${dx.toFixed(0)}px ${dy.toFixed(0)}px ${flou.toFixed(0)}px rgba(10, 22, 40, ${OPACITE_OMBRE}))`);

      /* Masqué dès qu'il ne touche plus le cadre — mesuré, pas deviné : la
         valeur juste dépend de sa taille à l'écran, donc du viewport. */
      const boite = agent.getBoundingClientRect();
      const dedans = boite.right > 0 && boite.left < vw && boite.bottom > 0 && boite.top < vh;
      survol.style.visibility = (brut <= 0 || !dedans) ? 'hidden' : 'visible';

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

      {
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

  };

  rendre();
  register(root, rendre);
}
