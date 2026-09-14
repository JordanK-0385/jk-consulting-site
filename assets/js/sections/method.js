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
import { claim } from '../core/thread.js';
import { clamp01, seg, lerp } from '../core/color.js';
import { makeDock, dockNearness, smoother } from '../core/dock.js';
import { ancrageEtincelle } from '../core/naissance.js';
import { ancreProcess, DEBUT_WORKFLOW, CLAIR, SOMBRE } from '../core/entree-process.js';


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
  /* Les deux repères de la sortie : la carte du dernier jalon, qui occupe le
     couloir que l'arc doit traverser, et la bande de raccord, sur laquelle se
     lit la bascule de couleur. */
  const derniereCarte = steps.length ? steps[steps.length - 1].querySelector('.card') : null;
  const bande = root.querySelector('.seam--to-dark');

  /* Origine de l'arc de sortie, figée au dégagement du couloir et relâchée si
     l'on remonte. Un objet qui quitte le rail ne suit plus ce que le rail
     fait ensuite : c'est cette origine fixe qui rend la trajectoire monotone.
     Vivant hors de la boucle, comme le point de détachement de la liaison. */
  let quai = null;

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

    /* LE FIL ENTRE PAR LE HAUT DU TRAIT. Il attend sur la médiane, s'accroche
       au sommet de la ligne dès qu'elle l'atteint, et remonte avec elle
       jusqu'au plafond — c'est là seulement qu'il commence à DESCENDRE le
       rail vers 01, 02, etc. Sans ce retard, la progression démarrait à la
       médiane : le temps que la section remplisse l'écran, le fil avait déjà
       parcouru 310px de rail et se retrouvait SOUS le premier nœud, à
       mi-course, alors qu'il devait encore être à son sommet.

       Le retard vaut exactement la distance de la médiane au plafond : la
       phase d'accrochage se termine donc à l'instant précis où le sommet du
       trait atteint le plafond, sans réglage à tenir à jour. En mobile le
       plafond EST la médiane, le retard est nul et le comportement validé
       est rendu à l'identique. */
    const etroit = window.innerWidth <= 720;

    /* LE FIL ATTEND LÀ OÙ IL EST NÉ, pas sur la médiane. C'est la même ancre
       que le landing revendique en s'éteignant : le mélange des deux
       revendications est donc un no-op, en X comme en Y, pendant tout le
       recouvrement. Auparavant le fil naissait à 414, était rabattu à 450 —
       un palier de 290px de défilement — puis remontait de 288px : trois
       changements de direction pour une descente. */
    const ancre = ancrageEtincelle();
    const repos = ancre ? ancre.y : middle;

    /* Et le plafond ne peut pas se trouver SOUS ce point, sinon le fil y
       serait rabattu dès son arrivée — le creux qu'on vient de supprimer.
       En 1440x900 min(162, 414) laisse 162, inchangé ; en 390x844 le plafond
       valait la médiane à 422 alors que le fil naît à 374, au-dessus : il
       descend à 374 et le repli mobile garde une descente sans creux. */
    const plafond = Math.min(etroit ? middle : window.innerHeight * 0.18, repos);
    const retard = middle - plafond;
    const course = Math.max(1, rect.height - retard);
    const progression = clamp01((middle - retard - rect.top) / course);
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

    /* Trois régimes, tous ancrés sur la médiane pour que le fil ne plonge
       jamais à la rencontre du rail : il l'attend, et le rail vient à lui.
       Au moment où la progression démarre, `rect.top + travelled` vaut
       exactement la médiane — le passage d'un régime à l'autre est donc
       continu, y compris avec l'oscillation d'accostage. */
    const sansRail = progression <= 0;
    const brut = sansRail ? Math.min(rect.top, repos) : rect.top + travelled;

    /* Mais jamais SOUS l'extrémité du trait. Sans cette borne, le fil
       franchissait le bout du rail après « Autonomie » et se figeait sur la
       médiane pendant que la ligne s'échappait vers le haut : mesuré à 50px
       sous le bout dès qu'il était passé, puis 1150px de scroll suspendu
       dans le vide. Il finit maintenant la ligne, se pose sur sa pointe et
       repart avec elle — le relais du workflow le récupère en route.

       Le plancher garde le fil dans l'écran quand la pointe file vers le
       haut : sans lui, il suivrait le trait hors du cadre.
       En mobile, l'axe est à GAUCHE et le fil balaie vers le centre en
       sortant : le laisser remonter lui ferait traverser la bascule. Le
       plafond y vaut donc la médiane, ce qui rend exactement le comportement
       figé et validé. Même point de bascule que le CSS (720px). */
    const pointe = rect.bottom;
    const y = Math.max(Math.min(brut, pointe), plafond);

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

    /* La montée, elle, commence dès l'APPROCHE de la section et non à
       l'entrée du rail. Sans cela, le fil restait éteint sur toute la
       hauteur du chapô — mesuré à 2280px sans fil entre le haut de la page
       et le premier point revendiqué. L'étincelle née du bureau descend
       ainsi jusqu'au rail sans se rallumer. */
    const arrivee = clamp01(1 - section.top / window.innerHeight);
    const montee = Math.max(seg(arrivee, 0.15, 0.65), seg(progression, 0, 0.03));
    const poids = montee * (1 - seg(queue, 0.55, 1));

    /* Le fil se resserre en accostant. Le point se loge alors dans l'espace
       entre les deux chiffres du nœud, qui restent lisibles — un point de
       taille pleine en masquait le milieu. Il ne disparaît pas pour autant :
       le rayon descend de 6 à 3.4px, jamais à zéro. */
    /* ---------- L'ARC DE SORTIE ----------
       Le fil ne dérive plus : il quitte le rail par une trajectoire écrite,
       pilotée par la seule progression de cette sortie. Auparavant le trajet
       rail -> process était le sous-produit du recouvrement de deux poids —
       450px de dérive en diagonale, avec un creux en Y de 435 à 315 avant de
       remonter à 450.

       DÉPART : l'instant où le couloir se dégage, c'est-à-dire où la carte du
       dernier jalon est remontée au-dessus du fil. C'est le critère de
       collision lui-même, donc il s'ajuste seul à n'importe quelle mise en
       page : partir à l'accostage de 05 aurait fait voler le fil à travers
       son propre texte, mesuré de 3003 à 3138 en 1440x900 et de 2216 à 2318
       en 390x844.

       ARRIVÉE : l'instant où le workflow prend le fil, DEBUT_WORKFLOW, lu
       dans le module de couture par les deux sections. La méthode y a donc
       déjà posé le fil sur la cible quand l'autre revendication s'ouvre : le
       recouvrement ne déplace rien.

       LA COURBE : Bézier quadratique de contrôle (quai.x, cible.y). Le fil
       quitte le rail DANS SON AXE puis s'infléchit vers le centre — tangente
       verticale au départ, horizontale à l'arrivée. Monotone en X et en Y par
       construction, le polygone de contrôle l'étant. Le lissage de Perlin
       annule les deux dérivées aux bornes : départ et arrivée à l'arrêt,
       comme la glissade d'entrée. */
    const cible = ancreProcess(window.innerHeight);
    if (derniereCarte){
      const carte = derniereCarte.getBoundingClientRect();
      if (carte.bottom < y){ if (!quai) quai = { x: railX, y, front: section.bottom }; }
      else quai = null;
    }
    const fin = (1 - DEBUT_WORKFLOW) * window.innerHeight;
    const vol = quai ? quai.front - fin : 0;
    const k = smoother(vol > 0 ? clamp01((quai.front - section.bottom) / vol) : 0);
    const fx = (quai && cible) ? quai.x + (cible.x - quai.x) * k * k : railX;
    const fy = (quai && cible) ? quai.y + (cible.y - quai.y) * (1 - (1 - k) * (1 - k)) : y;

    /* LA BASCULE DE COULEUR SE LIT SUR LA BANDE DE RACCORD, pas sur les poids.
       Le fil vire au néon en traversant le dégradé nuit et l'atteint pur à son
       bord bas — le plein sombre. Avant, la bascule finissait là par
       coïncidence du recouvrement des poids : elle dépendait de la hauteur de
       la bande et de --h-workflow, sans que rien ne le dise. */
    const raccord = bande ? bande.getBoundingClientRect() : null;
    const teinte = raccord ? lerp(CLAIR, SOMBRE, seg(fy, raccord.top, raccord.bottom)) : CLAIR;

    claim({
      x: fx, y: fy, weight: poids,
      radius: 6 - 2.6 * proximite,
      color: teinte, tail: 90,
    });

    /* Une étape s'allume au PASSAGE DU FIL, pas à une hauteur d'écran fixe.
       C'est lui qui allume les étapes ; le lier à la médiane marchait tant
       qu'il y restait, mais il entre maintenant plus haut et les cartes se
       seraient éclairées avant son arrivée. Sur la fin de la section, où il
       rejoint la médiane, le déclenchement est le même qu'avant. */
    for (const step of steps){
      const box = step.getBoundingClientRect();
      step.classList.toggle('act', box.top + box.height / 2 < y + LEAD);
    }


  });
}
