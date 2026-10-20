# Site JK Consulting — Specs de build (v2, finale)

*Concept, charte et récit validés. Ce document + les prototypes de `/prototypes` sont la source de vérité pour l'assemblage.*

---

## 1. Concept directeur

Site vitrine racontant **une entreprise augmentée par l'IA**. Fil unique : on **prend le process** brut d'un client, un workflow le **transforme étape par étape** jusqu'à ce qu'il devienne un **agent IA** qui intègre le bureau. Le site enchaîne plusieurs registres (résultat → méthode → workflow → preuve → conversion), unifiés par la charte et cette idée.

Positionnement défendu par le **contenu** : pas un simple faiseur d'automatisations, mais **la gouvernance et la fiabilité** (sécurité, conformité, robustesse). C'est le texte de réassurance qui vend la différence.

---

## 2. Charte visuelle

**Ambiance :** bleu nuit + néons bleus, surfaces vitrées, écrans holographiques — MAIS avec **alternance de fonds** (voir §4) pour rythmer le scroll et faire respirer.

**Typographie**
- Display / titres : **Space Grotesk** (600–700)
- Corps : **Inter** (400–500)
- Technique / HUD / tags : **JetBrains Mono**

**Couleurs — DEUX JEUX D'ACCENTS (important)**
Garder deux variantes des accents selon le fond, sinon illisible :

| Rôle | Sur fond SOMBRE (néon vif) | Sur fond CLAIR (assombri) |
|---|---|---|
| Cyan | `#7FE3FF` | `#1779A3` |
| Bleu | `#4FA8F0` | `#3670CC` |
| Vert (agent live) | `#6EDC96` | `#168152` |
| Indigo | `#6E7BF2` | — (retombe sur le bleu) |
| Teal | `#3FD6C8` | — (retombe sur le cyan) |

> **Révision des accents clairs (assemblage).** Les valeurs claires d'origine
> — `#1E9FD6`, `#3B7BE0`, `#1FB574` — ne passaient pas WCAG AA sur le papier
> `#F5F7FA` : respectivement **2.8:1**, **3.84:1** et **2.47:1**, pour un seuil
> de **4.5:1** en texte courant. Le blanc sur pastille `#1E9FD6` tombait à
> **3.01:1**. Elles ont été assombries au strict minimum nécessaire pour
> atteindre 4.5:1 (mesures ci-dessus : 4.55 / 4.50 / 4.55). Les teintes
> d'origine restent disponibles dans le code sous `--deep-cyan`, `--deep-blue`
> et `--deep-green` pour les **aplats décoratifs**, où le contraste n'est pas
> en jeu. Les accents néon sur fond sombre sont inchangés — ils sont déjà
> largement conformes (7.66 à 13.41:1).

Fonds sombres : `#060B18`, `#0B1830`, `#081124` (dégradés radiaux + léger grain de points `rgba(127,227,255,.04)`).
Fond clair : blanc cassé `#F5F7FA`, encre `#0C1420`, texte secondaire `#5B6B7D`, lignes `#E2E7EE`.
CTA plein sombre : `#7FE3FF` (texte `#061020`). CTA plein clair : `#1779A3` (texte blanc, 4.88:1). Texte clair sur sombre : `#EAF1FB` / atténué `#9AB0CC`.

**Couleurs de métamorphose du process** (section 3, dans l'ordre) : orange `#F2964E` → bleu → indigo → teal → cyan → vert `#6EDC96`.

**Principes de motion**
- **Vie ambiante sans scroll** : particules, halos qui pulsent, satellites, yeux du robot qui clignent. Ça vit même à l'arrêt.
- **Le scroll transforme le décor** (couleur, forme, caméra, zoom) — pas des éléments qui apparaissent un par un.
- **Process ancré au centre** en section 3 ; le workflow défile à travers lui.
- Toujours respecter `prefers-reduced-motion` (déjà géré dans les protos).

**Agent IA (le robot)** — présent mais **discret**, 1 par service : tête blanche arrondie, visage-écran sombre, deux yeux cyan qui clignent, antenne, badge lumineux, lueur douce dans la couleur du contexte. Style mascotte arrondie, jamais anguleux, jamais envahissant.

---

## 3. Les sections (ordre du site)

Chaque section a un prototype de référence dans `/prototypes`.

1. **Landing — le résultat** · fond SOMBRE · `1-landing.html`
   Bureau isométrique augmenté qui tourne (4 services : Direction, Sales, Back-office, Front-office), écrans allumés, robots-agents discrets, panneaux holo, liens entre services. Titre « Chaque service a son agent. » + sous-titre + 2 CTA + badge « Travailler avec moi ». Vie ambiante + parallaxe.

2. **Comment on fait — la méthode** · fond CLAIR · `2-comment.html`
   Timeline éditoriale, un token descend, 5 étapes s'allument : **Diagnostic → Conception → Construction → Déploiement → Autonomie**. *(Proto actuel en sombre ; à passer en version claire pour l'alternance — cf. §4.)*

3. **Le workflow — la métamorphose** · fond SOMBRE · `3-workflow-morph.html`
   Process **bloqué au centre**, le workflow défile à travers lui. Titre du jalon à gauche, réassurance à droite. 7 jalons : **Réception → Nettoyage → Traitement → Enrichissement → Écriture → Notification → En service**. Le token se **métamorphose en continu** (forme brute orange → lissée → structurée → satellites → cœur → ondes → **robot vert**). Contenu droite = robustesse/sécurité/conformité (RGPD-HDS) — la couche gouvernance.

4. **Liaison — dézoom vers le bureau** · fond SOMBRE · `4-liaison-bureau.html`
   Zoom-out depuis l'agent « en service » vers la maquette complète : les robots apparaissent service par service, les liens se tissent, texte central « Un agent devient tout un bureau », 4 blocs de bénéfices qui s'écartent sur les côtés. Ouvre sur les témoignages.

5. **Témoignages — preuve sociale** · fond CLAIR · *(à construire, contenu réel requis)*
   Format « Ils nous ont fait confiance » : photo + nom + rôle + citation. **Contenu réel uniquement** (John Dalia, 26 Academy…), jamais inventé.

6. **FAQ + Prêt à… — conversion** · FAQ CLAIR puis bloc final SOMBRE · `5-faq-contact.html`
   FAQ en accordéons (une ouverte à la fois) : sécurité, pas besoin de coder, délai, erreurs, secteurs réglementés, facturation. Puis bloc final « Prêt à passer à l'IA ? » (repasse en sombre) + CTA contact + ondes ambiantes.

---

## 4. Alternance de fonds (rythme du scroll)

Règle : **immersif = sombre, éditorial = clair.**

`Sombre (1. résultat)` → `Clair (2. méthode)` → `Sombre (3. workflow)` → `Sombre (4. dézoom)` → `Clair (5. témoignages)` → `Clair→Sombre (6. FAQ puis contact)`

Prévoir des **dégradés de raccord** entre sombre et clair (cf. `5-faq-contact.html`, classes `.fade` / `.topfade`) pour des transitions fluides. À l'assemblage, harmoniser : la section 2 (proto encore sombre) doit passer en version claire.

---

## 5. Notes de production

- **Stack :** HTML/CSS/JS + SVG légers (comme les protos). Google Fonts. **Pas de moteur 3D** → charge rapide, OK mobile. Spline seulement si un jour on veut un moment « matière » (optionnel).
- **Assemblage :** une seule page scrollable ; transitions de décor cohérentes ; deux jeux d'accents selon le fond.
- **Responsive :** desktop-first, durcir les replis mobiles des protos.
- **Accessibilité :** conserver `prefers-reduced-motion`.
- **Déploiement :** Vercel, repo GitHub. Branche dédiée, jamais de push direct sur main, PR + checks verts.

## 6. Contenu réel à brancher (ne jamais inventer)

- [ ] Témoignages réels (2-3 phrases : John Dalia, 26 Academy…) + noms/rôles.
- [ ] Réponses FAQ ajustées à ta réalité (délais, facturation exacte).
- [ ] Destination du CTA contact (mail ? formulaire ? Calendly ?).
- [ ] Chiffre/résultat vérifié si on en affiche un.
- [ ] Libellés de services / textes définitifs.

---

*Prototypes de référence dans `/prototypes` : `1-landing.html`, `2-comment.html`, `3-workflow-morph.html`, `4-liaison-bureau.html`, `5-faq-contact.html`.*
