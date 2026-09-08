// Slash command definitions as plain JSON (registered via scripts/deploy-commands.js)
// Option types: 1 = subcommand, 3 = string, 4 = integer, 6 = user

const intOpt = (name, description, required = true) => ({ type: 4, name, description, required });
const userOpt = (name, description) => ({ type: 6, name, description, required: true });

export const commands = [
  {
    name: 'session',
    description: 'Gérer les sessions Cardenveil',
    options: [
      { type: 1, name: 'create', description: 'Créer une nouvelle session (MJ uniquement)' },
      {
        type: 1,
        name: 'edit',
        description: 'Modifier une session (MJ uniquement)',
        options: [intOpt('id', 'ID de la session')],
      },
      { type: 1, name: 'list', description: 'Lister les sessions à venir' },
      {
        type: 1,
        name: 'info',
        description: "Afficher les détails d'une session",
        options: [intOpt('id', 'ID de la session')],
      },
      {
        type: 1,
        name: 'status',
        description: "Changer le statut d'une session (MJ uniquement)",
        options: [
          intOpt('id', 'ID de la session'),
          {
            type: 3,
            name: 'status',
            description: 'Nouveau statut',
            required: true,
            choices: [
              { name: 'Recrutement', value: 'recrutement' },
              { name: 'En préparation', value: 'en_preparation' },
              { name: 'Prêt', value: 'pret' },
              { name: 'Fini', value: 'fini' },
              { name: 'Annulé', value: 'cancelled' },
            ],
          },
        ],
      },
      {
        type: 1,
        name: 'cancel',
        description: 'Annuler une session (MJ uniquement)',
        options: [intOpt('id', 'ID de la session')],
      },
    ],
  },
  {
    name: 'register',
    description: 'Gérer vos inscriptions',
    options: [
      {
        type: 1,
        name: 'join',
        description: "S'inscrire à une session",
        options: [intOpt('id', 'ID de la session')],
      },
      {
        type: 1,
        name: 'leave',
        description: "Se désinscrire d'une session",
        options: [intOpt('id', 'ID de la session')],
      },
      { type: 1, name: 'my-sessions', description: 'Lister vos inscriptions' },
    ],
  },
  {
    name: 'mj',
    description: 'Outils MJ pour gérer les sessions',
    options: [
      {
        type: 1,
        name: 'promote',
        description: "Promouvoir un joueur de la liste d'attente",
        options: [intOpt('session', 'ID de la session'), userOpt('joueur', 'Joueur à promouvoir')],
      },
      {
        type: 1,
        name: 'kick',
        description: "Retirer un joueur d'une session",
        options: [intOpt('session', 'ID de la session'), userOpt('joueur', 'Joueur à retirer')],
      },
      {
        type: 1,
        name: 'remind',
        description: 'Programmer un rappel personnalisé',
        options: [
          intOpt('session', 'ID de la session'),
          {
            type: 4,
            name: 'hours',
            description: 'Heures avant la session',
            required: true,
            min_value: 1,
            max_value: 168,
          },
        ],
      },
    ],
  },
  {
    name: 'ping',
    description: 'Vérifier que le bot est en ligne',
  },
];
