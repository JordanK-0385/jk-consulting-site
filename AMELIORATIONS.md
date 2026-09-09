# Améliorations — le fil conducteur (brief Claude Code)

*À appliquer sur la branche existante, une fois le site assemblé. Ces améliorations concernent le **liant entre les sections** — pas leur contenu.*

## Principe directeur

**Un seul token lumineux, continu, du bouton de la landing jusqu'à l'agent « en service ».** Il ne disparaît **jamais** entre les sections. Ce n'est pas cinq sections avec chacune son point : c'est **un** point que le décor traverse. Le décor change autour de lui ; lui, il ne meurt pas.

Deux prototypes de référence dans `prototypes/` :
- `6-passerelle.html` — le token continu qui traverse une couture clair→sombre.
- `7-vertical-horizontal.html` — le fil qui prend des virages à 90° (vertical → horizontal → vertical).

---

## 1. Passerelle continue (raccords entre sections)

**Aujourd'hui :** chaque section a son propre point, qui s'arrête à sa frontière.
**Cible :** le token de fin de section N et celui de début de section N+1 sont **le même élément**, qui vit dans la couture et la traverse sans coupure. Le décor bascule (clair↔sombre, cf. les raccords `.fade`/`.topfade` déjà en place) **autour** du token, qui reste continu.
**Réf :** `6-passerelle.html` — token fixe au centre, le monde clair→sombre défile à travers lui.
**Priorité :** la frontière **méthode (clair) → workflow (sombre)**, la plus visible aujourd'hui (on passe d'un champ texte au workflow sans accroche).

## 2. Docking (fin du « trop linéaire »)

**Aujourd'hui :** le rail de la méthode descend tout droit, sans vie.
**Cible :** le token **ralentit** en arrivant sur un nœud, le nœud **pulse une fois** (docking), puis il repart. Une micro-pause par étape, pas une descente uniforme. C'est ce qui donne le rythme subtil qui manque.
**Réf :** le comportement `.dock` des deux prototypes.

## 3. Virages vertical + horizontal (le fil serpente comme un n8n)

**Cible :** le fil conducteur n'est pas une colonne droite. Sur le moment **workflow**, il prend un **virage à 90°** et **part à l'horizontale** : le scroll vertical fait défiler l'image **latéralement**, le token traverse les nœuds de gauche à droite (comme on lit un canvas n8n), puis re-tourne et redescend. Tronçon horizontal **allongé** (l'utilisateur y passe le plus clair du scroll de cette section).
**Réf :** `7-vertical-horizontal.html` — caméra qui suit un chemin coudé, tronçon horizontal dominant, nœuds qui dockent au passage.

**DOSAGE — décision actée :** le fil est continu **partout**, mais le **virage horizontal est réservé à la section workflow** (signature, pas gadget). Le reste du site reste vertical. **Une seule respiration horizontale**, éventuellement deux max — jamais partout.

## 4. Équilibrage des nœuds de la section méthode (bug visuel réel)

**Aujourd'hui :** les numéros ne sont pas alignés régulièrement, l'alternance gauche/droite fait des trous (visible à l'œil).
**Cible :** rail vertical = ancre, nœuds à **intervalle régulier**, alternance texte gauche/droite **propre et symétrique**.

---

## Mobile

L'horizontal se **sent moins** sur écran étroit. Claude Code doit **proposer** un repli mobile (tronçon horizontal plus court, ou vertical avec les virages simplement suggérés) et le **montrer** avant de figer. Le **principe du fil continu**, lui, reste sur tous les formats.

## Contraintes (rappel)

- **Auditer** le code existant **et** les 2 prototypes **avant** d'écrire une ligne. Plan d'abord, validé sur diffs réels.
- **Réutiliser le moteur existant** (`core/raf.js` unique gaté par IntersectionObserver, `core/motion.js`) — ne **pas** réintroduire une boucle rAF par section.
- Respecter `prefers-reduced-motion` : en mouvement réduit, le token se pose sur un état stable, le scroll reste maître.
- **Commits séparés** par amélioration. **Branche dédiée**, jamais de push sur `main`, **pas de PR sans feu vert**.

## Livrable étape 1 (avant tout code)

Un **plan d'intégration** : où le token devient un élément partagé entre sections, quelle section prend le virage horizontal, comment le docking se greffe sur le moteur existant, et le **repli mobile proposé**. À valider avant d'attaquer.
