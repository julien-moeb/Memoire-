# Ajouter une série d'exercices

Le contenu des exercices est séparé du code : chaque série est un fichier JSON placé dans `contenu/`. Il suffit de
déposer un fichier valide pour qu'il soit intégré à la prochaine publication ; aucune ligne de JavaScript n'est à
modifier.

## Marche à suivre

1. Copiez une série existante du même type (par exemple `contenu/definitions/serie-001.json`) sous un nouveau nom,
   par exemple `contenu/definitions/serie-002.json`.
2. Modifiez l'identifiant de la série et ceux de tous ses items : ils doivent être **uniques dans tout le dossier**.
3. Rédigez les items. Si vous utilisez VS Code, la ligne `"$schema"` active l'autocomplétion et souligne les erreurs
   pendant la saisie.
4. Vérifiez : `npm run valider`. Le message indique le fichier, l'item et le champ fautifs.
5. Publiez (fusion sur `main`). La validation est rejouée automatiquement : un fichier invalide bloque la publication,
   jamais l'application déjà en ligne.

Vous pouvez aussi éditer le fichier directement sur github.com (bouton « Add file » dans le dossier voulu) : la
validation s'exécute alors dans GitHub Actions et son résultat apparaît dans l'onglet « Actions ».

## Règles communes

| Champ | Règle |
| --- | --- |
| `id` | Minuscules, chiffres et tirets (`def-s02`, `def-s02-001`). Unique dans tout le dossier. |
| `type` | Détermine la forme des items (voir ci-dessous). |
| `titre` | Affiché dans l'application. |
| `domaine` | `acces-lexical`, `vitesse`, `memoire-travail`, `memoire-episodique`, `attention` ou `flexibilite`. |
| `version` | Entier ; augmentez-le quand vous modifiez une série déjà utilisée. |
| `difficulte` | De 1 (très facile) à 5 (très difficile), sert à doser la progression. |

Ne modifiez pas l'identifiant d'un item déjà utilisé : l'historique de répétition espacée y est rattaché. Pour
corriger un item, changez son texte et augmentez la `version` de la série.

## Types disponibles

Les types `definition-mot`, `fluence` et `carte-lexique` sont disponibles. Les autres (`discrimination`, `intrus`,
`registre`, `liste-memoire`, `paragraphe`, `strategie`, `forme-bilan`) seront ajoutés avec les incréments suivants et
documentés ici.

### `definition-mot` : de la définition au mot, avec indices

Exemple commenté (les commentaires ne sont pas autorisés dans un vrai fichier JSON : ils sont donnés ici à titre
d'explication).

```jsonc
{
  "$schema": "../schemas/definition-mot.schema.json", // active l'autocomplétion
  "id": "def-s02",                                    // identifiant de la série
  "type": "definition-mot",
  "titre": "Série 2 : nuances du vocabulaire administratif",
  "domaine": "acces-lexical",
  "version": 1,
  "items": [
    {
      "id": "def-s02-001",
      // La définition ne doit pas contenir le mot attendu : le validateur le vérifie.
      "definition": "Qui n'a pas encore reçu de solution définitive et reste soumis à discussion.",
      "reponse": "pendant",
      // Autres réponses acceptées (accents exigés sauf si le réglage les tolère ;
      // articles et pluriels simples sont toujours acceptés).
      "variantes": ["en suspens"],
      "indices": {
        // Premier indice, à la demande : un trait sémantique.
        "trait": "Adjectif ; se dit d'une question ou d'un dossier.",
        // Second indice : le début exact du mot attendu (vérifié par le validateur).
        "syllabe": "pen"
      },
      "difficulte": 3
    }
  ]
}
```

Les réussites sans indice, après indice sémantique et après indice syllabique sont comptabilisées séparément. Un mot
trouvé seulement après l'indice syllabique revient dès le lendemain en répétition espacée.

### `fluence` : production chronométrée de mots

```jsonc
{
  "$schema": "../schemas/fluence.schema.json",
  "id": "flu-e02",
  "type": "fluence",
  "titre": "Fluence : catégories d'entraînement",
  "domaine": "acces-lexical",
  "version": 1,
  "items": [
    {
      "id": "flu-e02-outils",
      "modalite": "semantique",          // ou "phonemique"
      "consigne": "Des outils",
      "cle": "outils",                   // catégorie, ou lettre initiale en phonémique
      "reference": ["marteau", "tournevis", "scie", "pince"],  // mots valides connus
      "exclusions": ["clou"],            // mots fréquemment proposés mais refusés
      "reserveBilan": false               // true : jamais proposé en entraînement
    }
  ]
}
```

La liste `reference` n'a pas à être exhaustive : un mot absent n'est pas compté faux, il vous est soumis en fin
d'épreuve pour arbitrage.

### `carte-lexique` : lexique professionnel en répétition espacée

```jsonc
{
  "$schema": "../schemas/carte-lexique.schema.json",
  "id": "pro-ev01",
  "type": "carte-lexique",
  "titre": "Évaluation des politiques publiques : notions de base",
  "domaine": "acces-lexical",
  "theme": "Évaluation des politiques publiques",
  "version": 1,
  "items": [
    {
      "id": "pro-ev01-001",
      "question": "Capacité d'une politique à atteindre les objectifs qui lui ont été fixés.",
      "reponse": "efficacité",
      "explication": "À distinguer de l'efficience, qui rapporte les résultats aux moyens.",
      "difficulte": 2
    }
  ]
}
```

## Après une modification des schémas

Si un type d'exercice évolue dans `src/contenu/schemas.ts`, régénérez les fichiers d'autocomplétion avec
`npm run schemas`.
