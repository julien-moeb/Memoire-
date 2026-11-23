# Méthode, niveau de preuve et limites

> **Avertissement.** Lexique n'est ni un dispositif médical, ni un outil diagnostique. Ses scores ne sont pas des
> normes cliniques : ils ne se comparent qu'à la ligne de base de la personne qui l'utilise. L'application ne remplace
> pas une évaluation neuropsychologique, dont les tests standardisés restent la référence.

Ce document est repris dans la page « Méthode » de l'application (`src/pages/methode-donnees.ts`).

## Principes

1. **Privilégier les approches étayées.** L'entraînement de la vitesse de traitement et l'approche comportementale de
   type MAAT (Memory and Attention Adaptation Training) disposent d'essais contrôlés randomisés auprès de personnes
   traitées pour un cancer. Les jeux d'entraînement généralistes, dont le transfert à la vie quotidienne est faible, ne
   sont pas reproduits.
2. **Entraîner le vocabulaire réellement utile.** En rééducation du manque du mot, les gains sont largement
   spécifiques aux items travaillés. Le lexique professionnel et les mots manqués consignés dans le journal sont donc
   prioritaires.
3. **Ne jamais dramatiser un résultat.** Le modèle cognitivo-comportemental qui fonde MAAT postule que l'anxiété de
   performance interfère avec l'attention et l'encodage. C'est une hypothèse plausible, non un fait établi ; elle
   justifie un escalier visant environ 80 % de réussite et des messages neutres.
4. **Une séance par jour au plus, un jour de repos par semaine.**

## Niveaux de preuve

| Niveau | Définition |
| --- | --- |
| A | Au moins un essai contrôlé randomisé auprès de personnes traitées pour un cancer, même de petite taille. |
| B | Efficacité établie dans une autre population (personnes âgées, aphasie, adultes sains), donc transposée. |
| C | Paradigme de mesure validé ou fondement théorique, sans démonstration d'un effet d'entraînement qui se transfère à la vie quotidienne. |

## Familles d'exercices

| Famille | Niveau | Rôle | Fondement principal |
| --- | --- | --- | --- |
| Vitesse de traitement (double décision, paradigme dérivé du Useful Field of View) | A | Entraînement prioritaire, au moins quatre séances sur six | Von Ah et al. 2012 ; Meneses et al. 2018 ; ACTIVE chez les personnes âgées |
| Volet comportemental (journal, stratégies de compensation, régulation de l'activation) | A | Une séance courte par semaine | Ferguson et al. 2016 (programme complet, non ses composantes isolées) |
| Stratégies d'encodage en mémoire épisodique | A | Entraînement | Bras « mémoire » de Von Ah et al. 2012 |
| Accès lexical : définition vers mot avec indiçage, analyse des traits sémantiques | B | Entraînement central | Rééducation de l'anomie (aphasie) ; Efstratiadou et al. 2018 |
| Répétition espacée et pratique de récupération | B | Consolidation | Roediger et Karpicke 2006 ; Cepeda et al. 2006 |
| Méthode des lieux | B | Stratégie | Adultes sains et âgés |
| Fluences, décision lexicale, quasi-synonymes et paronymes, intrus, reformulation de registre | C | Mesure, échauffement, entraînement écologique | Paradigmes de mesure ; validité écologique |
| Mémoire de travail et fonctions exécutives (n-back, empans, Stroop, alternance, go/no-go) | C | Mesure et maintien, faible poids | Transfert lointain non démontré (Melby-Lervåg et al. 2016) |

## Bilan

Le bilan comprend treize épreuves réparties en deux parties d'environ 13 minutes, à réaliser sur deux jours pour
limiter la fatigue, qui fausserait surtout les épreuves de vitesse placées en fin de séance.

- **Partie 1** : apprentissage d'une liste de 15 mots en trois essais, fluences sémantique et phonémique (60 s),
  dénomination sur définition avec indices, décision lexicale, double décision, puis rappel différé de la liste.
- **Partie 2** : empan de chiffres inverse, mise à jour en mémoire de travail, go/no-go, double tâche, Stroop,
  alternance de tâches, puis questionnaire de gêne ressentie (une question par domaine, de 1 à 5).

Quatre formes parallèles (A à D) sont utilisées à tour de rôle ; l'intervalle conseillé entre deux bilans est de trois
mois. Chaque score est ramené en pourcentage du maximum possible de l'épreuve (POMP), puis moyenné par domaine. Le
radar qui en résulte compare des domaines entre eux chez la même personne : c'est un repère indicatif, non une norme,
et il ne permet aucun diagnostic. Les épreuves sont inspirées de paradigmes classiques, mais elles n'en sont pas des
versions étalonnées.

## Choix techniques justifiés

- **Escalier adaptatif 3 réussites / 1 échec.** Il converge vers 79,4 % de réussite (Levitt 1971). La règle
  2 réussites / 1 échec, souvent citée, converge vers 70,7 %.
- **Répétition espacée SM-2** (Wozniak 1990), retenue pour sa transparence. Après un échec, l'item recommence à un jour
  et sa facilité est conservée.
- **Écart à la ligne de base personnelle** : (moyenne lissée − moyenne de référence) ÷ écart-type de référence, avec
  un plancher sur l'écart-type ; la référence est constituée du bilan et des sept premières séances de chaque
  exercice. Aucun percentile de population n'est calculé.
- **Lissage sur 7 jours calendaires**, la variabilité d'un jour à l'autre étant élevée.
- **Corrélations avec le contexte** (heure, sommeil, fatigue) affichées seulement après 30 séances, en corrélation de
  rangs de Spearman et avec la formulation « associé à », jamais « cause ».
- **Chronométrage synchronisé sur les images d'écran** : durées de présentation exprimées en nombre d'images, écart
  entre durée prévue et mesurée enregistré, profil d'appareil associé à chaque séance.

## Limites

- Les essais disponibles sont de petite taille (47 à 88 participantes) et portent presque exclusivement sur des femmes
  traitées pour un cancer du sein. Leur transposition à d'autres situations est une extrapolation.
- Les composantes du programme MAAT n'ont pas été testées isolément ; Lexique s'en inspire sans reproduire ce
  protocole, conduit par un thérapeute en huit séances.
- Une progression dans l'application reflète en partie l'apprentissage de ses propres tâches, et non nécessairement une
  amélioration cognitive générale. Les formes parallèles du bilan et l'exclusion de leurs items de l'entraînement
  réduisent ce biais sans le supprimer.
- Le chronométrage est enregistré au millième de seconde, mais la latence du clavier ou de l'écran tactile (10 à 50 ms)
  n'est pas mesurable depuis une page web. Seules les comparaisons sur un même appareil sont fiables.
- Le domaine le plus faible ne peut pas être désigné rigoureusement sans normes, puisque des mots, des millisecondes et
  des empans ne sont pas commensurables. Le premier bilan fournit un classement indicatif ; seule l'évolution par
  rapport à la ligne de base est interprétable.

## Références

Le statut indique si la source a été consultée lors de la conception (novembre 2026) ou citée de mémoire, auquel cas
elle reste à vérifier.

| Référence | Apport | Statut |
| --- | --- | --- |
| Von Ah D, Carpenter JS, Saykin A, et al. Advanced cognitive training for breast cancer survivors: a randomized controlled trial. *Breast Cancer Res Treat.* 2012;135(3):799-809. | Essai pilote, 82 participantes analysées. Vitesse de traitement : transfert vers la mémoire immédiate (d = 0,75 en fin d'intervention, 0,82 à 2 mois). Mémoire : d = 0,59 et 0,70 à 2 mois. Pas de correction pour comparaisons multiples. | [Consultée](https://pmc.ncbi.nlm.nih.gov/articles/PMC3677054) |
| Meneses K, Benz R, Bail JR, et al. Speed of processing training in middle-aged and older breast cancer survivors (SOAR): results of a randomized controlled pilot. *Breast Cancer Res Treat.* 2018;168:259-267. | 60 participantes, entraînement à domicile de type double décision. Effets sur la mémoire épisodique (d = 0,55) et les fonctions exécutives (d = 0,55) ; pas d'effet significatif sur la vitesse NIH Toolbox. Lien d'intérêt déclaré d'un coauteur avec l'éditeur du logiciel. | [Consultée](https://link.springer.com/article/10.1007/s10549-017-4564-2) |
| Ferguson RJ, Sigmon ST, Pritchard AJ, et al. A randomized trial of videoconference-delivered cognitive behavioral therapy for survivors of breast cancer with self-reported cognitive dysfunction. *Cancer.* 2016;122(11):1782-1791. | 47 participantes, 8 séances de MAAT en visioconférence contre un contrôle actif : moins de plainte mnésique, meilleure vitesse de traitement ; baisse de l'anxiété non significative. | Consultée (communiqué de l'éditeur) ; volume et pages de mémoire |
| Kucherer S, Ferguson RJ. Cognitive behavioral therapy for cancer-related cognitive dysfunction. *Curr Opin Support Palliat Care.* 2017;11(1):46-51. | Revue : MAAT « peut être » efficace ; essais plus larges nécessaires. | Consultée |
| Ball K, Berch DB, Helmers KF, et al. Effects of cognitive training interventions with older adults: a randomized controlled trial. *JAMA.* 2002;288(18):2271-2281. | Essai ACTIVE, personnes âgées sans cancer ; effets à 2 ans. | De mémoire |
| Rebok GW, Ball K, Guey LT, et al. Ten-year effects of the ACTIVE cognitive training trial on cognition and everyday functioning in older adults. *J Am Geriatr Soc.* 2014;62(1):16-24. | Effets à 10 ans de l'entraînement de la vitesse et du raisonnement. | De mémoire |
| Levitt H. Transformed up-down methods in psychoacoustics. *J Acoust Soc Am.* 1971;49:467-477. | Taux de convergence des escaliers adaptatifs. | De mémoire, résultat classique |
| Wozniak PA. Optimization of learning (algorithme SM-2). 1990. | Répétition espacée. | De mémoire |
| Roediger HL, Karpicke JD. Test-enhanced learning. *Psychol Sci.* 2006;17(3):249-255. | Effet de test. | De mémoire |
| Cepeda NJ, Pashler H, Vul E, et al. Distributed practice in verbal recall tasks. *Psychol Bull.* 2006;132(3):354-380. | Effet d'espacement. | De mémoire |
| Efstratiadou EA, Papathanasiou I, Holland R, et al. A systematic review of semantic feature analysis therapy studies for aphasia. *J Speech Lang Hear Res.* 2018;61(5):1261-1278. | Analyse des traits sémantiques. | De mémoire |
| James LE, Burke DM. Phonological priming effects on word retrieval and tip-of-the-tongue experiences in young and older adults. *J Exp Psychol Learn Mem Cogn.* 2000;26(6):1378-1391. | L'amorce phonologique aide à résoudre le mot sur le bout de la langue. | De mémoire |
| Troyer AK, Moscovitch M, Winocur G. Clustering and switching as two components of verbal fluency. *Neuropsychology.* 1997;11(1):138-146. | Analyse des fluences. | De mémoire |
| Melby-Lervåg M, Redick TS, Hulme C. Working memory training does not improve performance on measures of intelligence or other measures of "far transfer". *Perspect Psychol Sci.* 2016;11(4):512-534. | Absence de transfert lointain de l'entraînement de la mémoire de travail. | De mémoire |
| Ferrand L, New B, Brysbaert M, et al. The French Lexicon Project. *Behav Res Methods.* 2010;42(2):488-496. | Référence pour la décision lexicale en français. | De mémoire |
