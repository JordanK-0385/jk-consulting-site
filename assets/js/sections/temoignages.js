/*
 * SECTION 5 — TÉMOIGNAGES · preuve sociale.
 * Seule section sans prototype.
 *
 * Révélation en cascade des cartes à l'entrée dans le champ. Comme la
 * section méthode, tout est piloté par le scroll : rien ne bouge de
 * lui-même, donc rien à geler en mouvement réduit — la feuille de style
 * neutralise la transition et les cartes s'affichent d'emblée.
 */

import { register } from '../core/raf.js';
import { clamp01, easeOut } from '../core/color.js';

/* Décalage entre deux cartes, en fraction de la progression. */
const STAGGER = 0.12;

export function initTemoignages(root){
  const quotes = [...root.querySelectorAll('.quote')];
  const survol = root.querySelector('.survol');
  const agent  = survol && survol.querySelector('.agent-plein');
  if (!quotes.length) return;

  /* L'état masqué est posé ici, pas dans la feuille de style : une carte en
     opacity:0 que personne ne vient révéler serait un témoignage perdu. */
  for (const quote of quotes){
    quote.style.opacity = 0;
    quote.style.transform = 'translateY(14px)';
  }

  register(root, () => {
    const rect = root.getBoundingClientRect();

    /* ---------- le survol ----------
       Le robot traverse le champ : il entre par le coin haut droit, lointain
       et petit, vient vers nous en diagonale et sort par le coin bas gauche
       en crevant le cadre. Le contenu est déjà en place derrière lui — il le
       masque le temps du passage, il ne le découvre pas.

       La course est courte (six dixièmes d'écran) et l'avance en tête de
       section vaut exactement la même chose : le titre arrive à sa position
       naturelle au moment où le robot sort. */
    if (agent){
      const vh = window.innerHeight, vw = window.innerWidth;
      const av = clamp01(-rect.top / (vh * 0.6));

      /* La profondeur s'accélère : à distance égale parcourue, l'objet grossit
         de plus en plus vite. C'est ce qui donne le rapprochement plutôt
         qu'un glissement à plat. */
      const prof = av * av * 0.55 + av * 0.45;

      const x = (1.30 - 1.60 * av) * vw;
      const y = (-0.22 + 1.46 * av) * vh;
      const ech = 0.5 + 1.25 * prof;

      agent.style.setProperty('--x', `${x.toFixed(1)}px`);
      agent.style.setProperty('--y', `${y.toFixed(1)}px`);
      agent.style.setProperty('--s', ech.toFixed(3));
      agent.style.setProperty('--r', `${(-24 + 13 * av).toFixed(1)}deg`);

      /* Lumière fixe en haut de l'écran : l'ombre s'écarte du robot à mesure
         qu'il s'en éloigne, et s'élargit à mesure qu'il monte vers nous. */
      const dx = (x - vw * 0.5) * 0.11;
      const dy = (y - vh * 0.08) * 0.075 + 12;
      const flou = 14 + 30 * prof;
      agent.style.setProperty('--ombre',
        `drop-shadow(${dx.toFixed(0)}px ${dy.toFixed(0)}px ${flou.toFixed(0)}px rgba(10, 22, 40, .30))`);

      survol.style.visibility = av >= 1 ? 'hidden' : 'visible';
    }

    /* 0 quand le haut de la section atteint le bas du viewport,
       1 quand il a remonté d'un tiers d'écran. */
    const entry = clamp01((window.innerHeight - rect.top) / (window.innerHeight * 0.66));

    quotes.forEach((quote, i) => {
      const shown = easeOut(clamp01((entry - i * STAGGER) / (1 - STAGGER * (quotes.length - 1) || 1)));
      quote.style.opacity = shown;
      quote.style.transform = `translateY(${(1 - shown) * 14}px)`;
    });
  });
}
