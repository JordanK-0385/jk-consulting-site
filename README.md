# Site JK Consulting — Kit de build

Tout ce qu'il faut pour assembler le site avec Claude Code.

## Contenu

- **`SPECS.md`** — la source de vérité : concept, charte (double jeu d'accents sombre/clair), alternance de fonds, les 6 sections avec comportements scroll + contenus, notes de prod.
- **`BRIEF-CLAUDE-CODE.md`** — le message à coller dans Claude Code pour lancer l'assemblage (avec l'instruction d'auditer le repo avant de coder).
- **`prototypes/`** — les 5 maquettes validées, dans l'ordre du site :
  - `1-landing.html` — le résultat (bureau augmenté)
  - `2-comment.html` — comment on fait (méthode)
  - `3-workflow-morph.html` — le workflow (process qui se métamorphose)
  - `4-liaison-bureau.html` — dézoom vers le bureau
  - `5-faq-contact.html` — FAQ + « Prêt à… » (version claire)

## Par où commencer

1. Crée un repo GitHub (ex. `jk-consulting-site`).
2. Dépose ce dossier dedans (`SPECS.md`, `prototypes/`).
3. Ouvre le repo dans Claude Code.
4. Colle le brief de `BRIEF-CLAUDE-CODE.md`.
5. Valide le PLAN qu'il te propose **avant** de le laisser coder.
6. Assemblage → PR + checks verts → merge → déploiement Vercel.

## À fournir plus tard (contenu réel, jamais inventé)

- Témoignages (John Dalia, 26 Academy…), réponses FAQ ajustées, destination du CTA contact.
