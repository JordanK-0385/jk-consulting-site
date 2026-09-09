/*
 * Point d'entrée du site.
 *
 * Chaque section est un module autonome qui reçoit sa racine DOM et
 * s'enregistre lui-même auprès de la boucle partagée. Aucun module ne fait
 * de `getElementById` global : c'est ce qui règle les collisions d'ID
 * relevées à l'audit (#scroll, #svg, #scene, #cue étaient partagés par
 * trois protos différents).
 *
 * Les sections animées sont ajoutées ici au fur et à mesure.
 */

import './core/motion.js'; // pose .reduced-motion sur <html> dès le chargement
/* Le fil conducteur est un élément de page, pas de section : il s'initialise
   ici et attend qu'une section le revendique. Tant qu'aucune ne le fait, il
   reste masqué. */
import './core/thread.js';
import { initLanding } from './sections/landing.js';
import { initMethod } from './sections/method.js';
import { initWorkflow } from './sections/workflow.js';
import { initLiaison } from './sections/liaison.js';
import { initTemoignages } from './sections/temoignages.js';

/** @type {Array<[string, (root: Element) => void]>} */
const sections = [
  ['#landing', initLanding],
  ['#methode', initMethod],
  ['#workflow', initWorkflow],
  ['#liaison', initLiaison],
  ['#temoignages', initTemoignages],
  /* La FAQ n'a pas de module : <details name> gère l'exclusivité
     nativement, sans JavaScript (arbitrage B). */
];

for (const [selector, init] of sections){
  const root = document.querySelector(selector);
  if (root) init(root);
}
