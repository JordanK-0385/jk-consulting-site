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

/* De combien l'agent « En service » glisse vers le bas de l'image en quittant
   la section, EN PLUS de la compensation du décollage. Zéro le laisserait
   immobile à l'écran ; cette valeur le fait tomber vers la liaison. */
const CHUTE_SORTIE = 150;

/* Zoom de la caméra de la liaison au moment où elle reprend l'agent : il doit
   y arriver à cette échelle, sinon il change de taille en franchissant. */
const ZOOM_LIAISON = 3;

/* Centre visuel de l'agent, dans son propre repère (il s'étend de -36 à +3). */
const PIVOT_BOT = -16.5;
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

const AXIS_X = 600;        // abscisse de l'ancre, dans le repère du viewBox
const ANCHOR_Y = 380;      // le process reste ancré ici

/*
 * Le parcours coudé (AMELIORATIONS §3). Le fil descend, prend un virage à
 * 90°, court à l'horizontale — c'est le tronçon dominant, celui où l'on lit
 * le workflow comme un canvas — puis retourne et redescend.
 *
 * Les sept jalons sont posés à intervalles de longueur ÉGALE le long du
 * chemin, si bien qu'un jalon tombe toujours à i/(N-1) de la progression :
 * le docking et l'indice du jalon actif restent inchangés.
 *
 * Longueurs : 300 vertical, 2100 horizontal, 800 vertical — soit 66% du
 * parcours à l'horizontale, et quatre jalons sur sept.
 */
const PATH_LARGE = [[600, 60], [600, 360], [2700, 360], [2700, 1160]];

/*
 * REPLI MOBILE — variante retenue après essai sur appareil réel.
 *
 * Le chiffre qui commandait : un nœud du parcours large fait 190 unités,
 * soit 92px à 390px de large, avec un titre rendu à 7.8px — illisible. Le
 * repli raccourcit donc le parcours, ce qui rapproche les nœuds, et relève
 * l'échelle : le titre remonte à 17px.
 *
 * Le virage horizontal reste réservé au grand écran. Sur mobile le fil reste
 * vertical mais serpente — décrochés latéraux de ±160 unités — ce qui garde
 * le geste sans exiger de lire un canvas sur 390px de large. Les tronçons
 * verticaux font 500 unités : plus courts, tout le parcours tenait à
 * l'écran, on le contemplait au lieu de le traverser.
 */
const PATH_MOBILE = [
  [600,  80], [600,  580], [760,  670], [760, 1170],
  [440, 1260], [440, 1760], [600, 1850], [600, 2350],
];

const CORNER_R = 56;
const MOBILE_MAX = 560;

/* Marge autour des blocs de narration : un nœud commence à s'effacer avant
   de les toucher, pas au moment du contact. */
const MARGE_NARRATION = 18;

/* Gabarit des nœuds : plus étroit et proportionnellement plus typé sur
   mobile, faute de quoi le texte tombe sous le seuil de lisibilité. */
const NODE_LARGE  = { w: 190, h: 50, tag: 10, title: 16 };
const NODE_MOBILE = { w: 200, h: 56, tag: 14, title: 20 };


/** Chemin polygonal à coins arrondis. */
function roundedPolyline(points, radius){
  const towards = (from, to, d) => {
    const dx = to[0] - from[0], dy = to[1] - from[1];
    const len = Math.hypot(dx, dy) || 1;
    return [from[0] + dx / len * d, from[1] + dy / len * d];
  };
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length - 1; i++){
    const cur = points[i];
    const a = towards(cur, points[i - 1], radius);
    const b = towards(cur, points[i + 1], radius);
    d += ` L ${a[0]} ${a[1]} Q ${cur[0]} ${cur[1]} ${b[0]} ${b[1]}`;
  }
  const last = points[points.length - 1];
  return d + ` L ${last[0]} ${last[1]}`;
}
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

  /* ---------- le workflow qui défile, le long du parcours coudé ---------- */

  /* Le monde est reconstruit quand on change de format : le parcours et le
     gabarit des nœuds diffèrent entre grand écran et mobile, et une simple
     rotation de téléphone doit suffire à basculer. */
  let measure = null, PATH_LEN = 0, nodes = [];
  let builtFor = '';

  function buildWorld(){
    const mobile = stage.clientWidth <= MOBILE_MAX;
    const key = mobile ? 'mobile' : 'large';
    if (key === builtFor) return;
    builtFor = key;

    world.replaceChildren();

    const points = mobile ? PATH_MOBILE : PATH_LARGE;
    const NODE = mobile ? NODE_MOBILE : NODE_LARGE;
    const trace = roundedPolyline(points, CORNER_R);

    /* Lueur diffuse sous le rail : donne de la matière au tracé. */
    const railGlow = mk('path', {
      d: trace, fill: 'none', stroke: rgba(CYAN, .18), 'stroke-width': '14',
      'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    });
    railGlow.style.filter = 'blur(7px)';
    world.appendChild(railGlow);

    world.appendChild(mk('path', {
      d: trace, fill: 'none', stroke: rgba(CYAN, .35), 'stroke-width': '2.5',
      'stroke-dasharray': '2 10', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    }));

    /* Chemin de mesure : sert à placer les jalons et à piloter la caméra.
       Invisible, mais bien dans le document — getPointAtLength l'exige. */
    measure = mk('path', { id: 'jk-workflow-path', d: trace, fill: 'none', stroke: 'none' });
    world.appendChild(measure);
    PATH_LEN = measure.getTotalLength();

    const atLength = i => PATH_LEN * (i / (N - 1));

    nodes = STEPS.map((step, i) => {
      const pt = measure.getPointAtLength(atLength(i));
      const g = mk('g', {});
      const left = pt.x - NODE.w / 2, top = pt.y - NODE.h / 2;

      /* Les branches du traitement s'ouvrent perpendiculairement au
         parcours : verticalement sur un tronçon horizontal, et inversement.
         Elles vivent DANS le groupe du jalon, et non à côté : elles héritent
         ainsi de son opacité et s'effacent avec lui près de la narration. */
      if (i === 2){
        const before = measure.getPointAtLength(Math.max(0, atLength(i) - 30));
        const after  = measure.getPointAtLength(Math.min(PATH_LEN, atLength(i) + 30));
        const angle = Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI;
        const branches = mk('g', { transform: `translate(${pt.x} ${pt.y}) rotate(${angle})` });
        for (const offset of [-72, 0, 72]){
          branches.appendChild(mk('path', {
            d: `M 0 -96 C ${offset} -52, ${offset} 52, 0 96`,
            fill: 'none', stroke: rgba(step.color, .45), 'stroke-width': '1.5',
          }));
          if (offset){
            branches.appendChild(mk('circle', { cx: offset, cy: 0, r: 3.5, fill: rgba(step.color, .9) }));
          }
        }
        g.appendChild(branches);
      }

      /* Nœud façon canvas n8n : c'est ce qui rend le tronçon horizontal
         lisible — trois ou quatre nœuds côte à côte doivent se nommer. */
      g.appendChild(mk('rect', {
        x: left, y: top, width: NODE.w, height: NODE.h, rx: 14,
        fill: 'rgba(12,26,46,.96)', stroke: rgba(step.color, .6), 'stroke-width': '1.6',
      }));
      g.appendChild(mk('rect', { x: left, y: top, width: 6, height: NODE.h, rx: 3, fill: rgba(step.color, 1) }));
      g.appendChild(mk('circle', { cx: left + 22, cy: pt.y, r: 5, fill: rgba(step.color, 1) }));

      const tag = mk('text', {
        x: left + 40, y: pt.y - 5, fill: '#8fa6c4',
        'font-family': 'JetBrains Mono, monospace', 'font-size': String(NODE.tag),
      });
      tag.textContent = step.tag;
      g.appendChild(tag);

      const title = mk('text', {
        x: left + 40, y: pt.y + NODE.title, fill: '#EAF1FB',
        'font-family': 'Space Grotesk, sans-serif', 'font-size': String(NODE.title), 'font-weight': '600',
      });
      title.textContent = step.title;
      g.appendChild(title);

      world.appendChild(g);
      return g;
    });

    /* Il n'y avait ici que les six paquets SMIL qui parcouraient le rail en
       boucle. Retirés : un fil conducteur, un seul point. Comme leur boucle
       ne dépendait pas du scroll, il y en avait presque toujours un juste
       au-dessus de l'ancre et un autre sous le panneau de narration — on
       lisait plusieurs billes concurrentes là où le récit n'en veut qu'une. */
  }

  buildWorld();

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
  /* Géométrie du diorama (liaison.js, robot()), à l'attribut près : c'est le
     MÊME agent qui tombera dans le bureau, il ne peut pas changer de gabarit
     en franchissant la couture. Le modèle précédent était 1.17x plus grand et
     d'un autre rapport de forme. */
  const botBody = mk('rect', { x: -10, y: -15, width: 20, height: 18, rx: 8, fill: 'url(#jk-bot-body)' });
  const botHead = mk('rect', { x: -12, y: -36, width: 24, height: 19, rx: 10, fill: 'url(#jk-bot-body)' });
  bot.append(botBody, botHead);
  bot.appendChild(mk('rect', { x: -9, y: -33, width: 18, height: 12, rx: 6, fill: '#0C1A2E' }));
  const eyes = mk('g', { class: 'eye' });
  for (const ex of [-4, 4]){
    eyes.appendChild(mk('ellipse', { cx: ex, cy: -27, rx: 2, ry: 2.7, fill: '#7FE7FF', filter: 'drop-shadow(0 0 3px #7FE7FF)' }));
  }
  bot.appendChild(eyes);

  /* ---------- cadrage responsive ---------- */

  function fit(){
    /* Sur mobile, l'échelle est calculée pour que le titre d'un nœud reste
       au-dessus du seuil de lisibilité : 20 unités de viewBox rendues à
       environ 13px à l'écran. */
    const scale = stage.clientWidth <= MOBILE_MAX ? 2 : 1;
    fitG.setAttribute('transform',
      `translate(${AXIS_X} ${ANCHOR_Y}) scale(${scale}) translate(${-AXIS_X} ${-ANCHOR_Y})`);
  }
  fit();
  addEventListener('resize', () => { buildWorld(); fit(); }, { passive: true });

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
      /* Le poids retombe : le blob est déjà là, le token se fond en lui
         plutôt que de le doubler.

         Et il NE REVIENT PAS. Une version précédente le rallumait en fin de
         section pour qu'il descende jusqu'à la liaison — mais à ce moment le
         process EST déjà devenu l'agent « En service ». Rallumer un point
         faisait régresser le récit : robot, puis bille, puis robot à nouveau.
         C'est l'agent lui-même qui continue, et la liaison le reprend sous
         cette forme. */
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

    /* Caméra : on centre le point courant du parcours sur l'ancre. Sur le
       tronçon horizontal, le même scroll vertical fait donc défiler l'image
       latéralement — c'est tout le geste. */
    if (!measure || !PATH_LEN) return;
    const head = measure.getPointAtLength(PATH_LEN * p);
    world.setAttribute('transform', `translate(${AXIS_X - head.x} ${ANCHOR_Y - head.y})`);

    /* Horizontalité du parcours au point courant, lue sur la tangente.
       Elle déplace la narration hors du couloir que les nœuds occupent
       désormais — voir s3-workflow.css. */
    const avant = measure.getPointAtLength(Math.max(0, PATH_LEN * p - 24));
    const apres = measure.getPointAtLength(Math.min(PATH_LEN, PATH_LEN * p + 24));
    const dx = apres.x - avant.x, dy = apres.y - avant.y;
    const horiz = Math.abs(dx) / (Math.abs(dx) + Math.abs(dy) || 1);
    stage.style.setProperty('--horiz', horiz.toFixed(3));
    stage.classList.toggle('is-horizontal', horiz > 0.5);

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

    /* PUIS IL SE DÉTACHE DU NŒUD ET TOMBE.

       Sans cela il remontait avec la scène qui se décolle — mesuré de y=429 à
       y=9 — pendant qu'un SECOND agent apparaissait déjà en bas dans la
       liaison : quatre échantillons de scroll avec deux robots à l'écran, l'un
       montant, l'autre posé. On lisait un respawn, pas une continuité.

       Il descend donc à contre-courant du décollage. La scène monte d'un écran
       pendant la sortie ; on le translate d'autant, plus la chute voulue, ce
       qui le maintient puis le fait glisser vers le bas de l'image. Il passe
       sous le bord supérieur de la liaison, qui recouvre la section — et c'est
       exactement là que son agent le reprend, au même pixel. */
    if (ctm && ctm.d){
      const bas = root.getBoundingClientRect().bottom;
      const sortie = clamp01(1 - bas / window.innerHeight);
      const glisse = sortie * (window.innerHeight + CHUTE_SORTIE);

      /* Et il GROSSIT en tombant. La liaison le reprend sous une caméra
         zoomée 3x sur la première dalle : sans cette croissance il passait de
         33x53 à 121x139 d'un échantillon à l'autre. Il rejoint donc l'échelle
         de la liaison avant d'atteindre la frontière. Le pivot est son centre
         visuel, sinon la mise à l'échelle le décalerait. */
      const grossit = 1 + (ZOOM_LIAISON - 1) * seg(sortie, 0, 0.46);
      bot.setAttribute('transform',
        `translate(0 ${(glisse / ctm.d).toFixed(1)}) translate(0 ${PIVOT_BOT}) scale(${grossit.toFixed(3)}) translate(0 ${-PIVOT_BOT})`);
    }
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

    /* Un nœud s'efface avant d'entrer dans la narration. Les panneaux sont
       posés à l'écran, les nœuds défilent : sans cela, un jalon en sortie de
       champ passe sous le titre de section et deux textes se superposent une
       fraction de seconde. On mesure le recouvrement réel plutôt que de
       coder des zones en dur, pour que la règle tienne quels que soient le
       format, le parcours et la position des panneaux. */
    const zones = [milestone, governance]
      .map(el => el.getBoundingClientRect())
      .filter(z => z.width > 0 && z.height > 0);

    nodes.forEach((node, i) => {
      /* Pulsation d'accostage, proportionnelle à la proximité : le jalon
         s'intensifie à mesure que le parcours s'immobilise sur lui. */
      const proche = dockNearness(i - curseur, 0.6);

      const box = node.getBoundingClientRect();
      let recouvrement = 0;
      if (box.width && box.height){
        for (const z of zones){
          const dx = Math.min(box.right, z.right + MARGE_NARRATION) - Math.max(box.left, z.left - MARGE_NARRATION);
          const dy = Math.min(box.bottom, z.bottom + MARGE_NARRATION) - Math.max(box.top, z.top - MARGE_NARRATION);
          if (dx > 0 && dy > 0){
            recouvrement = Math.max(recouvrement, (dx * dy) / (box.width * box.height));
          }
        }
      }
      const clarte = clamp01(1 - recouvrement * 1.6);

      node.style.filter = proche > 0
        ? `drop-shadow(0 0 ${8 + proche * 12}px ${rgba(STEPS[i].color, 0.45 + proche * 0.45)})`
        : 'none';
      node.style.opacity = (Math.abs(i - curseur) < 1.6 ? 1 : .5) * clarte;
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
