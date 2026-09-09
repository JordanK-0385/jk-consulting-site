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
import { claim } from '../core/thread.js';
import { clamp01, seg } from '../core/color.js';
import { makeDock, dockNearness } from '../core/dock.js';

/* Cyan assombri du contexte clair : sur papier, le néon disparaît. */
const TOKEN_LIGHT = [23, 121, 163];

/* Une étape s'allume un peu avant d'atteindre la ligne médiane : sinon elle
   se déclenche pile sous le regard, ce qui se voit. (Valeur du proto.) */
const LEAD = 40;

/* Rayon, en pixels, dans lequel un nœud se considère accosté. */
const DOCK_RADIUS = 54;

export function initMethod(root){
  const timeline = root.querySelector('.timeline');
  const fill  = root.querySelector('.fill');
  const line  = root.querySelector('.line');
  const steps = [...root.querySelectorAll('.step')];
  const nodes = steps.map(s => s.querySelector('.node'));

  /* Positions des nœuds, en fractions de la hauteur du rail. Relevées dans
     le DOM plutôt que codées en dur : elles suivent la mise en page, y
     compris le repli mobile. */
  let dock = p => p;
  function measureStops(){
    const rail = timeline.getBoundingClientRect();
    if (!rail.height) return;
    const stops = nodes.map(n => {
      const r = n.getBoundingClientRect();
      return (r.top + r.height / 2 - rail.top) / rail.height;
    });
    dock = makeDock(stops);
  }
  measureStops();
  addEventListener('resize', measureStops, { passive: true });

  register(root, () => {
    const rect = timeline.getBoundingClientRect();
    const middle = window.innerHeight * 0.5;
    const progression = midlineProgress(timeline);
    /* Docking : le fil ralentit en arrivant sur un nœud. Ici le « monde »
       est le document lui-même, qui défile à vitesse constante — le token
       s'attache donc au nœud et remonte un instant avec lui, avant de se
       détacher et de rattraper. C'est le geste d'accostage. */
    const travelled = dock(progression) * rect.height;

    fill.style.height = `${travelled}px`;

    /* ---------- revendication du fil conducteur ----------
       Le token n'appartient plus à la section : elle décrit seulement où il
       devrait être à l'écran, et avec quel poids elle le possède.

       Tant que le rail défile, `travelled` place le token sur la ligne
       médiane du viewport : c'est déjà le motif « le token reste, le monde
       le traverse » du prototype 6. Une fois le rail passé, le token s'y
       maintient et attend que le workflow le reprenne. */
    const rail = line.getBoundingClientRect();
    const railX = rail.left + rail.width / 2;
    const section = root.getBoundingClientRect();

    const surLeRail = rect.bottom > middle;
    const y = surLeRail ? rect.top + travelled : middle;

    /* Pulsation d'accostage : le nœud sous le fil se marque une fois. */
    let proximite = 0;
    for (const node of nodes){
      const n = node.getBoundingClientRect();
      const proche = dockNearness((n.top + n.height / 2) - y, DOCK_RADIUS);
      proximite = Math.max(proximite, proche);
      node.style.setProperty('--dock', proche.toFixed(3));
      node.classList.toggle('docked', proche > 0.35);
    }

    /* Le poids retombe sur la fin de section : c'est cette décroissance qui,
       croisée avec la montée du workflow, fait traverser la couture au token
       sans qu'aucun code ne connaisse cette frontière. */
    const reste = section.bottom - rect.bottom;
    const queue = reste > 0 ? clamp01((middle - rect.bottom) / reste) : 1;
    const poids = seg(progression, 0, 0.03) * (1 - seg(queue, 0.55, 1));

    /* Le fil se resserre en accostant. Le point se loge alors dans l'espace
       entre les deux chiffres du nœud, qui restent lisibles — un point de
       taille pleine en masquait le milieu. Il ne disparaît pas pour autant :
       le rayon descend de 6 à 3.4px, jamais à zéro. */
    claim({
      x: railX, y, weight: poids,
      radius: 6 - 2.6 * proximite,
      color: TOKEN_LIGHT, tail: 90,
    });

    for (const step of steps){
      const box = step.getBoundingClientRect();
      step.classList.toggle('act', box.top + box.height / 2 < middle + LEAD);
    }


  });
}
