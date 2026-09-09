/*
 * SECTION 3 — LE WORKFLOW · la métamorphose.
 * Port de prototypes/3-workflow-morph.html.
 *
 * Le process est bloqué au centre et le workflow défile à travers lui.
 * Le jeton se métamorphose en continu : forme brute orange -> lissée ->
 * structurée -> satellites -> cœur -> ondes -> robot vert (SPECS §3).
 */

import { mk } from '../core/svg.js';
import { rgba, lerp, seg } from '../core/color.js';
import { register } from '../core/raf.js';
import { stickyProgress } from '../core/scroll.js';
import { claim } from '../core/thread.js';
import { makeDock, dockNearness } from '../core/dock.js';
import { clamp01 } from '../core/color.js';
import { ambientTime, prefersReducedMotion } from '../core/motion.js';

const BLUE   = [ 79, 168, 240];
const INDIGO = [110, 123, 242];
const TEAL   = [ 63, 214, 200];
const CYAN   = [127, 227, 255];
const GREEN  = [110, 220, 150];
const ORANGE = [242, 150,  78];

/* Couleurs de la métamorphose, dans l'ordre de SPECS §2 : orange brut,
   bleu, indigo, teal, bleu, cyan, vert « en service ». Les textes, eux,
   vivent dans le balisage (.steps-source) et sont lus au démarrage : une
   seule source, et modifiable sans toucher au JavaScript. */
const STEP_COLORS = [ORANGE, BLUE, INDIGO, TEAL, BLUE, CYAN, GREEN];

function readSteps(root){
  const items = [...root.querySelectorAll('.steps-source > li')];
  return items.map((li, i) => ({
    tag:   li.dataset.tag,
    title: li.querySelector('h3').textContent,
    lead:  li.querySelector('.lead').textContent,
    body:  li.querySelector('.detail').textContent,
    color: STEP_COLORS[i] ?? CYAN,
  }));
}

const SPACING = 300;       // écart vertical entre jalons, en unités viewBox
const AXIS_X = 600;        // le workflow défile sur cet axe
const ANCHOR_Y = 380;      // le process reste ancré ici
const SWAP_MS = 180;       // temps de fondu avant d'échanger le texte

/* Teinte interpolée le long du parcours : la métamorphose est continue,
   pas une suite de paliers. */
const makeTint = (steps) => p => {
  const scaled = p * (steps.length - 1);
  const i = Math.min(steps.length - 2, Math.floor(scaled));
  return lerp(steps[i].color, steps[i + 1].color, scaled - i);
};

/* Bruit fixe de la forme brute : identique d'un chargement à l'autre. */
const LOBES = 9;
const WOBBLE = Array.from({ length: LOBES }, (_, i) =>
  (Math.sin(i * 12.9898) * 43758.5453) % 1 * 0.9 - 0.15);

function blobPath(radius, roughness){
  const pts = [];
  for (let i = 0; i < LOBES; i++){
    const a = i / LOBES * Math.PI * 2;
    const r = radius * (1 + WOBBLE[i] * roughness);
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  let d = `M ${mid(pts[LOBES - 1], pts[0]).join(' ')}`;
  for (let i = 0; i < LOBES; i++){
    const cur = pts[i], next = pts[(i + 1) % LOBES];
    const m = mid(cur, next);
    d += ` Q ${cur[0]} ${cur[1]} ${m[0]} ${m[1]}`;
  }
  return d + ' Z';
}

export function initWorkflow(root){
  const STEPS = readSteps(root);
  if (!STEPS.length) return;
  const N = STEPS.length;
  const tintAt = makeTint(STEPS);
  /* Les jalons sont régulièrement répartis sur le parcours : le docking les
     prend comme points d'accostage. Ici le « monde » est un groupe SVG que
     l'on translate soi-même — on ralentit donc le décor, et le fil reste
     posé sur l'ancre. Mécanisme inverse de la méthode, geste identique. */
  const dock = makeDock(STEPS.map((_, i) => i / (N - 1)));

  const stage   = root.querySelector('.stage');
  const fitG    = root.querySelector('.scene-fit');
  const world   = root.querySelector('.world');
  const anchor  = root.querySelector('.anchor');
  const packets = root.querySelector('.packets');

  const milestone  = root.querySelector('.milestone');
  const governance = root.querySelector('.governance');
  const stepNoEl = root.querySelector('.step-no');
  const titleEl  = root.querySelector('.milestone .title');
  const leadEl   = root.querySelector('.governance .lead');
  /* .lead est lui-même un <p> : viser '.governance p' renvoyait le même
     élément, si bien que le corps écrasait l'accroche et que le paragraphe
     de détail restait figé sur le premier jalon. */
  const bodyEl   = root.querySelector('.governance .detail');
  const pctEl    = root.querySelector('.readout b');

  /* ---------- le workflow qui défile ---------- */

  world.appendChild(mk('line', {
    x1: AXIS_X, y1: -40, x2: AXIS_X, y2: (N - 1) * SPACING + 40,
    stroke: rgba(CYAN, .35), 'stroke-width': '2.5',
    'stroke-dasharray': '2 10', 'stroke-linecap': 'round',
  }));

  const nodes = STEPS.map((step, i) => {
    const y = i * SPACING;
    const g = mk('g', {});
    g.appendChild(mk('rect', {
      x: AXIS_X - 22, y: y - 22, width: 44, height: 44, rx: 13,
      fill: 'rgba(12,26,46,.95)', stroke: rgba(step.color, .65), 'stroke-width': '1.8',
    }));
    g.appendChild(mk('circle', {
      cx: AXIS_X, cy: y, r: 5, fill: rgba(step.color, 1),
      filter: `drop-shadow(0 0 4px ${rgba(step.color, .9)})`,
    }));
    world.appendChild(g);

    /* Le traitement se ramifie : branches parallèles, routage conditionnel. */
    if (i === 2){
      for (const offset of [-70, 0, 70]){
        world.appendChild(mk('path', {
          d: `M ${AXIS_X} ${y - 70} C ${AXIS_X + offset} ${y - 40}, ${AXIS_X + offset} ${y + 40}, ${AXIS_X} ${y + 70}`,
          fill: 'none', stroke: rgba(step.color, .5), 'stroke-width': '1.5',
        }));
        if (offset){
          world.appendChild(mk('circle', { cx: AXIS_X + offset, cy: y, r: 3.5, fill: rgba(step.color, .9) }));
        }
      }
    }
    return g;
  });

  /* Paquets SMIL entre jalons — masqués par CSS en mouvement réduit. */
  for (let i = 0; i < N - 1; i++){
    const dot = mk('circle', { r: 3, fill: '#7FE3FF', filter: 'drop-shadow(0 0 4px #7FE3FF)' });
    dot.appendChild(mk('animateMotion', {
      dur: '1.4s', repeatCount: 'indefinite',
      path: `M ${AXIS_X} ${i * SPACING} L ${AXIS_X} ${(i + 1) * SPACING}`,
    }));
    packets.appendChild(dot);
  }

  /* ---------- l'ancre : le process qui se métamorphose ---------- */

  const morph = mk('g', { transform: `translate(${AXIS_X} ${ANCHOR_Y})` });
  anchor.appendChild(morph);

  const halo = mk('circle', { cx: 0, cy: 0, r: 36 });
  morph.appendChild(halo);

  const waveG = mk('g', {});
  morph.appendChild(waveG);
  const waves = [0, 1].map(() => {
    const c = mk('circle', { cx: 0, cy: 0, fill: 'none', 'stroke-width': '1.6' });
    waveG.appendChild(c);
    return c;
  });

  const blob = mk('path', {});
  morph.appendChild(blob);

  const segG = mk('g', {});
  morph.appendChild(segG);
  const segments = [[-14, -8, 14, 8], [-14, 8, 14, -8], [0, -16, 0, 16]].map(c => {
    const l = mk('line', { x1: c[0], y1: c[1], x2: c[2], y2: c[3], 'stroke-width': '1.4' });
    segG.appendChild(l);
    return l;
  });

  const core = mk('circle', { cx: 0, cy: 0, r: 6 });
  morph.appendChild(core);

  const satG = mk('g', {});
  morph.appendChild(satG);
  const satellites = [0, 1, 2].map(() => {
    const c = mk('circle', { r: 3.4 });
    satG.appendChild(c);
    return c;
  });

  /* L'agent en service : l'aboutissement de la métamorphose. */
  const bot = mk('g', {});
  bot.style.opacity = 0;
  morph.appendChild(bot);
  const botBody = mk('rect', { x: -12, y: -15, width: 24, height: 20, rx: 9, fill: 'url(#jk-bot-body)' });
  const botHead = mk('rect', { x: -14, y: -40, width: 28, height: 22, rx: 11, fill: 'url(#jk-bot-body)' });
  bot.append(botBody, botHead);
  bot.appendChild(mk('rect', { x: -10, y: -37, width: 20, height: 14, rx: 7, fill: '#0C1A2E' }));
  const eyes = mk('g', { class: 'eye' });
  for (const ex of [-4.5, 4.5]){
    eyes.appendChild(mk('ellipse', { cx: ex, cy: -30, rx: 2.3, ry: 3.1, fill: '#7FE7FF', filter: 'drop-shadow(0 0 3px #7FE7FF)' }));
  }
  bot.appendChild(eyes);

  /* ---------- cadrage responsive ---------- */

  function fit(){
    const scale = stage.clientWidth < 560 ? 1.5 : 1;
    fitG.setAttribute('transform',
      `translate(${AXIS_X} ${ANCHOR_Y}) scale(${scale}) translate(${-AXIS_X} ${-ANCHOR_Y})`);
  }
  fit();
  addEventListener('resize', fit, { passive: true });

  /* ---------- boucle ---------- */

  let current = -1;
  let swapTimer = 0;
  let lastGlow = '';

  register(root, now => {
    const p = dock(stickyProgress(root));
    const t = ambientTime(now);

    /* Approche : 0 quand la section entre par le bas, 1 quand elle occupe le
       viewport. stickyProgress reste à 0 pendant toute l'approche et ne peut
       donc pas la mesurer. Sert à la fois de montée en poids du fil et
       d'éveil du process. */
    const arrivee = clamp01(1 - root.getBoundingClientRect().top / window.innerHeight);

    /* ---------- revendication du fil conducteur ----------
       Le token arrive du rail de la méthode et se pose exactement sur
       l'ancre du process, où le blob prend le relais. getScreenCTM() rend
       la position écran de l'ancre quels que soient le viewBox et
       l'échelle mobile : c'est le seul pont fiable entre les repères. */
    const ctm = morph.getScreenCTM();
    if (ctm){
      /* Puis le poids retombe : le blob est déjà là, le token se fond en lui
         plutôt que de le doubler. */
      const releve = 1 - seg(p, 0.02, 0.10);

      /* Pendant l'approche, l'ancre est encore basse dans l'écran. Le token
         l'ATTEND sur la médiane au lieu de plonger à sa rencontre — sans
         quoi la couture montre un saut de plusieurs centaines de pixels.
         Une fois la scène collée, les deux coïncident, et à la sortie le
         token suit l'ancre qui remonte. */
      const mediane = window.innerHeight * 0.5;
      claim({
        x: ctm.e, y: Math.min(ctm.f, mediane),
        weight: seg(arrivee, 0.10, 0.55) * releve,
        radius: 9, color: CYAN, tail: 70,
      });
    }

    world.setAttribute('transform', `translate(0 ${ANCHOR_Y - p * (N - 1) * SPACING})`);

    const tint = tintAt(p);
    const asRobot = seg(p, 0.88, 1);
    const asShape = 1 - asRobot;
    const breathe = 1 + Math.sin(t * 0.003) * 0.04;

    /* Le process reste en veille tant que le fil ne l'a pas atteint, puis
       s'allume à son arrivée. Cause puis effet : on ne montre jamais deux
       points également brillants en même temps, ce qui lèverait toute
       ambiguïté sur lequel des deux mène le récit. */
    const eveil = 0.32 + 0.68 * seg(arrivee, 0.5, 0.97);

    /* Forme brute -> lissée : le nettoyage lisse littéralement le process. */
    const roughness = Math.max(0, 1 - p / 0.13);
    blob.setAttribute('d', blobPath(22 * breathe, roughness));
    blob.setAttribute('fill', rgba(tint, 0.4 * asShape * eveil));
    blob.setAttribute('stroke', rgba(tint, 0.95 * asShape * eveil));
    blob.setAttribute('stroke-width', '1.6');

    halo.setAttribute('r', 34 + Math.sin(t * 0.003) * 3);
    halo.setAttribute('fill', rgba(tint, (0.16 * asShape + 0.05 * asRobot) * eveil));

    /* Structure interne — traitement. */
    segG.style.opacity = seg(p, 0.28, 0.42) * asShape;
    for (const line of segments) line.setAttribute('stroke', rgba(tint, 0.85));

    /* Satellites — enrichissement. */
    satG.style.opacity = seg(p, 0.42, 0.58) * asShape;
    satellites.forEach((sat, i) => {
      const a = t * 0.002 + i * 2.094;
      sat.setAttribute('cx', Math.cos(a) * 32);
      sat.setAttribute('cy', Math.sin(a) * 32);
      sat.setAttribute('fill', rgba(tint, 0.95));
    });

    /* Cœur — écriture. */
    core.style.opacity = seg(p, 0.58, 0.72) * asShape;
    core.setAttribute('fill', rgba(lerp(tint, [255, 255, 255], 0.4), 0.95));

    /* Ondes — notification. */
    waveG.style.opacity = seg(p, 0.72, 0.86) * asShape;
    waves.forEach((wave, i) => {
      const phase = ((t + i * 800) % 1600) / 1600;
      wave.setAttribute('r', 18 + phase * 26);
      wave.setAttribute('stroke', rgba(tint, (1 - phase) * 0.8));
    });

    /* L'agent prend la place de la forme. */
    bot.style.opacity = asRobot;
    for (const part of [botBody, botHead]){
      part.setAttribute('stroke', rgba(tint, 0.9));
      part.setAttribute('stroke-width', '1.3');
    }

    /* Le filtre est coûteux à recalculer : on n'écrit que s'il change. */
    const glow = `drop-shadow(0 0 ${11 + asRobot * 4}px ${rgba(tint, 0.8 * eveil)})`;
    if (glow !== lastGlow){ morph.style.filter = glow; lastGlow = glow; }

    /* Jalon actif. */
    const index = Math.max(0, Math.min(N - 1, Math.round(p * (N - 1))));
    const curseur = p * (N - 1);
    nodes.forEach((node, i) => {
      /* Pulsation d'accostage, proportionnelle à la proximité : le jalon
         s'intensifie à mesure que le parcours s'immobilise sur lui. */
      const proche = dockNearness(i - curseur, 0.6);
      node.style.filter = proche > 0
        ? `drop-shadow(0 0 ${8 + proche * 12}px ${rgba(STEPS[i].color, 0.45 + proche * 0.45)})`
        : 'none';
      node.style.opacity = Math.abs(i - curseur) < 1.6 ? 1 : .5;
    });

    pctEl.textContent = `${Math.round(p * 100)}%`;

    if (index !== current){
      current = index;
      const step = STEPS[index];
      milestone.classList.add('swapping');
      governance.classList.add('swapping');
      /* Un scroll rapide enchaîne les jalons : sans ce garde-fou, les
         minuteries s'empilaient et le texte pouvait se poser en retard,
         voire dans le désordre. */
      clearTimeout(swapTimer);
      swapTimer = setTimeout(() => {
        stepNoEl.textContent = `ÉTAPE 0${index + 1} / 0${N} · ${step.tag}`;
        titleEl.textContent = step.title;
        leadEl.textContent = step.lead;
        bodyEl.textContent = step.body;
        milestone.classList.remove('swapping');
        governance.classList.remove('swapping');
      }, prefersReducedMotion() ? 0 : SWAP_MS);
    }
  });
}
