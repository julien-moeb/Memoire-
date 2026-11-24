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

| Type | Dossier | Exercice | Volume livré |
| --- | --- | --- | --- |
| `definition-mot` | `definitions/` | 6. Le mot juste | 103 définitions |
| `discrimination` | `discrimination/` | 8. Quasi-synonymes et paronymes | 76 phrases |
| `intrus` | `intrus/` | 9. L'intrus | 50 séries |
| `traits` | `traits/` | 7. Traits sémantiques | 34 mots |
| `registre` | `registre/` | 10. Changer de registre | 34 phrases |
| `fluence` | `fluence/` | 4 et 5. Échauffement | 30 consignes |
| `carte-lexique` | `lexique-pro/` | 11. Révisions espacées | 82 cartes, 7 thèmes |
| `liste-memoire` | `listes/` | 19 et 21. Listes, méthode des lieux | 14 listes |
| `paragraphe` | `paragraphes/` | 20. Retenir une note | 8 notes |
| `decision-lexicale` | `decision-lexicale/` | 2. Mot ou pas mot | 136 mots, 136 pseudo-mots |
| `strategie` | `strategies/` | 23. Fiches de stratégies | 15 fiches |
| `forme-bilan` | `bilan/` | Bilan | 4 formes |

Les exercices de vitesse, de mémoire de travail et de fonctions exécutives (double décision, appariement, n-back,
chiffres à rebours, dernières lettres, Stroop, alternance, go/no-go) n'ont pas besoin de contenu : leurs essais sont
générés par le programme.

**Mots réservés au bilan.** Les mots des listes, des définitions et de la décision lexicale du bilan ne peuvent pas
être réutilisés dans les traits, les listes, la décision lexicale ou les cartes d'entraînement : le validateur le
signale. Sans cette règle, le bilan suivant mesurerait en partie un apprentissage des items.

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

### `discrimination` : quasi-synonymes et paronymes

```jsonc
{
  "id": "dis-s01-001",
  "nature": "paronyme",                 // ou "quasi-synonyme"
  "phrase": "Le préfet a ___ les mesures jusqu'à la fin du mois.",   // « ___ » obligatoire
  "options": ["prolongé", "prorogé"],  // 2 à 4 mots, dont la réponse
  "reponse": "prorogé",
  "explication": "Proroger, c'est reporter l'échéance d'un acte juridique…",  // affichée après une erreur
  "difficulte": 3
}
```

Les confusions commises (mot attendu, mot choisi) sont enregistrées pour être reprogrammées.

### `intrus` : le mot qui ne va pas avec les autres

```jsonc
{ "id": "int-s01-001", "mots": ["pomme", "poire", "abricot", "carotte"], "intrus": "carotte",
  "explication": "La carotte est un légume racine ; les autres sont des fruits.", "difficulte": 1 }
```

Veillez à ce qu'un seul critère, non ambigu, distingue l'intrus.

### `traits` : analyse des traits sémantiques

```jsonc
{ "id": "tra-s01-001", "mot": "parapheur", "difficulte": 3,
  "traits": { "categorie": "fourniture de bureau", "usage": "faire circuler des documents à signer",
              "description": "chemise cartonnée à soufflets", "lieu": "secrétariat", "association": "signature" } }
```

Les traits sont des modèles affichés après votre propre description : il n'y a pas de bonne réponse unique.

### `registre` : reformulation professionnelle

```jsonc
{ "id": "reg-s01-001", "contexte": "Courriel à un directeur",
  "phrase": "On n'a pas eu le temps de finir le dossier.",
  "reformulations": ["Le dossier n'a pu être finalisé dans les délais…"], "difficulte": 2 }
```

### `liste-memoire` : listes à apprendre

Chaque item compte exactement 15 mots et un thème qui leur donne sens (« courses pour un dîner »). Selon votre niveau,
l'exercice en utilise les 8 à 15 premiers ; la méthode des lieux y puise aussi ses éléments.

### `paragraphe` : note à retenir

```jsonc
{ "id": "par-s01-001", "titre": "Rénovation de la médiathèque", "difficulte": 2,
  "texte": "La commune engagera en mars…",              // 200 caractères au moins
  "unites": ["mars", "quatorze mois|14 mois", "région"], // idées clés ; formes acceptées séparées par « | »
  "questions": [ { "question": "Combien de temps durera le chantier ?", "reponse": "quatorze mois", "variantes": ["14 mois"] } ] }
```

Une idée clé est comptée retrouvée si l'une de ses formes apparaît au début d'un mot du rappel, sans tenir compte des
accents ni de la casse.

### `decision-lexicale` : mots et pseudo-mots

Une série contient deux tableaux, `mots` et `pseudoMots` (20 au moins chacun). Les pseudo-mots livrés ont été construits
par recombinaison de syllabes françaises, puis vérifiés contre un dictionnaire de plus de 330 000 formes fléchies
(paquet libre `an-array-of-french-words`, utilisé seulement lors de la rédaction). Si vous en ajoutez, évitez les
homophones de mots réels (« vilage ») et les noms de marque.

### `strategie` : fiches de stratégies de compensation

Chaque fiche comporte un titre, une catégorie (`pendant`, `preparation`, `regulation`, `organisation`), un résumé d'une
phrase (140 caractères au plus), les situations où elle sert (`quand`), son principe, deux à six étapes, un exemple
et, au besoin, ce qu'il faut éviter (`aEviter`). Le champ facultatif `outil: "respiration"` ajoute un lien vers la
respiration guidée. L'enveloppe n'exige pas de domaine : ces fiches ne relèvent d'aucun domaine cognitif. Une fiche
par semaine est proposée dans le volet comportemental, dans l'ordre du fichier.

```json
{
  "id": "str-decrire",
  "titre": "Décrire le mot",
  "categorie": "pendant",
  "resume": "Dire ce que désigne le mot plutôt que de s'arrêter pour le chercher.",
  "quand": "En réunion ou au téléphone, quand un terme précis ne vient pas.",
  "principe": "Décrire la catégorie ou la fonction active les mots reliés en mémoire.",
  "etapes": ["Dites la catégorie.", "Ajoutez la fonction ou le contexte."],
  "exemple": "« Le document qui fixe les engagements de chaque service… la convention. »"
}
```

### `forme-bilan` : une forme parallèle du bilan

Le dossier `contenu/bilan/` contient quatre formes (A, B, C, D), utilisées à tour de rôle d'un bilan à l'autre pour
limiter l'effet d'apprentissage. Chaque forme fournit le matériel verbal du bilan ; les épreuves non verbales
(chiffres, lettres, couleurs, double décision) sont générées par le programme.

```jsonc
{
  "$schema": "../schemas/forme-bilan.schema.json",
  "id": "bilan-a",
  "type": "forme-bilan",
  "titre": "Bilan, forme A",
  "version": 1,
  "forme": "A",
  "liste": ["bougie", "fenêtre", "…"],          // exactement 15 mots concrets et fréquents
  "fluenceSemantique": { "consigne": "Des animaux", "cle": "animaux", "reference": ["…"], "exclusions": [] },
  "fluencePhonemique": { "consigne": "Des mots commençant par P", "cle": "p", "reference": ["…"], "exclusions": [] },
  "definitions": [ /* exactement 12 items au format definition-mot */ ],
  "decisionLexicale": {
    "mots": ["…"],                              // exactement 30 mots
    "pseudoMots": ["…"]                         // exactement 30 suites prononçables qui ne sont pas des mots
  }
}
```

Le validateur vérifie en outre que :

- aucun mot n'est en double dans une forme ;
- en fluence phonémique, chaque mot de référence commence par la lettre indiquée ;
- les mots de liste et les réponses des définitions ne se retrouvent pas d'une forme à l'autre, faute de quoi le
  bilan suivant serait facilité ;
- les catégories et lettres de fluence du bilan ne sont pas employées dans les séries d'entraînement.

Les pseudo-mots du bilan ont été rédigés à la main, puis contrôlés contre un dictionnaire de formes fléchies ; un seul
mot réel a été trouvé et remplacé (forme B, version 2).

## Après une modification des schémas

Si un type d'exercice évolue dans `src/contenu/schemas.ts`, régénérez les fichiers d'autocomplétion avec
`npm run schemas`.
