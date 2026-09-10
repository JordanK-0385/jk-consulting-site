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
import { claim } from '../core/thread.js';

/* Maille du plateau 4×4 — plus resserrée que la landing, l'origine diffère. */
const iso = makeIso({ cx: 600, cy: 300 });

const VIEW_X = 600;   // centre optique du cadrage
const VIEW_Y = 380;

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

  const north = iso(0, 0), east = iso(4, 0), south = iso(4, 4), west = iso(0, 4);
  const SLAB = 18;
  poly(scene, '#0A1428', points(east, south, [south[0], south[1] + SLAB], [east[0], east[1] + SLAB]));
  poly(scene, '#081020', points(south, west, [west[0], west[1] + SLAB], [south[0], south[1] + SLAB]));
  roundPath(scene, [north, east, south, west], 26, '#0E1A2E');

  /* ---------- zones de service ---------- */

  const borders = ZONES.map(({ gx, gy, color }) => {
    roundPath(scene,
      [iso(gx + .2, gy + .2), iso(gx + 1.8, gy + .2), iso(gx + 1.8, gy + 1.8), iso(gx + .2, gy + 1.8)],
      14, rgba(color, .12));

    const border = roundPath(scene,
      [iso(gx, gy), iso(gx + 2, gy), iso(gx + 2, gy + 2), iso(gx, gy + 2)],
      16, 'none', { stroke: rgba(color, .85), 'stroke-width': '2' });
    border.style.filter = `drop-shadow(0 0 6px ${rgba(color, .7)})`;

    /* bureau + écran allumé */
    poly(scene, shade(WHITE, 1.14), points(
      iso(gx + .6, gy + .55, .28), iso(gx + 1.4, gy + .55, .28),
      iso(gx + 1.4, gy + 1.05, .28), iso(gx + .6, gy + 1.05, .28)));
    const [sx, sy] = iso(gx + 1, gy + .65, .34);
    scene.appendChild(mk('rect', {
      x: sx - 9, y: sy - 13, width: 18, height: 12, rx: 3,
      fill: rgba(SCREEN, .9), transform: 'skewY(26)',
      filter: `drop-shadow(0 0 4px ${rgba(SCREEN, .8)})`,
    }));

    return border;
  });

  /* ---------- liens entre services ---------- */

  const centres = ZONES.map(z => iso(z.gx + 1, z.gy + 1, .7));
  const links = [[0, 1], [1, 3], [3, 2], [2, 0]].map(([a, b]) => {
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
    const g = mk('g', { transform: `translate(${x} ${y - 4})` });
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
    scene.appendChild(g);
    return g;
  }

  const robots = [
    robot(1, 1, ZONES[0].color),
    robot(3, 1, ZONES[1].color),
    robot(1, 3, ZONES[2].color),
    robot(3, 3, ZONES[3].color),
  ];

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

    /* ---------- reprise du fil conducteur (COMMIT-7, fermeture) ----------
       Le fil arrive du workflow, où il a repris vie en devenant l'agent
       « En service ». Il se pose ici sur l'agent Front-office — dont la
       couleur est, au triplet près, celle de l'étincelle née du bureau à la
       landing. La boucle se referme sur sa couleur d'origine, et c'est le
       mélange pondéré qui fait la bascule : aucune des deux sections ne
       connaît l'autre. */
    const ctm = scene.getScreenCTM();
    if (ctm){
      const mediane = window.innerHeight * 0.5;
      const cible = ctm.b * focusX + ctm.d * focusY + ctm.f;

      /* Pendant l'approche, l'ancre est encore loin sous l'écran : le fil
         l'ATTEND sur la médiane au lieu de plonger. Une fois la scène
         collée, il se pose dessus. Même retenue qu'à la passerelle. */
      const pose = seg(p, 0, 0.05);
      const arrivee = clamp01(1 - root.getBoundingClientRect().top / window.innerHeight);

      claim({
        x: ctm.a * focusX + ctm.c * focusY + ctm.e,
        y: mediane + (cible - mediane) * pose,
        weight: seg(arrivee, 0.15, 0.6) * (1 - seg(p, 0.05, 0.20)),
        radius: 9, color: ZONES[3].color, tail: 60,
      });
    }

    /* 0 = collé sur l'agent, 1 = maquette entière. */
    const out = easeOut(seg(p, 0, 0.5));
    const scale = 3 - 2 * out;
    const tx = (1 - out) * (VIEW_X - focusX);
    const ty = (1 - out) * (VIEW_Y - focusY);
    scene.setAttribute('transform',
      `translate(${VIEW_X * (1 - scale) + tx * scale} ${VIEW_Y * (1 - scale) + ty * scale}) scale(${scale})`);

    /* Les agents s'allument service par service. */
    robots.forEach((r, i) => { r.style.opacity = easeOut(seg(p, 0.12 + i * 0.08, 0.28 + i * 0.08)); });
    borders.forEach((b, i) => {
      b.setAttribute('stroke', rgba(ZONES[i].color, 0.5 + 0.45 * easeOut(seg(p, 0.12 + i * 0.08, 0.3 + i * 0.08))));
    });
    links.forEach((l, i) => { l.style.opacity = easeOut(seg(p, 0.4 + i * 0.03, 0.52 + i * 0.03)); });

    /* Le titre arrive quand le dézoom est bien engagé. */
    const reveal = seg(p, 0.22, 0.4);
    central.style.opacity = reveal;
    central.style.transform = `translateX(-50%) translateY(${(1 - reveal) * -14}px)`;

    /* Les bénéfices s'écartent depuis le centre, colonne de gauche vers la
       gauche, colonne de droite vers la droite. */
    benefits.forEach((b, i) => {
      const shown = easeOut(seg(p, 0.42 + i * 0.05, 0.6 + i * 0.05));
      const direction = i % 2 === 0 ? -1 : 1;
      b.style.opacity = shown;
      b.style.transform = `translateX(${(1 - shown) * direction * 40}px)`;
    });

    cue.style.opacity = easeOut(seg(p, 0.82, 0.95));
  });
}
