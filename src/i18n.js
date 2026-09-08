import config from './config.js';

export const translations = {
  fr: {
    // Session creation
    session_create_title: '🎲 Créer une Session Cardenveil',
    session_created: '✅ Session créée avec succès !',
    session_not_found: '❌ Session introuvable.',
    session_cancelled: '❌ Session annulée.',
    session_already_full: '❌ Cette session est complète.',
    session_status_updated: '✅ Statut de la session mis à jour.',

    // Session edit
    session_edit_title: '✏️ Modifier la Session',
    session_edited: '✅ Session #{id} modifiée avec succès !',

    // Setup panel (post-creation wizard)
    session_setup: '🛠 Configurez la session — chaque changement se répercute en direct.',
    session_details_title: 'Détails de la Session',
    setup_details_btn: '✏️ Détails supplémentaires',
    setup_finish_btn: '✅ Terminer',
    setup_publish_btn: "📢 Publier l'annonce",
    setup_published: "📢 Annonce publiée !",
    setup_edit_btn: '⚙️ Modifier (date/joueurs/statut)',
    setup_finish_btn: '✅ Terminer',
    setup_publish_btn: "📢 Publier l'annonce",
    setup_published: "📢 Annonce publiée !",
    setup_done: '✅ Session configurée !',
    setup_updated: '✅ Détails enregistrés.',
    select_format: 'Format (One shot / Two shot / Mini shot)',
    select_type: 'Type (En ligne / IRL / Mixte)',
    select_level: "Niveau d'accessibilité",

    // Modal fields
    field_mj: 'MJ (mention Discord)',
    field_system: 'Système',
    field_format: 'Format',
    field_date: 'Date',
    field_duration: 'Durée',
    field_type: 'Type (En ligne/IRL/Mixte)',
    field_level: "Niveau d'accessibilité",
    field_platform: 'Plateforme',
    field_warnings: 'Avertissements (optionnel)',
    field_tags: 'Tags (séparés par des espaces, ex: #Stratégique #Goofy)',
    field_game_type: 'Type de partie',
    field_max_players: 'Nombre max de joueurs',
    field_status: 'Statut',
    field_description: 'Description',
    field_comments: 'Commentaires (optionnel)',

    // Registration
    register_button: "📝 S'inscrire",
    unregister_button: '❌ Se désinscrire',
    registered: '✅ Vous êtes inscrit(e) à cette session !',
    unregistered: '✅ Vous avez été désinscrit(e).',
    already_registered: '⚠️ Vous êtes déjà inscrit(e).',
    not_registered: "⚠️ Vous n'êtes pas inscrit(e).",
    waitlisted: '📋 Session complète. Vous êtes sur liste d\'attente (position: {position}).',
    promoted: "🎉 Vous avez été promu(e) de la liste d'attente ! Vous êtes maintenant confirmé(e).",

    // Calendar
    calendar_title: '📅 Sessions à venir',
    calendar_empty: 'Aucune session planifiée.',

    // Reminders
    reminder_24h: '⏰ Rappel : Session dans 24 heures !',
    reminder_1h: '⏰ Rappel : Session dans 1 heure !',
    reminder_dm_24h: '🎲 Rappel : Votre session **{title}** commence dans 24 heures !',
    reminder_dm_1h: '🎲 Rappel : Votre session **{title}** commence dans 1 heure !',

    // MJ tools
    mj_only: '❌ Seuls les MJ peuvent utiliser cette commande.',
    mj_promoted: '✅ {user} a été promu(e) de la liste d\'attente.',
    mj_kicked: '✅ {user} a été retiré(e) de la session.',
    mj_reminder_set: '✅ Rappel programmé dans {hours} heure(s).',
    no_date: "❌ Cette session n'a pas de date définie.",
    reminder_past: '❌ Le rappel serait dans le passé.',
    player_already_confirmed: 'Ce joueur est déjà confirmé.',

    // Errors
    error_generic: '❌ Une erreur est survenue.',
    error_invalid_players: '❌ Nombre de joueurs invalide.',
    guild_only: "❌ Cette commande ne fonctionne qu'en serveur.",

    // Embed fields labels
    embed_mj: '🧙‍♂️ MJ',
    embed_system: '⚙️ Système',
    embed_format: '🪅 Format',
    embed_date: '📅 Date',
    embed_duration: '⏰ Durée',
    embed_type: '🌐 Type',
    embed_level: '⚔️ Niveau',
    embed_platform: '💻 Plateforme',
    embed_warnings: '⚠️ Avertissements',
    embed_tags: '🏷️ Tags',
    embed_game_type: '⚔️ Type de partie',
    embed_players: '👥 Joueurs',
    embed_status: '🔄 État',
    embed_description: '🧾 Description',
    embed_comments: '💬 Commentaires',
    embed_waitlist: "📋 Liste d'attente",

    // Status labels
    status_recruitment: 'Recrutement',
    status_preparation: 'En préparation',
    status_ready: 'Prêt',
    status_done: 'Fini',
    status_cancelled: 'Annulé',
  },
  en: {
    // Session creation
    session_create_title: '🎲 Create a Cardenveil Session',
    session_created: '✅ Session created successfully!',
    session_not_found: '❌ Session not found.',
    session_cancelled: '❌ Session cancelled.',
    session_already_full: '❌ This session is full.',
    session_status_updated: '✅ Session status updated.',

    // Session edit
    session_edit_title: '✏️ Edit Session',
    session_edited: '✅ Session #{id} edited successfully!',

    // Setup panel (post-creation wizard)
    session_setup: '🛠 Configure the session — every change goes live instantly.',
    session_details_title: 'Session Details',
    setup_details_btn: '✏️ More details',
    setup_finish_btn: '✅ Finish',
    setup_publish_btn: '📢 Publish announcement',
    setup_published: '📢 Announcement published!',
    setup_edit_btn: '⚙️ Edit (date/players/status)',
    setup_done: '✅ Session configured!',
    setup_updated: '✅ Details saved.',
    select_format: 'Format (One shot / Two shot / Mini shot)',
    select_type: 'Type (Online / IRL / Mixed)',
    select_level: 'Accessibility level',

    // Modal fields
    field_mj: 'GM (Discord mention)',
    field_system: 'System',
    field_format: 'Format',
    field_date: 'Date',
    field_duration: 'Duration',
    field_type: 'Type (Online/IRL/Mixed)',
    field_level: 'Accessibility level',
    field_platform: 'Platform',
    field_warnings: 'Warnings (optional)',
    field_tags: 'Tags (space-separated, e.g. #Strategic #Goofy)',
    field_game_type: 'Game type',
    field_max_players: 'Max players',
    field_status: 'Status',
    field_description: 'Description',
    field_comments: 'Comments (optional)',

    // Registration
    register_button: '📝 Register',
    unregister_button: '❌ Unregister',
    registered: '✅ You are registered for this session!',
    unregistered: '✅ You have been unregistered.',
    already_registered: '⚠️ You are already registered.',
    not_registered: '⚠️ You are not registered.',
    waitlisted: '📋 Session full. You are on the waitlist (position: {position}).',
    promoted: '🎉 You have been promoted from the waitlist! You are now confirmed.',

    // Calendar
    calendar_title: '📅 Upcoming Sessions',
    calendar_empty: 'No sessions scheduled.',

    // Reminders
    reminder_24h: '⏰ Reminder: Session in 24 hours!',
    reminder_1h: '⏰ Reminder: Session in 1 hour!',
    reminder_dm_24h: '🎲 Reminder: Your session **{title}** starts in 24 hours!',
    reminder_dm_1h: '🎲 Reminder: Your session **{title}** starts in 1 hour!',

    // MJ tools
    mj_only: '❌ Only GMs can use this command.',
    mj_promoted: '✅ {user} has been promoted from the waitlist.',
    mj_kicked: '✅ {user} has been removed from the session.',
    mj_reminder_set: '✅ Reminder set in {hours} hour(s).',
    no_date: '❌ This session has no date defined.',
    reminder_past: '❌ The reminder would be in the past.',
    player_already_confirmed: 'This player is already confirmed.',

    // Errors
    error_generic: '❌ An error occurred.',
    error_invalid_players: '❌ Invalid number of players.',
    guild_only: '❌ This command only works in a server.',

    // Embed fields labels
    embed_mj: '🧙‍♂️ GM',
    embed_system: '⚙️ System',
    embed_format: '🪅 Format',
    embed_date: '📅 Date',
    embed_duration: '⏰ Duration',
    embed_type: '🌐 Type',
    embed_level: '⚔️ Level',
    embed_platform: '💻 Platform',
    embed_warnings: '⚠️ Warnings',
    embed_tags: '🏷️ Tags',
    embed_game_type: '⚔️ Game type',
    embed_players: '👥 Players',
    embed_status: '🔄 Status',
    embed_description: '🧾 Description',
    embed_comments: '💬 Comments',
    embed_waitlist: '📋 Waitlist',

    // Status labels
    status_recruitment: 'Recruitment',
    status_preparation: 'In preparation',
    status_ready: 'Ready',
    status_done: 'Done',
    status_cancelled: 'Cancelled',
  },
};

export function t(key, replacements = {}) {
  let text = translations[config.language]?.[key] || translations.fr[key] || key;
  for (const [k, v] of Object.entries(replacements)) {
    text = text.replace(`{${k}}`, v);
  }
  return text;
}
