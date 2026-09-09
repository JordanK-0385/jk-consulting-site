/*
 * BOUCLE D'ANIMATION PARTAGÉE.
 *
 * Constat de l'audit : les protos 1, 3 et 4 lançaient chacun un
 * `requestAnimationFrame(loop)` qui ne s'arrêtait jamais. Assemblés dans une
 * page de ~18 écrans, les trois tournaient en permanence — y compris quinze
 * écrans hors champ. C'était le principal risque perf mobile du projet.
 *
 * Ici : une seule boucle, et un IntersectionObserver qui n'active que les
 * sections effectivement à l'écran. À tout instant une ou deux sections
 * calculent, jamais cinq.
 *
 * Deux régimes :
 *   - continu   : une frame par rafraîchissement, pour le mouvement ambiant ;
 *   - à la demande : une frame par scroll/resize seulement. C'est le régime
 *     retenu quand l'utilisateur a demandé moins de mouvement, ou quand
 *     l'onglet est en arrière-plan.
 */

import { prefersReducedMotion, onMotionPreferenceChange } from './motion.js';

/** @type {Map<Element, { tick: (now:number, el:Element) => void, visible: boolean }>} */
const sections = new Map();

/* Passes exécutées APRÈS toutes les sections, dans le même cadre d'animation.
   C'est ce qui permet à un élément partagé — le fil conducteur — de lire ce
   que les sections viennent de déclarer avant de se rendre. L'ordre des
   sections entre elles reste l'ordre d'enregistrement ; ce qui est garanti
   ici, c'est seulement que ces passes viennent en dernier. */
const afterTicks = new Set();

let visibleCount = 0;
let pending = false;
/* Une dernière frame quand plus rien n'est visible : sans elle, les passes
   post-sections resteraient figées sur leur dernier état alors que le fil
   doit s'éteindre en quittant la dernière scène. */
let needsSettle = false;

/** Marge de pré-chauffe : la scène est prête avant d'entrer dans le champ. */
const observer = new IntersectionObserver(entries => {
  for (const entry of entries){
    const record = sections.get(entry.target);
    if (!record || record.visible === entry.isIntersecting) continue;
    record.visible = entry.isIntersecting;
    visibleCount += entry.isIntersecting ? 1 : -1;
  }
  if (visibleCount === 0) needsSettle = true;
  schedule();
}, { rootMargin: '25% 0px 25% 0px' });

/** Faut-il enchaîner les frames sans attendre un événement ? */
function isContinuous(){
  return visibleCount > 0 && !document.hidden && !prefersReducedMotion();
}

function schedule(){
  if (pending) return;
  if (visibleCount === 0 && !needsSettle) return;
  pending = true;
  requestAnimationFrame(run);
}

function run(now){
  pending = false;
  needsSettle = false;
  for (const [el, record] of sections){
    if (record.visible) record.tick(now, el);
  }
  for (const tick of afterTicks) tick(now);
  if (isContinuous()) schedule();
}

/**
 * Enregistre la scène d'une section.
 *
 * @param {Element} el   racine de la section (celle qu'on observe)
 * @param {(now:number, el:Element) => void} tick appelée uniquement quand la section est visible
 * @returns {() => void} désenregistrement
 */
export function register(el, tick){
  if (!el) return () => {};
  /* Réenregistrer un élément déjà suivi remplace son tick. Il faut alors
     conserver son état de visibilité : `observe()` sur une cible déjà
     observée ne rejoue pas le callback de l'observer, et la nouvelle entrée
     resterait invisible — donc muette — pour toujours. */
  const connu = sections.get(el);
  sections.set(el, { tick, visible: connu?.visible ?? false });
  observer.observe(el);
  return () => {
    observer.unobserve(el);
    const record = sections.get(el);
    if (record?.visible) visibleCount--;
    sections.delete(el);
  };
}

/**
 * Enregistre une passe exécutée après toutes les sections, à chaque frame.
 * Réservé aux éléments partagés par plusieurs sections.
 *
 * @param {(now:number) => void} tick
 * @returns {() => void} désenregistrement
 */
export function registerAfter(tick){
  afterTicks.add(tick);
  schedule();
  return () => afterTicks.delete(tick);
}

/* Le scroll et le redimensionnement réveillent la boucle : c'est ce qui rend
   le régime « à la demande » suffisant pour tout ce qui est piloté au scroll. */
addEventListener('scroll', schedule, { passive: true });
addEventListener('resize', schedule, { passive: true });
document.addEventListener('visibilitychange', schedule);
onMotionPreferenceChange(schedule);
