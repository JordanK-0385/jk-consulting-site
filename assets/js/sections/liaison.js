/*
 * SECTION 4 — LIAISON · dézoom vers le bureau.
 * Port de prototypes/4-liaison-bureau.html.
 *
 * On part cadré au plus près de l'agent « en service » né en section 3, et
 * on recule jusqu'à la maquette entière : un agent devient tout un bureau.
 *
 * Tout est piloté par le scroll — aucune animation ambiante ici en dehors
 * du clignement des yeux, qui est en CSS. Le module n'a donc pas besoin de
 * l'horloge ambiante.
 */

import { mk, poly, roundPath, points, makeIso } from '../core/svg.js';
import { rgba, shade, seg, easeOut, clamp01 } from '../core/color.js';
import { register } from '../core/raf.js';
import { stickyProgress } from '../core/scroll.js';
import { makeDock } from '../core/dock.js';
import { dalle } from '../core/bureau.js';

/* Maille du plateau 4×4 — plus resserrée que la landing, l'origine diffère. */
const iso = makeIso({ cx: 600, cy: 300 });

const VIEW_X = 600;   // centre optique du cadrage
const VIEW_Y = 380;

/*
 * LA FERMETURE (COMMIT-7). Exact inverse de l'ouverture : là-bas le bureau se
 * ramassait en une étincelle, ici l'agent redéploie le bureau.
 *
 * On ne part donc PAS du plan complet qu'on élargirait : on part d'UNE dalle,
 * et on ajoute. Avant, 14 des 27 éléments de scène étaient déjà à l'écran au
 * premier pixel de la section — le dézoom ne faisait qu'élargir un plan déjà
 * construit.
 *
 * Ordre des poses : devant, droite, gauche, fond. Les quatre zones tombent en
 * croix dans le repère isométrique ; en partant de celle du zoom, le bureau
 * s'étend en s'éloignant du spectateur.
 */
const ORDRE = [3, 1, 2, 0];
const POSE  = [0.05, 0.19, 0.33, 0.47];
const ETALE = 0.06;          // durée d'apparition d'une dalle
const CAM_FIN = 0.52;        // le dézoom est terminé quand la 4e est posée

/* Hauteur de chute du premier agent, en unités de viewBox. */
const CHUTE = 240;

const WHITE  = [220, 232, 246];
const SCREEN = [111, 224, 255];

/* Même palette de services que la landing : indigo / bleu / teal / cyan. */
const ZONES = [
  { color: [110, 123, 242], gx: 0, gy: 0 },
  { color: [ 79, 168, 240], gx: 2, gy: 0 },
  { color: [ 63, 214, 200], gx: 0, gy: 2 },
  { color: [127, 227, 255], gx: 2, gy: 2 },
];

export function initLiaison(root){
  const stage  = root.querySelector('.stage');
  const fitG   = root.querySelector('.scene-fit');
  const scene  = root.querySelector('.scene');
  const central = root.querySelector('.central');
  const cue     = root.querySelector('.cue');
  const benefits = [...root.querySelectorAll('.benefit')];

  /* ---------- plateau ---------- */

  /* Le sol monte en opacité au fil des poses : les dalles ne flottent jamais
     dans le vide, mais le plan ne se donne pas d'emblée non plus. */
  const plateau = mk('g', {});
  scene.appendChild(plateau);
  const north = iso(0, 0), east = iso(4, 0), south = iso(4, 4), west = iso(0, 4);
  const SLAB = 18;
  poly(plateau, '#0A1428', points(east, south, [south[0], south[1] + SLAB], [east[0], east[1] + SLAB]));
  poly(plateau, '#081020', points(south, west, [west[0], west[1] + SLAB], [south[0], south[1] + SLAB]));
  roundPath(plateau, [north, east, south, west], 26, '#0E1A2E');

  /* ---------- zones de service ---------- */

  /* Une dalle = un espace de travail complet, révélé d'un bloc : sol teinté,
     bordure, bureau, écran. Les regrouper est ce qui rend la pose possible —
     posés à plat sur la scène, ces quatre éléments auraient demandé quatre
     pilotages parallèles pour un seul geste. */
  const dalles = [], borders = [];
  for (const { gx, gy, color } of ZONES){
    const { g: espace, bord } = dalle(scene, iso, { gx, gy, taille: 2, color });
    espace.style.opacity = 0;
    const border = bord;

    /* bureau + écran allumé */
    poly(espace, shade(WHITE, 1.14), points(
      iso(gx + .6, gy + .55, .28), iso(gx + 1.4, gy + .55, .28),
      iso(gx + 1.4, gy + 1.05, .28), iso(gx + .6, gy + 1.05, .28)));
    const [sx, sy] = iso(gx + 1, gy + .65, .34);
    /* Le penchement doit se faire AUTOUR de l'écran, pas autour de l'origine
       du SVG. Tel quel — hérité du proto — skewY décalait chaque écran de
       x·tan(26°), soit près de 300 unités : les quatre tombaient sous leur
       bureau. Invisible tant que le plan s'affichait d'un bloc, flagrant dès
       que les dalles se posent une à une sur fond vide. */
    espace.appendChild(mk('rect', {
      x: sx - 9, y: sy - 13, width: 18, height: 12, rx: 3,
      fill: rgba(SCREEN, .9),
      transform: `translate(${sx} ${sy}) skewY(26) translate(${-sx} ${-sy})`,
      filter: `drop-shadow(0 0 4px ${rgba(SCREEN, .8)})`,
    }));

    dalles.push(espace);
    borders.push(border);
  }

  /* ---------- liens entre services ---------- */

  const centres = ZONES.map(z => iso(z.gx + 1, z.gy + 1, .7));
  const PAIRES = [[0, 1], [1, 3], [3, 2], [2, 0]];
  const links = PAIRES.map(([a, b]) => {
    const A = centres[a], B = centres[b];
    const link = mk('path', {
      d: `M ${A[0]} ${A[1]} Q ${(A[0] + B[0]) / 2} ${(A[1] + B[1]) / 2 - 26} ${B[0]} ${B[1]}`,
      fill: 'none', stroke: rgba(SCREEN, .5), 'stroke-width': '1.4',
    });
    link.style.filter = `drop-shadow(0 0 4px ${rgba(SCREEN, .6)})`;
    scene.appendChild(link);
    return link;
  });

  /* ---------- un agent par service, révélés au dézoom ---------- */

  function robot(gx, gy, color){
    const [x, y] = iso(gx, gy);
    /* Deux groupes emboîtés : l'extérieur porte la chute du premier agent,
       l'intérieur reste à sa place. Sans cela, animer la descente écraserait
       la translation qui pose le robot sur sa dalle. */
    const enveloppe = mk('g', {});
    const g = mk('g', { transform: `translate(${x} ${y - 4})` });
    enveloppe.appendChild(g);
    g.style.opacity = 0;
    g.appendChild(mk('ellipse', { cx: 0, cy: -14, rx: 17, ry: 17, fill: rgba(color, .18) }));
    g.appendChild(mk('rect', { x: -10, y: -15, width: 20, height: 18, rx: 8, fill: 'url(#jk-bot-body)', stroke: rgba(color, .85), 'stroke-width': '1.2' }));
    g.appendChild(mk('circle', { cx: 0, cy: -1, r: 2.8, fill: rgba(color, .9), filter: `drop-shadow(0 0 3px ${rgba(color, .9)})` }));
    g.appendChild(mk('rect', { x: -12, y: -36, width: 24, height: 19, rx: 10, fill: 'url(#jk-bot-body)', stroke: rgba(color, .85), 'stroke-width': '1.2' }));
    g.appendChild(mk('rect', { x: -9, y: -33, width: 18, height: 12, rx: 6, fill: '#0C1A2E' }));
    const eyes = mk('g', { class: 'eye' });
    for (const ex of [-4, 4]){
      eyes.appendChild(mk('ellipse', { cx: ex, cy: -27, rx: 2, ry: 2.7, fill: '#7FE7FF', filter: 'drop-shadow(0 0 3px #7FE7FF)' }));
    }
    g.appendChild(eyes);
    g.style.filter = `drop-shadow(0 0 5px ${rgba(color, .6)})`;
    scene.appendChild(enveloppe);
    return { g, enveloppe };
  }

  const robots = [
    robot(1, 1, ZONES[0].color),
    robot(3, 1, ZONES[1].color),
    robot(1, 3, ZONES[2].color),
    robot(3, 3, ZONES[3].color),
  ];

  /* Rang de pose de chaque zone : ORDRE dit qui vient quand, ceci dit quand
     vient chacun. Une seule table à tenir à jour. */
  const rang = ZONES.map((_, i) => ORDRE.indexOf(i));

  /* Le dézoom passe exactement par chaque pose et y ralentit — c'est la
     courbe d'accostage de la méthode, appliquée à la caméra plutôt qu'à un
     jeton. « Recule, marque la pose, recule », sans une seule condition. */
  const dockCam = makeDock(POSE.map(v => v / CAM_FIN), 0.9);

  /* Point de départ du dézoom : l'agent Front-office, le dernier « en service ». */
  const [focusX, focusY] = iso(3, 3, 0.4);

  /* ---------- cadrage responsive ---------- */

  function fit(){
    const scale = stage.clientWidth < 560 ? 1.45 : 1;
    fitG.setAttribute('transform',
      `translate(${VIEW_X} ${VIEW_Y}) scale(${scale}) translate(${-VIEW_X} ${-VIEW_Y})`);
  }
  fit();
  addEventListener('resize', fit, { passive: true });

  /* ---------- boucle ---------- */

  register(root, () => {
    const p = stickyProgress(root);

    /* L'agent arrive du workflow SOUS SA FORME D'AGENT. Le process y est
       déjà devenu « En service » ; le reprendre en bille pour le refaire
       naître en robot faisait régresser le récit. On capitalise sur le robot
       formé : il continue de descendre, entre dans le cadre pendant
       l'approche et se pose sur la première dalle.

       C'est pourquoi cette section ne revendique plus le fil : il n'y a plus
       de point à revendiquer, il y a un agent. */
    const arrivee = clamp01(1 - root.getBoundingClientRect().top / window.innerHeight);

    /* 0 = collé sur la première dalle, 1 = maquette entière. La caméra
       recule par paliers : le docking la fait passer exactement par chaque
       pose et ralentir à son approche. */
    const out = easeOut(dockCam(clamp01(p / CAM_FIN)));
    const scale = 3 - 2 * out;
    const tx = (1 - out) * (VIEW_X - focusX);
    const ty = (1 - out) * (VIEW_Y - focusY);
    scene.setAttribute('transform',
      `translate(${VIEW_X * (1 - scale) + tx * scale} ${VIEW_Y * (1 - scale) + ty * scale}) scale(${scale})`);

    /* AVANCEMENT DE LA CHUTE, calculé en premier : le sol en dépend.
       Elle commence pendant l'approche — l'agent du workflow sort par le haut
       avant que la liaison soit collée — et s'achève à la pose. */
    const avance = 0.74 * seg(arrivee, 0.36, 0.99) + 0.26 * seg(p, 0, POSE[0]);

    /* LE SOL SE DESSINE SOUS SES PIEDS. Il n'est pas posé quand l'agent
       arrive : il se construit pendant sa chute et prend forme juste à temps
       pour l'atterrissage. C'est l'agent qui fait apparaître le bureau, pas
       l'inverse. */
    const solPose = easeOut(seg(avance, 0.14, 0.92));

    /* Avancement de la pose de chaque zone, 0 à 1. Tout le reste en découle :
       la dalle, son agent, ses liens, et le sol qui monte dessous. */
    const posee = ZONES.map((_, i) => {
      /* La première se dessine pendant la chute, au rythme de l'agent. */
      if (rang[i] === 0) return solPose;
      const t = POSE[rang[i]];
      return easeOut(seg(p, t, t + ETALE));
    });

    dalles.forEach((d, i) => { d.style.opacity = posee[i]; });

    /* Le sol suit le nombre de dalles posées, sans jamais partir de zéro :
       une dalle seule sur du vide flotterait. */
    plateau.style.opacity = solPose * (0.32 + 0.68 * easeOut(seg(p, POSE[0], POSE[3] + ETALE)));

    /* Chaque agent arrive juste après sa dalle — la dalle d'abord, l'agent
       ensuite : on pose l'espace de travail, puis celui qui l'occupe. */
    robots.forEach(({ g }, i) => {
      const t = POSE[rang[i]];
      /* Le premier agent est visible DÈS L'APPROCHE : c'est lui qui descend,
         il ne naît de rien. Les suivants arrivent APRÈS leur dalle — on pose
         l'espace de travail, puis celui qui l'occupe. */
      g.style.opacity = rang[i] === 0
        ? seg(arrivee, 0.475, 0.505)
        : easeOut(seg(p, t + ETALE * 0.6, t + ETALE * 1.7));
    });

    /* LE PREMIER AGENT CONTINUE LA DESCENTE DU FIL. Il tombe depuis le haut
       du cadre et se pose sur la première dalle ; le fil s'éteint pile à
       l'arrivée. C'est la reprise du relais : le point devient l'agent, comme
       le bureau était devenu le point à la landing. */
    /* La descente commence PENDANT l'approche, pas à l'entrée en scène :
       l'agent du workflow sort par le haut avant que la liaison soit collée,
       et un démarrage tardif laissait un trou d'un pas de scroll sans aucun
       agent à l'écran. Les deux parts s'enchaînent sans rupture — l'approche
       mène l'essentiel du trajet, le collage finit la pose. */
    const chute = 1 - easeOut(avance);
    robots[ORDRE[0]].enveloppe.setAttribute('transform', `translate(0 ${-CHUTE * chute})`);

    borders.forEach((b, i) => {
      b.setAttribute('stroke', rgba(ZONES[i].color, 0.5 + 0.45 * posee[i]));
    });

    /* Un lien n'existe que si ses deux extrémités sont posées. */
    links.forEach((l, i) => {
      const [a, b] = PAIRES[i];
      l.style.opacity = Math.min(posee[a], posee[b]);
    });

    /* Le titre arrive quand le bureau est complet. */
    const reveal = seg(p, 0.52, 0.64);
    central.style.opacity = reveal;
    central.style.transform = `translateX(-50%) translateY(${(1 - reveal) * -14}px)`;

    /* Les bénéfices s'écartent depuis le centre, colonne de gauche vers la
       gauche, colonne de droite vers la droite. */
    benefits.forEach((b, i) => {
      const shown = easeOut(seg(p, 0.60 + i * 0.05, 0.76 + i * 0.05));
      const direction = i % 2 === 0 ? -1 : 1;
      b.style.opacity = shown;
      b.style.transform = `translateX(${(1 - shown) * direction * 40}px)`;
    });

    cue.style.opacity = easeOut(seg(p, 0.80, 0.90));

  });
}
