# Site JK Consulting

Site vitrine en **une seule page scrollable**, assemblé à partir des cinq
prototypes validés. Six sections qui alternent immersif (sombre) et éditorial
(clair) : le résultat, la méthode, le workflow, la liaison, les témoignages,
la FAQ puis le CTA.

`SPECS.md` reste la source de vérité pour le concept, la charte et le récit.

## Stack

HTML, CSS et modules ES natifs. **Aucune étape de build** : ce que vous relisez
est exactement ce qui est déployé. Pas de framework, pas de moteur 3D — les
scènes sont du SVG piloté par une boucle d'animation partagée.

## Démarrer

```bash
npm install          # uniquement pour les contrôles ; le site n'a pas de dépendance
npm run dev          # http://127.0.0.1:8000
```

Ou n'importe quel serveur statique à la racine du dépôt.

## Contrôles

```bash
npm run check            # les deux suites
npm run check:static     # sans dépendance, sans navigateur
npm run check:browser    # Chromium via Playwright
```

Ils tournent en CI sur chaque push et chaque pull request.

**Statiques** — références locales résolues, identifiants uniques, sections
nommées, cohérence du bandeau « contenu fictif », absence de nom réel dans un
emplacement réservé, jalons du workflow alignés entre balisage et code, absence
de style en ligne (la CSP est servie sans `unsafe-inline`), `vercel.json` valide.

**Navigateur** — parcours complet de la page en 1440px et 390px sans erreur ni
requête en échec, aucun débordement horizontal, les sept jalons du workflow
exposés à l'arbre d'accessibilité, hiérarchie des titres sans saut, contraste
AA sur toutes les sections claires, cibles tactiles d'au moins 44px, scènes
figées en `prefers-reduced-motion`.

Une ressource tierce indisponible (Google Fonts) est signalée sans faire
échouer la CI : elle ne relève pas du code du site.

## Arborescence

```
index.html              la page, structure sémantique des six sections
vercel.json             en-têtes de sécurité, cache, CSP
assets/css/             tokens de charte, base, raccords, une feuille par section
assets/js/core/         boucle rAF partagée, préférence de mouvement, SVG, couleur
assets/js/sections/     un module par section animée
prototypes/             les cinq maquettes d'origine, figées, non chargées
scripts/                serveur de développement et contrôles
```

Deux points d'architecture qui expliquent le reste :

- **`assets/js/core/raf.js`** — une seule boucle d'animation pour tout le site,
  activée par `IntersectionObserver` : seules les sections à l'écran calculent.
- **`assets/css/tokens.css`** — les deux jeux d'accents. Les contextes
  `.on-dark` et `.on-light` redéfinissent `--accent-*`, si bien qu'un composant
  s'adapte au fond sans connaître son contexte.

## Modifier le contenu

Les textes vivent dans `index.html`. En particulier, **les sept jalons du
workflow se modifient dans le balisage** (`.steps-source`) : le module lit ses
textes là et ne garde que les couleurs en code.

## Déploiement

Vercel, site statique, aucune commande de build. Racine du dépôt comme
répertoire de sortie. `vercel.json` porte les en-têtes.

## À fournir avant mise en ligne

- [ ] **Témoignages réels** — noms, fonctions, sociétés, citations validées par
      les personnes citées. Remplacer les trois `<figure data-placeholder>` de
      la section témoignages, retirer l'attribut, **supprimer le bandeau
      « CONTENU FICTIF »** et son bloc dans `assets/css/s5-temoignages.css`.
      Ne jamais pré-remplir avec un nom réel sans citation validée.
- [ ] **Destination des CTA** — mail, formulaire ou Calendly. Trois liens
      portent `data-cta-destination="à fournir"` ; le contrôle statique les
      compte.
- [ ] **Domaine** — renseigner `og:url`, `og:image` et `<link rel="canonical">`
      en URL absolues dans `index.html` (un commentaire les signale).
- [ ] **Réponses FAQ** — à ajuster à la réalité de JK (délais, facturation).
- [ ] **Chiffre ou résultat vérifié**, si l'on en affiche un.
