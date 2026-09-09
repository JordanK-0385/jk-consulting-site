/*
 * SECTION 1 — LANDING · le résultat.
 * Port de prototypes/1-landing.html.
 *
 * Le bureau isométrique est déjà installé : écrans allumés, un agent par
 * service, liens tissés. C'est le résultat, montré avant la méthode.
 */

import { mk, poly, roundPath, points, makeIso } from '../core/svg.js';
import { rgb, rgba, shade, seg, easeOut, clamp01 } from '../core/color.js';
import { register } from '../core/raf.js';
import { stickyProgress } from '../core/scroll.js';
import { ambientTime, prefersReducedMotion } from '../core/motion.js';
import { claim } from '../core/thread.js';

/*
 * L'ORIGINE DU FIL (COMMIT-7.md, ouverture).
 *
 * Le bureau — le résultat — se ramasse en une seule étincelle, et cette
 * étincelle EST le token qui traversera tout le site. On comprend d'où vient
 * la boule de lumière : c'est le résultat rembobiné jusqu'à son origine.
 *
 * Le point de convergence est le centre du plateau, qui sert déjà de pivot
 * au cadrage responsive. Le fond, lui, n'est pas interpolé ici : le raccord
 * de couture vers la méthode s'en charge déjà.
 */
const CONDENSE = [0.45, 0.92];   // le bureau se ramasse
const ETINCELLE = [0.58, 0.90];  // le token prend sa place
const NEON = [127, 227, 255];

/* Maille isométrique du plateau 8×8 (valeurs du proto). */
const iso = makeIso({ cx: 600, cy: 110 });

/* Centre optique du plateau — pivot du cadrage responsive. */
const [PIVOT_X, PIVOT_Y] = iso(4, 4);

const FLOOR_TOP  = [16, 32, 58];
const FLOOR_SIDE = [10, 22, 42];
const WHITE      = [220, 232, 246];
const DARK       = [24, 40, 66];
const SCREEN     = [111, 224, 255];

/* Un service = une couleur de la palette SPECS §2.
   Le proto utilisait #4FD0F0 pour le Front-office — une cinquième teinte
   absente de SPECS, à deux doigts du cyan néon. Alignée sur --neon-cyan. */
const ZONES = [
  { name: 'Direction',    color: [110, 123, 242], gx: 0, gy: 0 }, // indigo
  { name: 'Sales',        color: [ 79, 168, 240], gx: 4, gy: 0 }, // bleu
  { name: 'Back-office',  color: [ 63, 214, 200], gx: 0, gy: 4 }, // teal
  { name: 'Front-office', color: [127, 227, 255], gx: 4, gy: 4 }, // cyan
];

/* Bruit déterministe : les barres des panneaux holo et les motes ne doivent
   pas changer à chaque rechargement (comparaison de captures à la relecture). */
function seeded(i){
  const v = Math.sin(i * 12.9898) * 43758.5453;
  return v - Math.floor(v);
}

export function initLanding(root){
  const stage  = root.querySelector('.stage');
  const svg    = root.querySelector('.scene-svg');
  const fitG   = svg.querySelector('.scene-fit');
  const sceneG = svg.querySelector('.scene');
  const holosG = svg.querySelector('.holos');
  const motesG = svg.querySelector('.motes');
  const hero   = root.querySelector('.hero');
  const cue    = root.querySelector('.cue');

  /* ---------- volumes isométriques ---------- */

  const box = (gx, gy, w, d, h, body) => {
    poly(sceneG, shade(body, .80), points(iso(gx, gy + d, h), iso(gx + w, gy + d, h), iso(gx + w, gy + d, 0), iso(gx, gy + d, 0)));
    poly(sceneG, shade(body, .56), points(iso(gx + w, gy, h), iso(gx + w, gy + d, h), iso(gx + w, gy + d, 0), iso(gx + w, gy, 0)));
    poly(sceneG, shade(body, 1.14), points(iso(gx, gy, h), iso(gx + w, gy, h), iso(gx + w, gy + d, h), iso(gx, gy + d, h)));
  };

  const shadow = (gx, gy, w, d) => {
    const [x, y] = iso(gx + w / 2, gy + d / 2);
    sceneG.appendChild(mk('ellipse', { cx: x, cy: y, rx: 24 * w, ry: 12 * d, fill: 'rgba(0,0,0,.28)', filter: 'url(#jk-soft)' }));
  };

  const screen = (gx, gy) => {
    box(gx, gy, 0.14, 0.34, 0.34, DARK);
    const [x, y] = iso(gx + 0.07, gy + 0.17, 0.34);
    sceneG.appendChild(mk('rect', {
      x: x - 11, y: y - 16, width: 22, height: 14, rx: 3,
      fill: rgba(SCREEN, .9), transform: 'skewY(26)',
      filter: `drop-shadow(0 0 4px ${rgba(SCREEN, .9)})`,
    }));
  };

  const desk  = (gx, gy, w = 1, d = 0.6) => { shadow(gx, gy, w, d); box(gx, gy, w, d, 0.3, WHITE); };
  const chair = (gx, gy) => { box(gx, gy, 0.34, 0.34, 0.24, [70, 86, 120]); box(gx, gy, 0.34, 0.1, 0.5, [60, 74, 104]); };

  const plant = (gx, gy) => {
    box(gx + 0.1, gy + 0.1, 0.2, 0.2, 0.24, [40, 60, 90]);
    const [x, y] = iso(gx + 0.2, gy + 0.2, 0.5);
    sceneG.appendChild(mk('ellipse', { cx: x, cy: y, rx: 14, ry: 12, fill: '#3FD6C8', opacity: .85, filter: 'drop-shadow(0 0 4px rgba(63,214,200,.7))' }));
  };

  const partition = (gx, gy, w, d) => poly(
    sceneG, 'rgba(110,140,220,.14)',
    points(iso(gx, gy + d, 1.4), iso(gx + w, gy + d, 1.4), iso(gx + w, gy + d, 0), iso(gx, gy + d, 0)),
    { stroke: rgba([120, 180, 240], .5), 'stroke-width': '1' },
  );

  const server = (gx, gy) => {
    shadow(gx, gy, 0.5, 0.5);
    box(gx, gy, 0.5, 0.5, 1.5, [26, 44, 72]);
    for (let k = 0; k < 3; k++){
      const [x, y] = iso(gx + 0.15 + k * 0.12, gy + 0.15, 1.35 - k * 0.06);
      sceneG.appendChild(mk('circle', { cx: x, cy: y, r: 2.4, fill: '#6FE0FF', class: 'pulse' }));
    }
  };

  const sofa = (gx, gy, w) => {
    shadow(gx, gy, w, 0.6);
    box(gx, gy, w, 0.6, 0.28, [54, 80, 130]);
    box(gx, gy, w, 0.16, 0.5, [44, 68, 116]);
  };

  /* ---------- plateau et zones ---------- */

  const north = iso(0, 0), east = iso(8, 0), south = iso(8, 8), west = iso(0, 8);
  const SLAB = 20;
  poly(sceneG, rgb(FLOOR_SIDE),        points(east, south, [south[0], south[1] + SLAB], [east[0], east[1] + SLAB]));
  poly(sceneG, shade(FLOOR_SIDE, .85), points(south, west, [west[0], west[1] + SLAB], [south[0], south[1] + SLAB]));
  roundPath(sceneG, [north, east, south, west], 28, rgb(FLOOR_TOP));

  for (const zone of ZONES){
    const { gx, gy, color } = zone;
    roundPath(sceneG, [iso(gx + .3, gy + .3), iso(gx + 3.7, gy + .3), iso(gx + 3.7, gy + 3.7), iso(gx + .3, gy + 3.7)], 20, rgba(color, .12));
    const border = roundPath(
      sceneG,
      [iso(gx, gy), iso(gx + 4, gy), iso(gx + 4, gy + 4), iso(gx, gy + 4)],
      24, 'none',
      { stroke: rgba(color, .95), 'stroke-width': '2.5', class: 'pulse' },
    );
    border.style.filter = `drop-shadow(0 0 7px ${rgba(color, .9)})`;
  }

  /* ---------- mobilier : le bureau est déjà installé ---------- */

  partition(0.2, 3.6, 3.4, 0.12);
  partition(3.6, 0.2, 0.12, 3.4);

  desk(1.4, 1.2, 1.3, 0.7); chair(1.9, 2.0); screen(1.7, 1.35);
  box(0.4, 0.4, 0.4, 1.2, 1.1, WHITE);
  plant(3.0, 0.5); plant(0.5, 3.0);

  for (let r = 0; r < 2; r++){
    for (let c = 0; c < 2; c++){
      const gx = 4.5 + c * 1.7, gy = 0.7 + r * 1.7;
      desk(gx, gy, 1.1, 0.6); screen(gx + 0.35, gy + 0.15); chair(gx + 0.4, gy + 0.75);
    }
  }

  server(0.5, 4.5); server(1.2, 4.5); server(0.5, 5.2);
  desk(2.3, 6.3, 1, 0.6); screen(2.6, 6.45); chair(2.65, 7.0);
  box(4.6, 4.6, 1.6, 0.6, 0.45, WHITE); screen(5.2, 4.72);
  sofa(6.2, 6.4, 1.4); plant(4.5, 7.2); plant(7.3, 4.5);

  /* ---------- agents : discrets, un par service (SPECS §2) ---------- */

  function robot(gx, gy, color, floatClass){
    const [x, y] = iso(gx, gy);
    const group = mk('g', { transform: `translate(${x} ${y - 4}) scale(.92)` });
    group.appendChild(mk('ellipse', { cx: 0, cy: 2, rx: 15, ry: 6, fill: 'rgba(0,0,0,.3)', filter: 'url(#jk-soft)' }));

    const floating = mk('g', { class: floatClass });
    floating.appendChild(mk('ellipse', { cx: 0, cy: -16, rx: 20, ry: 20, fill: rgba(color, .18), filter: 'url(#jk-soft)' }));
    floating.appendChild(mk('rect', { x: -11, y: -16, width: 22, height: 20, rx: 9, fill: 'url(#jk-bot-body)', stroke: rgba(color, .85), 'stroke-width': '1.3' }));
    floating.appendChild(mk('circle', { cx: 0, cy: -1, r: 3.2, fill: rgba(color, .9), filter: `drop-shadow(0 0 3px ${rgba(color, .9)})` }));
    floating.appendChild(mk('rect', { x: -13, y: -40, width: 26, height: 22, rx: 11, fill: 'url(#jk-bot-body)', stroke: rgba(color, .85), 'stroke-width': '1.3' }));
    floating.appendChild(mk('rect', { x: -10, y: -37, width: 20, height: 15, rx: 7, fill: '#0C1A2E' }));

    const eyes = mk('g', { class: 'eye' });
    for (const ex of [-4.5, 4.5]){
      eyes.appendChild(mk('ellipse', { cx: ex, cy: -29.5, rx: 2.4, ry: 3.2, fill: '#7FE7FF', filter: 'drop-shadow(0 0 3px #7FE7FF)' }));
    }
    floating.appendChild(eyes);
    floating.appendChild(mk('line', { x1: 0, y1: -40, x2: 0, y2: -47, stroke: rgba(color, .8), 'stroke-width': '1.4' }));
    floating.appendChild(mk('circle', { cx: 0, cy: -48, r: 2, fill: rgba(color, 1), filter: `drop-shadow(0 0 3px ${rgba(color, 1)})` }));

    group.appendChild(floating);
    sceneG.appendChild(group);
  }

  robot(2.3, 1.9, ZONES[0].color, 'bot-a');
  robot(5.2, 1.4, ZONES[1].color, 'bot-b');
  robot(2.9, 6.5, ZONES[2].color, 'bot-c');
  robot(5.6, 5.0, ZONES[3].color, 'bot-d');

  /* ---------- liens entre services : déjà connectés ---------- */

  const centres = ZONES.map(z => iso(z.gx + 2, z.gy + 2, 0.9));
  for (const [a, b] of [[0, 1], [1, 3], [3, 2], [2, 0], [0, 3]]){
    const A = centres[a], B = centres[b];
    const link = mk('path', {
      d: `M ${A[0]} ${A[1]} Q ${(A[0] + B[0]) / 2} ${(A[1] + B[1]) / 2 - 48} ${B[0]} ${B[1]}`,
      fill: 'none', stroke: rgba(SCREEN, .55), 'stroke-width': '1.4', class: 'pulse',
    });
    link.style.filter = `drop-shadow(0 0 4px ${rgba(SCREEN, .7)})`;
    sceneG.appendChild(link);
  }

  /* ---------- panneaux holographiques ---------- */

  let noise = 0;
  function holo(x, y, w, h){
    const group = mk('g', { transform: `translate(${x} ${y})`, class: 'holo' });
    group.appendChild(mk('rect', { x: 0, y: 0, width: w, height: h, rx: 8, fill: 'rgba(79,168,240,.10)', stroke: 'rgba(127,227,255,.5)', 'stroke-width': '1' }));
    for (let i = 0; i < 4; i++){
      group.appendChild(mk('rect', { x: 12, y: 14 + i * 13, width: (w - 24) * (0.4 + seeded(++noise) * 0.55), height: 4, rx: 2, fill: 'rgba(127,227,255,.55)' }));
    }
    holosG.appendChild(group);
  }
  holo(120, 120, 150, 88);
  holo(940, 150, 160, 96);
  holo(980, 430, 140, 80);

  /* ---------- poussières lumineuses ---------- */

  const motes = [];
  for (let i = 0; i < 24; i++){
    const el = mk('circle', { r: seeded(i + 100) * 1.3 + .4, fill: 'rgba(127,227,255,.5)' });
    motesG.appendChild(el);
    motes.push({
      el,
      x: seeded(i + 200) * 1200,
      y: seeded(i + 300) * 760,
      vy: -(0.06 + seeded(i + 400) * 0.1),
      phase: seeded(i + 500) * 6.28,
    });
  }

  /* ---------- cadrage responsive ----------
     Le viewBox 1200×760 en « meet » se réduit à la largeur : sur un écran
     étroit et haut, la scène devenait minuscule entre deux bandes vides.
     On agrandit et on remonte le plateau, le héros s'assoit dessous. */

  function fit(){
    const narrow = stage.clientWidth < 720;
    const scale = narrow ? 1.34 : 1;
    const lift  = narrow ? -96 : 0;
    fitG.setAttribute(
      'transform',
      `translate(0 ${lift}) translate(${PIVOT_X} ${PIVOT_Y}) scale(${scale}) translate(${-PIVOT_X} ${-PIVOT_Y})`,
    );
  }
  fit();
  addEventListener('resize', fit, { passive: true });

  /* ---------- parallaxe au pointeur (arbitrage C) ----------
     Uniquement sur pointeur fin : sur tactile elle ne sert à rien et ne
     coûterait que des recalculs. */

  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let px = 0, py = 0;

  function onPointerMove(event){
    px = event.clientX / innerWidth - 0.5;
    py = event.clientY / innerHeight - 0.5;
  }
  function syncPointer(){
    if (finePointer.matches){
      addEventListener('pointermove', onPointerMove, { passive: true });
    } else {
      removeEventListener('pointermove', onPointerMove);
      px = py = 0;
    }
  }
  syncPointer();
  finePointer.addEventListener('change', syncPointer);

  /* ---------- boucle ---------- */

  register(root, now => {
    const p = stickyProgress(root);
    const t = ambientTime(now);
    const still = prefersReducedMotion();

    /* En mouvement réduit la parallaxe est neutralisée : elle suit le
       pointeur, donc elle bouge sans que l'utilisateur l'ait demandé. */
    const mx = still ? 0 : px;
    const my = still ? 0 : py;

    /* Condensation : une échelle autour du centre du plateau, jusqu'à un
       point. L'oscillation ambiante s'apaise en même temps — une étincelle
       qui tremblerait encore trahirait le bureau disparu. */
    const ramasse = easeOut(seg(p, CONDENSE[0], CONDENSE[1]));
    const calme = 1 - ramasse;
    const echelle = 1 - 0.97 * ramasse;

    const ax = (Math.sin(t * 0.0004) * 7 + mx * 34) * calme;
    const ay = (Math.cos(t * 0.0005) * 4 + my * 18) * calme - p * 60;
    sceneG.setAttribute('transform',
      `translate(${ax} ${ay}) translate(${PIVOT_X} ${PIVOT_Y}) scale(${echelle}) translate(${-PIVOT_X} ${-PIVOT_Y})`);
    sceneG.style.opacity = 1 - seg(p, 0.74, 0.93);

    holosG.setAttribute('transform', `translate(${mx * -20} ${my * -12 - p * 30})`);
    holosG.style.opacity = 1 - seg(p, 0.42, 0.62);

    /* ---------- naissance du fil conducteur ----------
       Le point est pris sur la matrice écran de la scène : il suit donc
       exactement là où le bureau converge, quels que soient le cadrage et
       l'échelle mobile. */
    const ctm = sceneG.getScreenCTM();
    if (ctm){
      const naissance = easeOut(seg(p, ETINCELLE[0], ETINCELLE[1]));
      const mediane = window.innerHeight * 0.5;

      /* Une fois la section décollée, la scène remonte et sort de l'écran.
         Le fil ne la suit pas : il se tient sur la médiane et attend que la
         méthode le reprenne. Sans cette retenue, il partait à y=-101 puis
         revenait d'un bond de 554px. */
      const y = ctm.b * PIVOT_X + ctm.d * PIVOT_Y + ctm.f;

      /* Et son poids retombe à mesure que la section sort, exactement dans
         la fenêtre où celui de la méthode monte : c'est le même passage de
         relais que sur la couture méthode -> workflow. */
      const bas = root.getBoundingClientRect().bottom;
      const sortie = clamp01(1 - bas / window.innerHeight);

      claim({
        x: ctm.a * PIVOT_X + ctm.c * PIVOT_Y + ctm.e,
        y: Math.max(y, mediane),
        weight: naissance * (1 - seg(sortie, 0.25, 0.85)),
        radius: 5 + naissance * 4,
        color: NEON,
        tail: naissance * 70,
      });
    }

    hero.style.opacity = Math.max(0, 1 - p / 0.55);
    hero.style.transform = `translateY(${-p * 70}px)`;
    cue.style.opacity = Math.max(0, 1 - p / 0.3);

    for (const mote of motes){
      /* La dérive est un intégrateur : `ambientTime` ne suffit pas à
         l'arrêter, il faut couper l'incrément lui-même. */
      if (!still){
        mote.y += mote.vy;
        if (mote.y < -6){ mote.y = 766; mote.x = Math.random() * 1200; }
      }
      mote.el.setAttribute('cx', mote.x + Math.sin(t * 0.001 + mote.phase) * 6);
      mote.el.setAttribute('cy', mote.y);
    }
  });
}
