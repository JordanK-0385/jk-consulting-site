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
  if (!quotes.length) return;

  /* L'état masqué est posé ici, pas dans la feuille de style : une carte en
     opacity:0 que personne ne vient révéler serait un témoignage perdu. */
  for (const quote of quotes){
    quote.style.opacity = 0;
    quote.style.transform = 'translateY(14px)';
  }

  register(root, () => {
    const rect = root.getBoundingClientRect();
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
