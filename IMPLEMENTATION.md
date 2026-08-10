# Cardenveil Discord Bot - Implementation Summary

## ✅ Completed Features

### 1. Project Structure
- ✅ Node.js 20+ with discord.js v14
- ✅ SQLite database (better-sqlite3)
- ✅ Environment configuration (.env)
- ✅ Modular architecture

### 2. Database Schema
- ✅ **sessions** table - Stores all session data
- ✅ **registrations** table - Player registrations with waitlist
- ✅ **reminders** table - Scheduled reminders
- ✅ Foreign keys and indexes for performance

### 3. Slash Commands
- ✅ `/session create` - Modal form for session creation (MJ only)
- ✅ `/session list` - Calendar of upcoming sessions
- ✅ `/session info <id>` - Session details
- ✅ `/session status <id> <status>` - Update status (MJ only)
- ✅ `/session cancel <id>` - Cancel session (MJ only)
- ✅ `/register join <id>` - Register for session
- ✅ `/register leave <id>` - Unregister from session
- ✅ `/register my-sessions` - List your registrations
- ✅ `/mj promote <session> <user>` - Promote from waitlist (MJ only)
- ✅ `/mj kick <session> <user>` - Remove player (MJ only)
- ✅ `/mj remind <session> <hours>` - Custom reminder (MJ only)

### 4. Discord Integration
- ✅ Automatic Discord Event creation (when date is valid)
- ✅ Announcement messages in #rp-orga channel
- ✅ Registration buttons (S'inscrire / Se désinscrire)
- ✅ Real-time embed updates when players register/leave

### 5. Registration System
- ✅ Button-based registration
- ✅ Automatic capacity checking
- ✅ Waitlist management (FIFO)
- ✅ Auto-promotion when confirmed players leave
- ✅ DM notifications for promotions

### 6. Reminder System
- ✅ 24-hour reminder (DM + channel ping)
- ✅ 1-hour reminder (DM + channel ping)
- ✅ Custom reminders via /mj remind
- ✅ Cron scheduler (checks every 5 minutes)

### 7. Internationalization
- ✅ French (default)
- ✅ English support
- ✅ Configurable via LANGUAGE env var

### 8. MJ Tools
- ✅ Role-based permissions (MJ role)
- ✅ Session management (status, cancel)
- ✅ Player management (promote, kick)
- ✅ Custom reminders

## 📁 File Structure

```
cardenveil_discord/
├── src/
│   ├── index.js                      # Bot entry point
│   ├── config.js                     # Environment config
│   ├── database.js                   # SQLite queries
│   ├── deploy-commands.js            # Command deployment
│   ├── commands/
│   │   ├── session.js                # /session commands
│   │   ├── register.js               # /register commands
│   │   └── mj.js                     # /mj commands
│   ├── components/
│   │   ├── modals/
│   │   │   └── sessionCreate.js      # Session creation modal
│   │   └── buttons/
│   │       └── registration.js       # Button handlers
│   ├── events/
│   │   ├── ready.js                  # Bot ready event
│   │   └── interactionCreate.js      # Interaction router
│   ├── services/
│   │   ├── discordEvent.js           # Discord Events API
│   │   ├── announcement.js           # Message formatting
│   │   └── reminder.js               # Reminder scheduler
│   └── utils/
│       ├── embeds.js                 # Embed builders
│       ├── i18n.js                   # Translations
│       └── validators.js             # Data validation
├── data/                             # SQLite database (gitignored)
├── .env                              # Local config (gitignored)
├── .env.example                      # Config template
├── .gitignore
├── package.json
├── README.md                         # Full documentation
└── QUICKSTART.md                     # Quick setup guide
```

## 🚀 Next Steps

### 1. Test Locally

```bash
# Fill in your .env file with real Discord credentials
nano .env

# Deploy commands to your test server
npm run deploy-commands

# Start the bot
npm start
```

### 2. Test the Flow

1. **Create a session**: `/session create`
2. **Fill the modal** with test data
3. **Verify**:
   - ✅ Discord Event created (if date is valid)
   - ✅ Announcement posted in #rp-orga
   - ✅ Embed shows all fields correctly
4. **Test registration**:
   - Click "📝 S'inscrire" button
   - Verify player count updates
   - Test waitlist (fill session, then register more)
5. **Test MJ tools**:
   - `/session status <id> pret`
   - `/mj promote <session> <user>`
   - `/mj kick <session> <user>`

### 3. Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Set environment variables
railway variables set DISCORD_TOKEN=your_token
railway variables set CLIENT_ID=your_client_id
railway variables set GUILD_ID=your_guild_id
railway variables set ANNOUNCEMENT_CHANNEL_ID=your_channel_id
railway variables set MJ_ROLE_NAME=MJ
railway variables set LANGUAGE=fr

# Deploy
railway up

# Monitor logs
railway logs
```

## 🔧 Configuration Required

Before running, you need:

1. **Discord Bot Token** - From Discord Developer Portal
2. **Client ID** - From Discord Developer Portal
3. **Guild ID** - Your Discord server ID
4. **Announcement Channel ID** - ID of #rp-orga channel
5. **MJ Role** - Ensure "MJ" role exists in your server

## 📊 Database

SQLite database is automatically created at `data/cardenveil.db` on first run.

**Tables:**
- `sessions` - All session data
- `registrations` - Player registrations (confirmed + waitlist)
- `reminders` - Scheduled reminders

## 🎯 Key Features Implemented

### Session Creation Flow
1. MJ uses `/session create`
2. Modal opens with all fields
3. MJ fills form and submits
4. Bot creates:
   - Database entry
   - Discord Event (if valid date)
   - Announcement message with buttons
   - Scheduled reminders

### Registration Flow
1. Player clicks "📝 S'inscrire"
2. Bot checks capacity
3. If space available → confirmed
4. If full → waitlist
5. Embed updates in real-time

### Waitlist Management
- FIFO (First In, First Out)
- Auto-promotion when confirmed player leaves
- DM notification when promoted
- Position tracking

### Reminder System
- Automatic 24h and 1h reminders
- DM to all confirmed players
- Channel ping with mentions
- Custom reminders via /mj remind

## 🐛 Known Limitations

1. **Date parsing**: Currently accepts free-text dates. Discord Events require valid ISO dates.
   - Example: "Samedi 13 Juin" won't create an event
   - Use: "2024-06-13T14:00:00" for event creation

2. **Time zones**: All dates are treated as server time. Consider adding timezone support.

3. **Edit sessions**: Currently no `/session edit` command. MJ must cancel and recreate.

4. **Multiple servers**: Bot designed for single server. Multi-server support requires schema changes.

## 🔮 Future Enhancements (Optional)

- [ ] `/session edit` command
- [ ] Date parser for French dates
- [ ] Session templates (save common configs)
- [ ] Statistics dashboard
- [ ] Session history/archive
- [ ] Player ratings/feedback
- [ ] Integration with Owlbear/other VTTs
- [ ] Web dashboard for session management

## 📝 Notes

- All messages are in French by default (change `LANGUAGE=en` for English)
- Bot requires "MJ" role to create/manage sessions
- Discord Events are only created when date is a valid future date
- Database uses WAL mode for better concurrent access
- Reminders checked every 5 minutes via cron

## ✅ Verification Checklist

Before deployment, verify:

- [ ] Bot token works
- [ ] Bot appears online in Discord
- [ ] Slash commands are registered
- [ ] `/session create` opens modal
- [ ] Modal submission creates session
- [ ] Announcement appears in #rp-orga
- [ ] Discord Event created (with valid date)
- [ ] Registration buttons work
- [ ] Waitlist functions correctly
- [ ] Reminders are scheduled
- [ ] MJ role permissions work
- [ ] All commands respond correctly

## 🎉 You're Ready!

The bot is fully implemented and ready for testing. Follow the QUICKSTART.md guide to get it running.

For questions or issues, refer to README.md or contact @Patrakolos.
