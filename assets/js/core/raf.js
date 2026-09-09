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

let visibleCount = 0;
let pending = false;

/** Marge de pré-chauffe : la scène est prête avant d'entrer dans le champ. */
const observer = new IntersectionObserver(entries => {
  for (const entry of entries){
    const record = sections.get(entry.target);
    if (!record || record.visible === entry.isIntersecting) continue;
    record.visible = entry.isIntersecting;
    visibleCount += entry.isIntersecting ? 1 : -1;
  }
  schedule();
}, { rootMargin: '25% 0px 25% 0px' });

/** Faut-il enchaîner les frames sans attendre un événement ? */
function isContinuous(){
  return visibleCount > 0 && !document.hidden && !prefersReducedMotion();
}

function schedule(){
  if (pending || visibleCount === 0) return;
  pending = true;
  requestAnimationFrame(run);
}

function run(now){
  pending = false;
  for (const [el, record] of sections){
    if (record.visible) record.tick(now, el);
  }
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
  sections.set(el, { tick, visible: false });
  observer.observe(el);
  return () => {
    observer.unobserve(el);
    const record = sections.get(el);
    if (record?.visible) visibleCount--;
    sections.delete(el);
  };
}

/* Le scroll et le redimensionnement réveillent la boucle : c'est ce qui rend
   le régime « à la demande » suffisant pour tout ce qui est piloté au scroll. */
addEventListener('scroll', schedule, { passive: true });
addEventListener('resize', schedule, { passive: true });
document.addEventListener('visibilitychange', schedule);
onMotionPreferenceChange(schedule);
