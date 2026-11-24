/** Consignes affichées avant chaque bloc de la séance. */
import type { IdExercice } from './catalogue';

export const CONSIGNES: Record<IdExercice, string> = {
  'double-decision':
    "Une voiture ou un camion apparaît au centre, avec un point sur le pourtour, très brièvement. Indiquez la forme, puis la position du point. L'affichage raccourcit quand vous réussissez.",
  'decision-lexicale': "Une suite de lettres s'affiche : est-ce un mot français ? Répondez vite, sans sacrifier la justesse.",
  appariement: 'Deux suites de symboles s’affichent l’une sous l’autre. Sont-elles exactement pareilles ?',
  fluence: "Écrivez le plus de mots possible répondant à la consigne. Ne vous censurez pas : vous trierez ensuite.",
  'definition-mot':
    "Trouvez le mot qui correspond à la définition. Si le mot ne vient pas, demandez un indice : c'est prévu, et cela aide à fixer le mot. Les mots manqués reviendront en révision.",
  'traits-semantiques':
    "Pour chaque mot, décrivez sa catégorie, son usage, son aspect, son lieu et ce qu'il évoque. Cette exploration renforce les liens qui permettent de retrouver un mot.",
  discrimination: 'Choisissez le mot exact pour compléter la phrase. Les termes proposés sont proches : la nuance compte.',
  intrus: 'Parmi ces mots, un seul ne partage pas le trait commun aux autres. Lequel ?',
  registre:
    'Reformulez la phrase dans un registre adapté à la situation indiquée, puis comparez avec des propositions et évaluez votre version.',
  'repetition-espacee':
    'Retrouvez les mots arrivés à échéance. Chaque carte revient à un intervalle qui s’allonge quand vous la réussissez.',
  'n-back': 'Des lettres défilent. Appuyez quand la lettre est la même que celle vue n lettres plus tôt.',
  'empan-inverse': 'Des chiffres s’affichent un à un. Tapez-les ensuite dans l’ordre inverse.',
  'mise-a-jour': 'Des lettres défilent, en nombre imprévisible. À la fin, tapez les dernières, dans l’ordre.',
  stroop: "Un nom de couleur s'affiche, écrit dans une encre de couleur. Indiquez la couleur de l'encre, pas le mot.",
  alternance:
    "Un chiffre et une lettre s'affichent. Selon la consigne indiquée au-dessus, jugez le chiffre (pair ou impair) ou la lettre (voyelle ou consonne).",
  'go-nogo': "Appuyez le plus vite possible pour chaque lettre, sauf pour la lettre X : retenez-vous.",
  'liste-strategies': "Vous allez apprendre une liste en appliquant une stratégie d'encodage, puis la rappeler.",
  paragraphe: "Lisez une courte note, comme au bureau. Vous en restituerez ensuite l'essentiel, puis répondrez à quelques questions.",
  'methode-lieux': 'Déposez mentalement chaque élément le long de votre parcours, puis retrouvez-les en le reparcourant.',
};
