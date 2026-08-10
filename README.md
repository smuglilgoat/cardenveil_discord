# Cardenveil Discord Bot

Bot Discord pour organiser les sessions de jeu de rôle Cardenveil.

## Fonctionnalités

- 📝 **Création de sessions** via formulaire (modal)
- 📅 **Événements Discord** automatiques
- 🎯 **Système d'inscription** avec boutons
- 📋 **Liste d'attente** automatique
- ⏰ **Rappels** (24h et 1h avant)
- 📊 **Calendrier** des sessions
- 🛠️ **Outils MJ** (promotion, retrait, rappels personnalisés)

## Installation

### 1. Cloner et installer les dépendances

```bash
cd cardenveil_discord
npm install
```

### 2. Configuration Discord

Créez une application Discord sur https://discord.com/developers/applications

1. Créez une nouvelle application
2. Allez dans "Bot" et créez un bot
3. Copiez le **Token** du bot
4. Allez dans "OAuth2" → "URL Generator"
5. Sélectionnez les scopes: `bot`, `applications.commands`
6. Sélectionnez les permissions bot:
   - Send Messages
   - Embed Links
   - Read Message History
   - Manage Events
   - Create Public/Private Threads
7. Utilisez l'URL générée pour inviter le bot

### 3. Configuration environnement

Copiez `.env.example` vers `.env` et remplissez:

```bash
cp .env.example .env
```

Éditez `.env`:

```env
DISCORD_TOKEN=votre_token_bot
CLIENT_ID=votre_application_id
GUILD_ID=votre_serveur_id
ANNOUNCEMENT_CHANNEL_ID=id_du_canal_rp_orga
MJ_ROLE_NAME=MJ
LANGUAGE=fr
```

**Comment trouver les IDs:**
- **CLIENT_ID**: Onglet "General Information" de votre application Discord
- **GUILD_ID**: Clic droit sur votre serveur → "Copier l'ID" (activez le mode développeur dans Discord)
- **ANNOUNCEMENT_CHANNEL_ID**: Clic droit sur le canal #rp-orga → "Copier l'ID"

### 4. Déployer les commandes

```bash
npm run deploy-commands
```

### 5. Lancer le bot

```bash
# Production
npm start

# Développement (auto-reload)
npm run dev
```

## Commandes

### `/session create`
Ouvre un formulaire pour créer une nouvelle session.

**Permissions**: Rôle MJ requis

### `/session list`
Affiche toutes les sessions à venir.

### `/session info <id>`
Affiche les détails d'une session spécifique.

### `/session status <id> <status>`
Change le statut d'une session.

**Statuts disponibles**:
- `recrutement` - Ouvert aux inscriptions
- `en_preparation` - En cours de préparation
- `pret` - Prêt à être joué
- `fini` - Terminé
- `cancelled` - Annulé

**Permissions**: Rôle MJ requis

### `/session cancel <id>`
Annule une session.

**Permissions**: Rôle MJ requis

### `/register join <id>`
S'inscrit à une session.

### `/register leave <id>`
Se désinscrit d'une session.

### `/register my-sessions`
Liste vos inscriptions.

### `/mj promote <session> <joueur>`
Promouvoir un joueur de la liste d'attente.

**Permissions**: Rôle MJ requis

### `/mj kick <session> <joueur>`
Retirer un joueur d'une session.

**Permissions**: Rôle MJ requis

### `/mj remind <session> <hours>`
Programmer un rappel personnalisé.

**Permissions**: Rôle MJ requis

## Déploiement sur Railway

### 1. Installer Railway CLI

```bash
npm install -g @railway/cli
```

### 2. Se connecter

```bash
railway login
```

### 3. Créer un projet

```bash
railway init
```

### 4. Configurer les variables d'environnement

```bash
railway variables set DISCORD_TOKEN=votre_token
railway variables set CLIENT_ID=votre_client_id
railway variables set GUILD_ID=votre_guild_id
railway variables set ANNOUNCEMENT_CHANNEL_ID=votre_channel_id
railway variables set MJ_ROLE_NAME=MJ
railway variables set LANGUAGE=fr
```

### 5. Déployer

```bash
railway up
```

### 6. Voir les logs

```bash
railway logs
```

## Structure du projet

```
cardenveil_discord/
├── src/
│   ├── index.js              # Point d'entrée
│   ├── config.js             # Configuration
│   ├── database.js           # Base de données SQLite
│   ├── deploy-commands.js    # Déploiement des commandes
│   ├── commands/
│   │   ├── session.js        # Commandes /session
│   │   ├── register.js       # Commandes /register
│   │   └── mj.js             # Commandes /mj
│   ├── components/
│   │   ├── modals/
│   │   │   └── sessionCreate.js
│   │   └── buttons/
│   │       └── registration.js
│   ├── events/
│   │   ├── ready.js
│   │   └── interactionCreate.js
│   ├── services/
│   │   ├── discordEvent.js   # API événements Discord
│   │   ├── announcement.js   # Formatage annonces
│   │   └── reminder.js       # Planification rappels
│   └── utils/
│       ├── embeds.js         # Constructeurs d'embeds
│       ├── i18n.js           # Traductions FR/EN
│       └── validators.js     # Validation données
├── data/                     # Base de données (gitignored)
├── .env                      # Variables d'environnement (gitignored)
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Base de données

SQLite avec 3 tables:

- **sessions**: Informations des sessions
- **registrations**: Inscriptions des joueurs
- **reminders**: Rappels planifiés

La base est créée automatiquement au premier lancement dans `data/cardenveil.db`.

## Support

Pour toute question ou problème, contactez @Patrakolos sur Discord.

## Licence

MIT
