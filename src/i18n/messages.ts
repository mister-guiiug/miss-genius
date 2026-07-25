/**
 * Catalogue de messages FR + EN de Miss Genius.
 *
 * `fr` est la source de vérité de la FORME des clés ; `en` doit la refléter à
 * l'identique (une clé manquante ou en trop fait échouer `tsc` via le
 * `satisfies MessageShape<typeof fr>` ci-dessous), avec ses propres traductions.
 *
 * Convention : clés groupées par écran/feature ; `common.*` regroupe les libellés
 * réutilisés (Enregistrer, Annuler…). Les valeurs dynamiques utilisent des
 * placeholders `{param}` interpolés par le helper i18n. Les phrases dépendant
 * d'un nombre fournissent des sous-clés `one`/`other` (cf. `plural()` dans
 * ./index.ts) pour un pluriel correct dans chaque langue.
 *
 * NB : les noms de matières, niveaux de classe (« 6ᵉ »…) et noms de périodes
 * amorcées (« Trimestre 1 »…) sont des termes propres au système scolaire
 * français ET deviennent des données modifiables par l'utilisateur : ils vivent
 * dans le domaine (subjectCatalog.ts, periods.ts), pas ici.
 */

/** Forme profonde de `fr`, chaque feuille ramenée à `string` : force `en` à
 *  calquer exactement l'arborescence de `fr` tout en gardant ses propres textes. */
type MessageShape<T> = {
  [K in keyof T]: T[K] extends string ? string : MessageShape<T[K]>;
};

const fr = {
  common: {
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    confirm: 'Confirmer',
    close: 'Fermer',
    back: 'Retour',
    create: 'Créer',
    add: 'Ajouter',
    finish: 'Terminer',
    loading: 'Chargement…',
    weightShort: 'coef {weight}',
    subjectCount: {
      one: '{count} matière',
      other: '{count} matières',
    },
    gradeCount: {
      one: '{count} note',
      other: '{count} notes',
    },
    trend: {
      up: 'en hausse',
      down: 'en baisse',
      flat: 'stable',
    },
  },
  nav: {
    home: 'Accueil',
    subjects: 'Matières',
    scenarios: 'Scénarios',
    goal: 'Objectif',
    settings: 'Réglages',
    ariaLabel: 'Navigation principale',
    currentPage: '(page active)',
  },
  app: {
    subjectTitle: 'Matière',
  },
  header: {
    switchToLight: 'Passer en clair',
    switchToDark: 'Passer en sombre',
  },
  onboarding: {
    step1Title: 'Bienvenue dans Miss Genius',
    step1Text:
      'Simule tes moyennes scolaires, teste des hypothèses et garde le cap sur tes objectifs.',
    step2Title: 'Tes matières, tes notes',
    step2Text:
      'Ajoute des matières avec leurs coefficients, saisis tes notes : la moyenne se calcule toute seule.',
    step3Title: 'Vise une moyenne',
    step3Text:
      'Fixe un objectif et découvre la note qu’il te faut à la prochaine évaluation. 100 % hors ligne.',
    start: 'Commencer',
    next: 'Suivant',
    skip: 'Passer',
  },
  dashboard: {
    emptyTitle: 'Bienvenue dans Miss Genius',
    emptyDescription:
      'Choisis ta classe pour activer tes matières en un instant, puis simule tes moyennes.',
    chooseSubjects: 'Choisir mes matières',
    heroBadgeLabel: 'Niveau de la moyenne générale',
    overallAverage: 'Moyenne générale',
    scenarioName: 'Scénario : {name}',
    scenariosSaved: {
      one: '{count} enregistré',
      other: '{count} enregistrés',
    },
    goalDefined: 'Défini',
    goalToDefine: 'À définir',
    strengths: 'Tes points forts',
    toImprove: 'À renforcer en priorité',
    bySubject: 'Par matière',
    appreciation: {
      none: 'Pas encore de note',
      good: 'Point fort',
      mid: 'En bonne voie',
      low: 'À renforcer',
    },
  },
  subjects: {
    byClass: 'Par classe',
    reorderHint: 'Glisse les matières pour les réordonner.',
    reorder: 'Réorganiser',
    emptyTitle: 'Aucune matière',
    emptyDescription:
      'Choisis ta classe pour activer les matières habituelles, ou ajoute-les une par une.',
    quickStartByClass: 'Démarrage rapide par classe',
    newSubject: 'Nouvelle matière',
    editSubject: 'Modifier la matière',
    deleteTitle: 'Supprimer la matière ?',
    deleteMessage: '« {name} » et ses notes seront supprimées de ce scénario.',
    reorderAria: 'Réordonner {name}',
    editAria: 'Modifier {name}',
    deleteAria: 'Supprimer {name}',
    quickStart: {
      title: 'Démarrage rapide',
      intro:
        'Choisis ta classe : on te propose les matières habituelles. Tu pourras ajuster coefficients et notes ensuite.',
      myClass: 'Ma classe',
      alreadyAdded: 'déjà ajoutée',
      activate: {
        one: 'Activer {count} matière',
        other: 'Activer {count} matières',
      },
      allAdded: 'Toutes ces matières sont déjà ajoutées',
      selectAtLeastOne: 'Sélectionne au moins une matière',
    },
    form: {
      nameLabel: 'Nom de la matière',
      namePlaceholder: 'Mathématiques',
      weightLabel: 'Coefficient de la matière',
      weightHint: 'Poids de la matière dans la moyenne générale.',
      colorLegend: 'Couleur',
      iconLegend: 'Icône',
      colorAria: 'Couleur {color}',
      iconAria: 'Icône {icon}',
      submitAdd: 'Ajouter la matière',
      errorNameRequired: 'Donne un nom à la matière.',
      errorNameTaken: 'Une matière porte déjà ce nom.',
      errorWeight: 'Le coefficient doit être supérieur à 0.',
    },
  },
  subjectDetail: {
    notFoundTitle: 'Matière introuvable',
    notFoundDescription: 'Cette matière n’existe pas dans le scénario actif.',
    backToSubjects: 'Retour aux matières',
    addGrade: 'Ajouter une note',
    noGradesTitle: 'Aucune note',
    noGradesDescription:
      'Ajoute une première note pour calculer ta moyenne dans cette matière.',
    editGradeAria: 'Modifier la note',
    deleteGradeAria: 'Supprimer la note',
    newGrade: 'Nouvelle note',
    editGrade: 'Modifier la note',
    deleteTitle: 'Supprimer la note ?',
    deleteMessage: 'Cette note sera définitivement retirée de la matière.',
    normalized: 'soit {value}/{base}',
  },
  grades: {
    type: {
      controle: 'Contrôle',
      'devoir-maison': 'Devoir maison',
      oral: 'Oral',
      examen: 'Examen',
      autre: 'Autre',
    },
    defaultLabel: 'Note',
    form: {
      valueLabel: 'Note obtenue',
      valuePlaceholder: '14',
      maxLabel: 'Barème',
      weightLabel: 'Coefficient de la note',
      typeLabel: 'Type d’évaluation (facultatif)',
      typeNone: 'Non précisé',
      periodLabel: 'Période',
      titleLabel: 'Intitulé (facultatif)',
      titlePlaceholder: 'Chapitre 3 — fractions',
      dateLabel: 'Date (facultative)',
      submitAdd: 'Ajouter la note',
      errorMax: 'Le barème doit être supérieur à 0.',
      errorValue: 'La note doit être comprise entre 0 et {max}.',
      errorWeight: 'Le coefficient doit être supérieur à 0.',
    },
    simulator: {
      title: 'Et si j’avais cette note ?',
      gradeLabel: 'Note',
      maxLabel: 'Barème',
      weightLabel: 'Coef',
      invalid: 'Saisis une note valide pour voir l’impact.',
      subjectAverage: 'Moyenne de la matière',
      impact: 'Cette note ferait varier ta moyenne générale de {delta} point.',
    },
  },
  goal: {
    emptyTitle: 'Pas encore d’objectif possible',
    emptyDescription:
      'Ajoute des matières et des notes pour fixer un objectif et savoir ce qu’il te faut.',
    addSubject: 'Ajouter une matière',
    badgeLabel: 'Objectif',
    myGoal: 'Mon objectif',
    question: 'Que me faut-il pour atteindre {target}/{base} ?',
    typeLabel: 'Type d’objectif',
    typeGeneral: 'Moyenne générale',
    typeSubject: 'Une matière précise',
    targetSubjectLabel: 'Matière visée',
    evalSubjectLabel: 'Matière de la prochaine évaluation',
    evalSubjectHint:
      'C’est dans cette matière que la note nécessaire est calculée.',
    targetLabel: 'Moyenne cible (sur {base})',
    nextWeightLabel: 'Coef. prochaine éval.',
    nextMaxLabel: 'Barème prochaine éval.',
    requiredIn: 'Note nécessaire en {subject}',
    toAim: '… pour viser {target}/{base}.',
    save: 'Enregistrer l’objectif',
    clear: 'Effacer',
    reasonReached:
      'Bonne nouvelle : ton objectif est déjà atteint, même sans nouvelle note décisive.',
    reasonImpossible:
      'En une seule évaluation, l’objectif n’est pas atteignable (il faudrait dépasser {base}). Vise-le sur plusieurs notes ou ajuste-le.',
    reasonInvalid: 'Renseigne un objectif et un coefficient valides.',
  },
  scenarios: {
    newButton: 'Nouveau scénario',
    intro:
      'Compare des hypothèses : duplique un scénario, change quelques notes, et vois l’écart de moyenne générale par rapport au scénario actif.',
    active: 'actif',
    activate: 'Activer',
    duplicate: 'Dupliquer',
    rename: 'Renommer',
    renameAria: 'Renommer {name}',
    delta: 'Écart vs scénario actif :',
    newTitle: 'Nouveau scénario',
    nameLabel: 'Nom du scénario',
    namePlaceholder: 'Si je révise les maths',
    defaultName: 'Nouveau scénario',
    renameTitle: 'Renommer le scénario',
    deleteTitle: 'Supprimer le scénario ?',
    deleteMessage: '« {name} » sera définitivement supprimé.',
  },
  periods: {
    tablistLabel: 'Période',
    manageAria: 'Gérer les périodes',
    managerTitle: 'Périodes',
    modelLabel: 'Modèle',
    preset: {
      trimestres: '3 trimestres',
      semestres: '2 semestres',
      annee: 'Année (1 période)',
    },
    myPeriods: 'Mes périodes',
    nameAria: 'Nom de la période {name}',
    deleteAria: 'Supprimer la période {name}',
    addLabel: 'Ajouter une période',
    addPlaceholder: 'Trimestre 4, Rattrapage…',
    addAria: 'Ajouter la période',
    deleteNote:
      'Supprimer une période rattache ses notes à la première période restante (aucune note n’est perdue).',
    changeModelTitle: 'Changer le modèle de périodes ?',
    changeModelMessage:
      'Toutes les notes existantes seront regroupées dans la première période du nouveau modèle. Tu pourras les réaffecter ensuite.',
    apply: 'Appliquer',
  },
  pronote: {
    title: 'Connecter Pronote',
    doneTitle: 'Import terminé',
    previewNote:
      'Les matières déjà présentes ne sont pas dupliquées ; les notes s’ajoutent à la période active.',
    import: 'Importer',
    notConfigured:
      'Le connecteur Pronote n’est pas configuré sur ce déploiement (variable VITE_PRONOTE_PROXY_URL + Worker à déployer). Tu peux essayer l’import avec des données de démonstration.',
    urlLabel: 'Adresse Pronote',
    usernameLabel: 'Identifiant',
    passwordLabel: 'Mot de passe',
    passwordHint:
      'Transmis au connecteur uniquement le temps de la requête, jamais enregistré.',
    connecting: 'Connexion…',
    fetch: 'Récupérer mes notes',
    tryDemo: 'Essayer avec des données de démo',
    errorFetch: 'Échec de la récupération.',
    done: {
      grades: {
        one: '{count} note importée dans « {period} ».',
        other: '{count} notes importées dans « {period} ».',
      },
      subjects: {
        one: '{count} matière créée.',
        other: '{count} matières créées.',
      },
    },
    preview: {
      grades: {
        one: '{count} note prête à importer dans « {period} ».',
        other: '{count} notes prêtes à importer dans « {period} ».',
      },
      subjects: {
        one: 'Sur {count} matière.',
        other: 'Sur {count} matières.',
      },
    },
  },
  settings: {
    averagesTitle: 'Calcul des moyennes',
    roundingLabel: 'Arrondi affiché',
    roundingNearest: 'Au plus proche',
    roundingFloor: 'Au plancher (inférieur)',
    roundingCeil: 'Au plafond (supérieur)',
    roundingNone: 'Exact (aucun)',
    decimalsLabel: 'Décimales',
    normalizeLabel: 'Normaliser les notes sur d’autres bases',
    displayTitle: 'Affichage',
    gradeSortLabel: 'Ordre des notes (par matière)',
    sortDateDesc: 'Date — plus récente d’abord',
    sortDateAsc: 'Date — plus ancienne d’abord',
    sortValueDesc: 'Note — meilleure d’abord',
    sortAdded: 'Ordre d’ajout',
    sourcesTitle: 'Sources de notes',
    sourcesText:
      'Importe automatiquement tes notes depuis Pronote dans la période active.',
    backupTitle: 'Sauvegarde locale',
    backupText:
      'Tes données restent sur cet appareil. Exporte-les pour les conserver ou les transférer.',
    exportJson: 'Exporter (JSON)',
    importJson: 'Importer (JSON)',
    exportDone: 'Sauvegarde exportée.',
    importDone: 'Données importées avec succès.',
    importError: 'Import impossible : fichier invalide.',
    dangerTitle: 'Zone sensible',
    resetAll: 'Réinitialiser toutes les données',
    appTitle: 'Application',
    appText:
      'Récupère la dernière version (recharge l’app sans toucher à tes données).',
    updating: 'Mise à jour…',
    forceUpdate: 'Forcer la mise à jour',
    otherApps: 'Nos autres applications',
    version: 'Miss Genius v{version}',
    resetConfirmTitle: 'Tout réinitialiser ?',
    resetConfirmMessage:
      'Tous les scénarios, matières et notes seront effacés. Cette action est irréversible.',
    resetConfirmButton: 'Tout effacer',
    resetDone: 'Données réinitialisées.',
    language: 'Langue',
    languageAria: 'Choisir la langue',
  },
  footer: {
    tagline: 'Miss Genius est gratuit, local et open source.',
    sourceCode: 'Code source',
    buyCoffee: 'M’offrir un café',
  },
  pwa: {
    updateReady: 'Une nouvelle version de Miss Genius est prête.',
    offlineReady: 'Miss Genius fonctionne maintenant hors ligne.',
    update: 'Mettre à jour',
    later: 'Plus tard',
    ok: 'OK',
  },
  language: {
    fr: 'Français',
    en: 'English',
  },
} as const;

const en = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    confirm: 'Confirm',
    close: 'Close',
    back: 'Back',
    create: 'Create',
    add: 'Add',
    finish: 'Done',
    loading: 'Loading…',
    weightShort: 'weight {weight}',
    subjectCount: {
      one: '{count} subject',
      other: '{count} subjects',
    },
    gradeCount: {
      one: '{count} grade',
      other: '{count} grades',
    },
    trend: {
      up: 'up',
      down: 'down',
      flat: 'steady',
    },
  },
  nav: {
    home: 'Home',
    subjects: 'Subjects',
    scenarios: 'Scenarios',
    goal: 'Goal',
    settings: 'Settings',
    ariaLabel: 'Main navigation',
    currentPage: '(current page)',
  },
  app: {
    subjectTitle: 'Subject',
  },
  header: {
    switchToLight: 'Switch to light mode',
    switchToDark: 'Switch to dark mode',
  },
  onboarding: {
    step1Title: 'Welcome to Miss Genius',
    step1Text:
      'Simulate your school averages, try out what-ifs, and stay on track toward your goals.',
    step2Title: 'Your subjects, your grades',
    step2Text:
      'Add subjects with their weights and enter your grades — the average is worked out for you.',
    step3Title: 'Aim for an average',
    step3Text:
      'Set a goal and find out the grade you need on your next test. 100% offline.',
    start: 'Get started',
    next: 'Next',
    skip: 'Skip',
  },
  dashboard: {
    emptyTitle: 'Welcome to Miss Genius',
    emptyDescription:
      'Pick your class to set up your subjects in seconds, then simulate your averages.',
    chooseSubjects: 'Choose my subjects',
    heroBadgeLabel: 'Overall average level',
    overallAverage: 'Overall average',
    scenarioName: 'Scenario: {name}',
    scenariosSaved: {
      one: '{count} saved',
      other: '{count} saved',
    },
    goalDefined: 'Set',
    goalToDefine: 'Not set',
    strengths: 'Your strengths',
    toImprove: 'Focus on these first',
    bySubject: 'By subject',
    appreciation: {
      none: 'No grades yet',
      good: 'Strength',
      mid: 'On track',
      low: 'Needs work',
    },
  },
  subjects: {
    byClass: 'By class',
    reorderHint: 'Drag subjects to reorder them.',
    reorder: 'Reorder',
    emptyTitle: 'No subjects yet',
    emptyDescription:
      'Pick your class to set up the usual subjects, or add them one by one.',
    quickStartByClass: 'Quick start by class',
    newSubject: 'New subject',
    editSubject: 'Edit subject',
    deleteTitle: 'Delete subject?',
    deleteMessage:
      '“{name}” and its grades will be removed from this scenario.',
    reorderAria: 'Reorder {name}',
    editAria: 'Edit {name}',
    deleteAria: 'Delete {name}',
    quickStart: {
      title: 'Quick start',
      intro:
        'Pick your class and we’ll suggest the usual subjects. You can adjust weights and grades afterwards.',
      myClass: 'My class',
      alreadyAdded: 'already added',
      activate: {
        one: 'Activate {count} subject',
        other: 'Activate {count} subjects',
      },
      allAdded: 'All these subjects are already added',
      selectAtLeastOne: 'Select at least one subject',
    },
    form: {
      nameLabel: 'Subject name',
      namePlaceholder: 'Mathematics',
      weightLabel: 'Subject weight',
      weightHint: 'How much this subject counts toward your overall average.',
      colorLegend: 'Color',
      iconLegend: 'Icon',
      colorAria: 'Color {color}',
      iconAria: 'Icon {icon}',
      submitAdd: 'Add subject',
      errorNameRequired: 'Give the subject a name.',
      errorNameTaken: 'A subject already has this name.',
      errorWeight: 'The weight must be greater than 0.',
    },
  },
  subjectDetail: {
    notFoundTitle: 'Subject not found',
    notFoundDescription: 'This subject doesn’t exist in the active scenario.',
    backToSubjects: 'Back to subjects',
    addGrade: 'Add a grade',
    noGradesTitle: 'No grades yet',
    noGradesDescription:
      'Add a first grade to calculate your average in this subject.',
    editGradeAria: 'Edit grade',
    deleteGradeAria: 'Delete grade',
    newGrade: 'New grade',
    editGrade: 'Edit grade',
    deleteTitle: 'Delete grade?',
    deleteMessage: 'This grade will be permanently removed from the subject.',
    normalized: 'i.e. {value}/{base}',
  },
  grades: {
    type: {
      controle: 'Test',
      'devoir-maison': 'Homework',
      oral: 'Oral',
      examen: 'Exam',
      autre: 'Other',
    },
    defaultLabel: 'Grade',
    form: {
      valueLabel: 'Grade obtained',
      valuePlaceholder: '14',
      maxLabel: 'Out of',
      weightLabel: 'Grade weight',
      typeLabel: 'Assessment type (optional)',
      typeNone: 'Unspecified',
      periodLabel: 'Period',
      titleLabel: 'Label (optional)',
      titlePlaceholder: 'Chapter 3 — fractions',
      dateLabel: 'Date (optional)',
      submitAdd: 'Add grade',
      errorMax: 'The maximum must be greater than 0.',
      errorValue: 'The grade must be between 0 and {max}.',
      errorWeight: 'The weight must be greater than 0.',
    },
    simulator: {
      title: 'What if I got this grade?',
      gradeLabel: 'Grade',
      maxLabel: 'Out of',
      weightLabel: 'Weight',
      invalid: 'Enter a valid grade to see the impact.',
      subjectAverage: 'Subject average',
      impact: 'This grade would change your overall average by {delta} points.',
    },
  },
  goal: {
    emptyTitle: 'No goal to set yet',
    emptyDescription:
      'Add subjects and grades to set a goal and see what you need.',
    addSubject: 'Add a subject',
    badgeLabel: 'Goal',
    myGoal: 'My goal',
    question: 'What do I need to reach {target}/{base}?',
    typeLabel: 'Goal type',
    typeGeneral: 'Overall average',
    typeSubject: 'A specific subject',
    targetSubjectLabel: 'Target subject',
    evalSubjectLabel: 'Subject of your next test',
    evalSubjectHint: 'The grade you need is calculated for this subject.',
    targetLabel: 'Target average (out of {base})',
    nextWeightLabel: 'Next test weight',
    nextMaxLabel: 'Next test max',
    requiredIn: 'Grade needed in {subject}',
    toAim: '… to reach {target}/{base}.',
    save: 'Save goal',
    clear: 'Clear',
    reasonReached:
      'Good news: your goal is already reached, even without a decisive new grade.',
    reasonImpossible:
      'You can’t reach this goal in a single test (you’d need more than {base}). Aim for it over several grades or adjust it.',
    reasonInvalid: 'Enter a valid target and weight.',
  },
  scenarios: {
    newButton: 'New scenario',
    intro:
      'Compare what-ifs: duplicate a scenario, change a few grades, and see how the overall average differs from your active scenario.',
    active: 'active',
    activate: 'Activate',
    duplicate: 'Duplicate',
    rename: 'Rename',
    renameAria: 'Rename {name}',
    delta: 'Difference vs active scenario:',
    newTitle: 'New scenario',
    nameLabel: 'Scenario name',
    namePlaceholder: 'If I study maths',
    defaultName: 'New scenario',
    renameTitle: 'Rename scenario',
    deleteTitle: 'Delete scenario?',
    deleteMessage: '“{name}” will be permanently deleted.',
  },
  periods: {
    tablistLabel: 'Period',
    manageAria: 'Manage periods',
    managerTitle: 'Periods',
    modelLabel: 'Model',
    preset: {
      trimestres: '3 terms',
      semestres: '2 semesters',
      annee: 'Full year (1 period)',
    },
    myPeriods: 'My periods',
    nameAria: 'Name of period {name}',
    deleteAria: 'Delete period {name}',
    addLabel: 'Add a period',
    addPlaceholder: 'Term 4, Retake…',
    addAria: 'Add period',
    deleteNote:
      'Deleting a period moves its grades to the first remaining period (no grade is lost).',
    changeModelTitle: 'Change the period model?',
    changeModelMessage:
      'All existing grades will be grouped into the first period of the new model. You can reassign them afterwards.',
    apply: 'Apply',
  },
  pronote: {
    title: 'Connect Pronote',
    doneTitle: 'Import complete',
    previewNote:
      'Subjects that already exist aren’t duplicated; grades are added to the active period.',
    import: 'Import',
    notConfigured:
      'The Pronote connector isn’t set up on this deployment (VITE_PRONOTE_PROXY_URL variable + Worker to deploy). You can try the import with demo data.',
    urlLabel: 'Pronote address',
    usernameLabel: 'Username',
    passwordLabel: 'Password',
    passwordHint:
      'Sent to the connector only for the duration of the request, never stored.',
    connecting: 'Connecting…',
    fetch: 'Fetch my grades',
    tryDemo: 'Try with demo data',
    errorFetch: 'Fetch failed.',
    done: {
      grades: {
        one: '{count} grade imported into “{period}”.',
        other: '{count} grades imported into “{period}”.',
      },
      subjects: {
        one: '{count} subject created.',
        other: '{count} subjects created.',
      },
    },
    preview: {
      grades: {
        one: '{count} grade ready to import into “{period}”.',
        other: '{count} grades ready to import into “{period}”.',
      },
      subjects: {
        one: 'Across {count} subject.',
        other: 'Across {count} subjects.',
      },
    },
  },
  settings: {
    averagesTitle: 'Average calculation',
    roundingLabel: 'Displayed rounding',
    roundingNearest: 'Nearest',
    roundingFloor: 'Round down',
    roundingCeil: 'Round up',
    roundingNone: 'Exact (none)',
    decimalsLabel: 'Decimals',
    normalizeLabel: 'Normalize grades on other scales',
    displayTitle: 'Display',
    gradeSortLabel: 'Grade order (per subject)',
    sortDateDesc: 'Date — newest first',
    sortDateAsc: 'Date — oldest first',
    sortValueDesc: 'Grade — highest first',
    sortAdded: 'Order added',
    sourcesTitle: 'Grade sources',
    sourcesText:
      'Automatically import your grades from Pronote into the active period.',
    backupTitle: 'Local backup',
    backupText:
      'Your data stays on this device. Export it to keep or transfer it.',
    exportJson: 'Export (JSON)',
    importJson: 'Import (JSON)',
    exportDone: 'Backup exported.',
    importDone: 'Data imported successfully.',
    importError: 'Import failed: invalid file.',
    dangerTitle: 'Danger zone',
    resetAll: 'Reset all data',
    appTitle: 'App',
    appText:
      'Get the latest version (reloads the app without touching your data).',
    updating: 'Updating…',
    forceUpdate: 'Force update',
    otherApps: 'Our other apps',
    version: 'Miss Genius v{version}',
    resetConfirmTitle: 'Reset everything?',
    resetConfirmMessage:
      'All scenarios, subjects and grades will be erased. This cannot be undone.',
    resetConfirmButton: 'Erase everything',
    resetDone: 'Data reset.',
    language: 'Language',
    languageAria: 'Choose language',
  },
  footer: {
    tagline: 'Miss Genius is free, local and open source.',
    sourceCode: 'Source code',
    buyCoffee: 'Buy me a coffee',
  },
  pwa: {
    updateReady: 'A new version of Miss Genius is ready.',
    offlineReady: 'Miss Genius now works offline.',
    update: 'Update',
    later: 'Later',
    ok: 'OK',
  },
  language: {
    fr: 'Français',
    en: 'English',
  },
} as const satisfies MessageShape<typeof fr>;

export const messages = { fr, en };

/** Locales prises en charge. */
export type Locale = keyof typeof messages; // 'fr' | 'en'

/** Forme (typée) du dictionnaire de messages (dérivée de `fr`). */
export type Messages = typeof fr;
