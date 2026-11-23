/** Contenu de la page « Méthode ». Tenu à jour avec METHODE.md. */

export const NIVEAUX = [
  { niveau: 'A', texte: "Au moins un essai contrôlé randomisé auprès de personnes traitées pour un cancer, même de petite taille." },
  { niveau: 'B', texte: 'Efficacité établie dans une autre population (personnes âgées, aphasie, adultes sains), donc transposée.' },
  { niveau: 'C', texte: "Paradigme de mesure validé ou fondement théorique, sans démonstration d'un effet d'entraînement qui se transfère à la vie quotidienne." },
] as const;

export const FAMILLES = [
  { famille: 'Vitesse de traitement (double décision)', niveau: 'A', role: 'Entraînement prioritaire, au moins quatre séances sur six' },
  { famille: 'Volet comportemental inspiré de MAAT', niveau: 'A', role: 'Auto-observation, compensation, régulation de l’activation' },
  { famille: "Stratégies d'encodage en mémoire épisodique", niveau: 'A', role: 'Entraînement' },
  { famille: 'Accès lexical : indiçage, traits sémantiques', niveau: 'B', role: 'Entraînement central, centré sur votre vocabulaire réel' },
  { famille: 'Répétition espacée et pratique de récupération', niveau: 'B', role: 'Consolidation' },
  { famille: 'Méthode des lieux', niveau: 'B', role: 'Stratégie' },
  { famille: 'Fluences, décision lexicale, discrimination, registre', niveau: 'C', role: 'Mesure, échauffement, entraînement écologique' },
  { famille: 'Mémoire de travail et fonctions exécutives', niveau: 'C', role: 'Mesure et maintien, faible poids' },
] as const;

export interface Reference {
  texte: string;
  apport: string;
  url?: string;
}

export const REFERENCES: readonly Reference[] = [
  {
    texte: 'Von Ah D, Carpenter JS, Saykin A, et al. Advanced cognitive training for breast cancer survivors: a randomized controlled trial. Breast Cancer Res Treat. 2012;135(3):799-809.',
    apport: "Essai pilote (82 participantes analysées). L'entraînement de la vitesse de traitement améliore la vitesse et, par transfert, la mémoire immédiate (d = 0,75 à la fin, 0,82 à 2 mois). Pas de correction pour comparaisons multiples.",
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3677054',
  },
  {
    texte: 'Meneses K, Benz R, Bail JR, et al. Speed of processing training in middle-aged and older breast cancer survivors (SOAR): results of a randomized controlled pilot. Breast Cancer Res Treat. 2018;168:259-267.',
    apport: "Essai pilote (60 participantes), entraînement à domicile de type double décision. Effets sur la mémoire épisodique et les fonctions exécutives ; pas d'effet significatif sur la vitesse mesurée par la batterie NIH Toolbox.",
    url: 'https://link.springer.com/article/10.1007/s10549-017-4564-2',
  },
  {
    texte: 'Ball K, Berch DB, Helmers KF, et al. Effects of cognitive training interventions with older adults: a randomized controlled trial (ACTIVE). JAMA. 2002;288(18):2271-2281.',
    apport: 'Grand essai chez des personnes âgées sans cancer ; effets ciblés des entraînements à 2 ans.',
  },
  {
    texte: 'Rebok GW, Ball K, Guey LT, et al. Ten-year effects of the ACTIVE cognitive training trial on cognition and everyday functioning in older adults. J Am Geriatr Soc. 2014;62(1):16-24.',
    apport: 'Effets de l’entraînement de la vitesse et du raisonnement maintenus à 10 ans sur les capacités entraînées.',
  },
  {
    texte: 'Ferguson RJ, Sigmon ST, Pritchard AJ, et al. A randomized trial of videoconference-delivered cognitive behavioral therapy for survivors of breast cancer with self-reported cognitive dysfunction. Cancer. 2016;122(11):1782-1791.',
    apport: 'Essai de MAAT (47 participantes, 8 séances en visioconférence, contrôle actif) : moins de plainte mnésique, meilleure vitesse de traitement.',
  },
  {
    texte: 'Kucherer S, Ferguson RJ. Cognitive behavioral therapy for cancer-related cognitive dysfunction. Curr Opin Support Palliat Care. 2017;11(1):46-51.',
    apport: 'Revue : MAAT « peut être » efficace ; des essais plus larges restent nécessaires.',
  },
  {
    texte: 'Levitt H. Transformed up-down methods in psychoacoustics. J Acoust Soc Am. 1971;49:467-477.',
    apport: 'Fondement de l’escalier adaptatif : la règle 3 réussites / 1 échec converge vers 79,4 % de réussite.',
  },
  {
    texte: 'Roediger HL, Karpicke JD. Test-enhanced learning. Psychol Sci. 2006;17(3):249-255. Cepeda NJ, et al. Distributed practice in verbal recall tasks. Psychol Bull. 2006;132(3):354-380.',
    apport: 'Effet de test et effet d’espacement, fondements de la répétition espacée.',
  },
  {
    texte: 'Efstratiadou EA, Papathanasiou I, Holland R, et al. A systematic review of semantic feature analysis therapy studies for aphasia. J Speech Lang Hear Res. 2018;61(5):1261-1278.',
    apport: 'Analyse des traits sémantiques en aphasie ; gains surtout spécifiques aux items travaillés.',
  },
  {
    texte: 'Melby-Lervåg M, Redick TS, Hulme C. Working memory training does not improve performance on measures of intelligence or other measures of “far transfer”. Perspect Psychol Sci. 2016;11(4):512-534.',
    apport: 'Absence de transfert lointain de l’entraînement de la mémoire de travail ; justifie son faible poids.',
  },
];

export const LIMITES = [
  'Les essais disponibles sont de petite taille et portent presque exclusivement sur des femmes traitées pour un cancer du sein. Leur transposition à d’autres situations est une extrapolation.',
  'Les composantes du programme MAAT n’ont pas été testées isolément ; Lexique s’en inspire sans reproduire ce protocole, conduit par un thérapeute.',
  'Une progression dans l’application reflète en partie l’apprentissage de ses propres tâches, et non nécessairement une amélioration cognitive générale.',
  'Le chronométrage est enregistré au millième de seconde, mais la latence du clavier ou de l’écran tactile (10 à 50 ms) n’est pas mesurable depuis une page web. Seules les comparaisons sur un même appareil sont fiables.',
  'La variabilité d’un jour à l’autre est élevée : une séance isolée ne doit pas être interprétée. Les courbes sont lissées sur 7 jours.',
];
