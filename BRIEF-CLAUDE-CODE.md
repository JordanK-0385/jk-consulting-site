# Brief de lancement — Claude Code

Colle le bloc ci-dessous dans Claude Code, une fois le repo ouvert avec `SPECS.md` et le dossier `prototypes/` dedans.

---

```
Contexte : j'assemble le site vitrine de JK Consulting à partir de prototypes DÉJÀ validés.
Tu n'inventes pas le design — tu assembles et tu fiabilises l'existant.

AVANT TOUT CODE : lis intégralement le repo, SPECS.md et les fichiers de prototypes/
(1-landing, 2-comment, 3-workflow-morph, 4-liaison-bureau, 5-faq-contact).
Fais-moi un état des lieux réel + un plan d'assemblage AVANT d'écrire une ligne.
Je valide sur des diffs réels, jamais sur des résumés.

Objectif : une seule page scrollable, responsive, dans la charte de SPECS.md,
qui enchaîne dans l'ordre :
  1. Landing — le résultat (bureau augmenté, robots discrets)          [SOMBRE]
  2. Comment on fait — méthode 5 étapes (éditorial)                    [CLAIR]
  3. Le workflow — process au centre qui se métamorphose (7 jalons)    [SOMBRE]
  4. Liaison — dézoom vers le bureau + 4 bénéfices qui s'écartent      [SOMBRE]
  5. Témoignages — placeholders (contenu réel à venir)                 [CLAIR]
  6. FAQ (accordéons) puis « Prêt à passer à l'IA ? » + CTA contact    [CLAIR → SOMBRE]

Contraintes :
  - Stack légère, PAS de moteur 3D. Propose-moi vanilla single-page vs Vite/Astro et recommande.
  - Respecter l'ALTERNANCE de fonds (immersif = sombre, éditorial = clair) avec dégradés de raccord.
  - DEUX jeux d'accents selon le fond (néon vif sur sombre / assombri sur clair) — cf. SPECS.md.
  - Perf mobile + prefers-reduced-motion conservés ; transitions de décor cohérentes.
  - Section 2 (proto encore en sombre) : la passer en version claire.
  - Branche dédiée, jamais de push direct sur main ; PR + checks verts avant merge.
  - Déploiement Vercel.

Livrable étape 1 : plan + arborescence de fichiers proposés, que je valide AVANT que tu codes.
```

---

## Rappels pour toi (Jordan)

- Tu **valides sur les vrais diffs**, jamais sur ce que Claude Code se raconte. Le « audite avant de coder » est là pour ça.
- **Contenu réel à fournir plus tard** (jamais inventé) : témoignages, réponses FAQ ajustées, destination du CTA contact. Tu peux démarrer avec des placeholders.
- Si Claude Code te sort un plan et que tu veux un deuxième regard avant de le laisser coder, colle-le-moi, je te dis si c'est propre.
