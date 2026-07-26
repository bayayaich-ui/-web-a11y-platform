# Widget SDK — Correctifs d'accessibilité automatiques

Script JavaScript à intégrer sur un site web pour corriger automatiquement certains problèmes d'accessibilité courants, directement dans le navigateur du visiteur.

## Intégration

Ajoutez cette ligne juste avant la fermeture de la balise `</body>` de votre site :

​```html
<script src="./dist/index.global.js"></script>
​```

Aucune configuration supplémentaire n'est nécessaire. Le widget s'exécute automatiquement au chargement de la page.

## Correctifs appliqués

Le widget corrige automatiquement :

- **Images sans texte alternatif** : ajoute `alt="Image"` aux balises `<img>` qui n'ont pas d'attribut `alt`.
- **Boutons sans libellé accessible** : ajoute `aria-label="Button"` aux `<button>` vides sans texte ni `aria-label`.
- **Liens vides** : ajoute le texte `Link` aux balises `<a>` qui n'ont aucun contenu textuel.

## Test local

Un fichier `test.html` est fourni à la racine du projet pour vérifier le bon fonctionnement du widget en local. Ouvrez-le dans un navigateur (via VS Code Live Server ou en double-cliquant dessus) et inspectez le DOM (`F12`) pour confirmer que les correctifs sont bien appliqués.

## Limitations

Ce widget applique des correctifs génériques et automatiques. Il ne remplace pas un audit d'accessibilité complet ni la rédaction de textes alternatifs pertinents et contextualisés par une personne. Les valeurs par défaut (`"Image"`, `"Button"`, `"Link"`) sont des solutions de secours, pas des solutions idéales à long terme.

## Build

​```bash
npm run build
​```

Génère le fichier `dist/index.global.js` à partir de `src/index.ts`.
