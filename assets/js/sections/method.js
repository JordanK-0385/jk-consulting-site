/*
 * SECTION 2 — COMMENT ON FAIT · la méthode.
 * Port de prototypes/2-comment.html.
 *
 * Section éditoriale, en flux normal : pas de scène collée, pas de mouvement
 * ambiant. Un jeton descend le rail et allume les cinq étapes au passage.
 * Tout est piloté par le scroll, donc l'affichage reste complet et correct
 * même quand la boucle passe en régime « à la demande ».
 */

import { register } from '../core/raf.js';
import { midlineProgress } from '../core/scroll.js';

/* Une étape s'allume un peu avant d'atteindre la ligne médiane : sinon elle
   se déclenche pile sous le regard, ce qui se voit. (Valeur du proto.) */
const LEAD = 40;

export function initMethod(root){
  const timeline = root.querySelector('.timeline');
  const fill  = root.querySelector('.fill');
  const token = root.querySelector('.token');
  const steps = [...root.querySelectorAll('.step')];

  register(root, () => {
    const rect = timeline.getBoundingClientRect();
    const middle = window.innerHeight * 0.5;
    const travelled = midlineProgress(timeline) * rect.height;

    fill.style.height = `${travelled}px`;
    token.style.top = `${travelled}px`;
    token.classList.toggle('on', rect.top < middle && rect.bottom > 0);

    for (const step of steps){
      const box = step.getBoundingClientRect();
      step.classList.toggle('act', box.top + box.height / 2 < middle + LEAD);
    }
  });
}
