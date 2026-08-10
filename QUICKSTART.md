# Quick Start Guide

## Étape 1: Configuration Discord

1. **Créer une application Discord**
   - Allez sur https://discord.com/developers/applications
   - Cliquez sur "New Application"
   - Nommez-la "Cardenveil Bot"

2. **Créer le bot**
   - Onglet "Bot" → "Add Bot"
   - Copiez le **Token** (gardez-le secret!)

3. **Récupérer les IDs**
   - Activez le mode développeur: Paramètres Discord → Avancé → Mode développeur
   - **CLIENT_ID**: Onglet "General Information" de votre application
   - **GUILD_ID**: Clic droit sur votre serveur → "Copier l'ID"
   - **ANNOUNCEMENT_CHANNEL_ID**: Clic droit sur #rp-orga → "Copier l'ID"

4. **Inviter le bot**
   - Onglet "OAuth2" → "URL Generator"
   - Scopes: ✅ `bot`, ✅ `applications.commands`
   - Permissions bot:
     - ✅ Send Messages
     - ✅ Embed Links
     - ✅ Read Message History
     - ✅ Manage Events
     - ✅ Create Public/Private Threads
   - Copiez l'URL et ouvrez-la dans votre navigateur

## Étape 2: Configuration locale

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer .env avec vos valeurs
nano .env  # ou votre éditeur préféré
```

Remplissez:
```env
DISCORD_TOKEN=votre_token_ici
CLIENT_ID=votre_client_id
GUILD_ID=votre_guild_id
ANNOUNCEMENT_CHANNEL_ID=votre_channel_id
MJ_ROLE_NAME=MJ
LANGUAGE=fr
```

## Étape 3: Installation

```bash
# Installer les dépendances
npm install

# Déployer les commandes Discord
npm run deploy-commands

# Lancer le bot
npm start
```

## Étape 4: Tester

Dans votre serveur Discord:

1. Tapez `/session create`
2. Remplissez le formulaire
3. Vérifiez que l'annonce apparaît dans #rp-orga
4. Testez l'inscription avec les boutons

## Étape 5: Déploiement Railway

```bash
# Installer Railway CLI
npm install -g @railway/cli

# Se connecter
railway login

# Initialiser le projet
railway init

# Configurer les variables
railway variables set DISCORD_TOKEN=votre_token
railway variables set CLIENT_ID=votre_client_id
railway variables set GUILD_ID=votre_guild_id
railway variables set ANNOUNCEMENT_CHANNEL_ID=votre_channel_id
railway variables set MJ_ROLE_NAME=MJ
railway variables set LANGUAGE=fr

# Déployer
railway up

# Voir les logs
railway logs
```

## Commandes principales

- `/session create` - Créer une session (MJ uniquement)
- `/session list` - Voir toutes les sessions
- `/register join <id>` - S'inscrire à une session
- `/session status <id> pret` - Marquer comme prêt (MJ)

## Problèmes courants

**Bot ne répond pas aux commandes:**
- Vérifiez que vous avez exécuté `npm run deploy-commands`
- Attendez quelques minutes (les commandes globales prennent ~1h)

**Erreur "Missing Permissions":**
- Vérifiez que le bot a les permissions nécessaires dans le serveur
- Vérifiez que le rôle MJ existe et que vous l'avez

**Événement Discord non créé:**
- Vérifiez que la date est valide (format: "Samedi 13 Juin 2024" ou ISO)
- Vérifiez que le bot a la permission "Manage Events"

## Support

Pour toute aide, contactez @Patrakolos sur Discord.
