/*
 * Point d'entrée du site.
 *
 * Chaque section est un module autonome qui reçoit sa racine DOM et
 * s'enregistre lui-même auprès de la boucle partagée. Aucun module ne fait
 * de `getElementById` global : c'est ce qui règle les collisions d'ID
 * relevées à l'audit (#scroll, #svg, #scene, #cue étaient partagés par
 * trois protos différents).
 *
 * Les sections sont ajoutées ici au fur et à mesure des étapes 2 à 7.
 */

import './core/motion.js'; // pose .reduced-motion sur <html> dès le chargement

/** @type {Array<[string, (root: Element) => void]>} */
const sections = [
  // ['#landing',      initLanding],   — étape 2
  // ['#methode',      initMethod],    — étape 3
  // ['#workflow',     initWorkflow],  — étape 4
  // ['#liaison',      initLiaison],   — étape 5
  // ['#faq',          initFaq],       — étape 7
];

for (const [selector, init] of sections){
  const root = document.querySelector(selector);
  if (root) init(root);
}
