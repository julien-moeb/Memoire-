# Lexique

Application web d'entraînement cognitif quotidien (15 à 20 minutes), centrée sur l'accès lexical et la vitesse de
traitement, conçue pour accompagner des troubles cognitifs liés au cancer et à ses traitements. Elle établit un profil
initial, en déduit un programme personnalisé, propose des exercices adaptatifs, suit la progression et produit un
export destiné à une consultation mémoire.

> Lexique n'est ni un dispositif médical, ni un outil diagnostique. Ses scores ne sont pas des normes cliniques.
> Voir [METHODE.md](METHODE.md).

## Confidentialité

- Application statique : aucun serveur, aucune base de données distante, aucune analytique, aucun traceur.
- Toutes les données (résultats, journal, réglages) restent dans le navigateur de l'appareil (IndexedDB).
- Le changement d'appareil passe par une sauvegarde JSON exportée puis importée (Réglages › Données).

## Installation locale

Prérequis : Node.js 22 ou plus récent.

```bash
npm install
npm run dev        # serveur de développement : http://localhost:5173
```

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm test` | Tests unitaires du moteur (escalier, répétition espacée, statistiques, stockage, contenu) |
| `npm run valider` | Validation de tout le contenu JSON |
| `npm run schemas` | Régénère les JSON Schema d'autocomplétion à partir des schémas Zod |
| `npm run build` | Validation du contenu, contrôle des types, compilation dans `dist/` |
| `npm run preview` | Sert la version compilée |

## Déploiement sur GitHub Pages

1. Dans le dépôt GitHub : **Settings › Pages › Build and deployment › Source : GitHub Actions**.
2. Chaque fusion sur `main` déclenche `.github/workflows/deploiement.yml` : validation du contenu, tests, compilation,
   publication.
3. L'application est servie sous `https://<compte>.github.io/<nom-du-depot>/`. Le chemin de base est fourni
   automatiquement à Vite par la variable `BASE_PATH` (voir `vite.config.ts`) ; aucune modification n'est nécessaire si
   le dépôt est renommé.

Pour compiler localement avec le même chemin que sur GitHub Pages :

```bash
BASE_PATH=/<nom-du-depot>/ npm run build && BASE_PATH=/<nom-du-depot>/ npm run preview
```

### Installation sur téléphone

Ouvrez l'adresse dans Safari (iPhone) ou Chrome (Android), puis « Ajouter à l'écran d'accueil ». L'installation est
recommandée : elle permet l'usage hors ligne et protège les données de l'effacement automatique que Safari applique
aux sites peu visités.

## Architecture

```
contenu/          séries d'exercices en JSON, éditables sans toucher au code (voir CONTENU.md)
scripts/          validation du contenu, génération des schémas
src/moteur/       logique pure et testée : escalier adaptatif, SM-2, statistiques, saisie libre
src/chrono/       chronométrage synchronisé sur les images d'écran, profil d'appareil
src/contenu/      schémas Zod et chargement du contenu
src/stockage/     base IndexedDB, réglages, sauvegarde et import
src/ui/           composants d'interface (inspirés des Human Interface Guidelines d'Apple)
src/pages/        écrans
tests/            tests unitaires (Vitest)
```

Le moteur ne dépend ni de React ni du stockage : c'est la partie dont la justesse conditionne l'interprétation des
résultats, elle est donc isolée et testée.

## Avancement

| Incrément | Contenu | État |
| --- | --- | --- |
| 1. Socle | Projet, déploiement, stockage, chronométrage, interface, page Méthode | Livré |
| 2. Bilan initial | Six domaines, formes parallèles, radar | À venir |
| 3. Moteur d'exercices | 24 exercices, séance quotidienne, contenu des 30 premiers jours | À venir |
| 4. Suivi | Anneaux, courbes, journal, volet comportemental | À venir |
| 5. Export | Archive CSV, synthèse PDF de deux pages | À venir |
