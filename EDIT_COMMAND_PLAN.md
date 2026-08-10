# /session edit Command - Implementation Plan

## Overview

Allow MJs to edit existing sessions with a streamlined modal interface that pre-fills current values and updates all related systems (database, Discord event, announcement, reminders).

## User Flow

```
1. MJ types: /session edit 42
   ↓
2. Bot checks MJ role permission
   ↓
3. Bot fetches session #42 from database
   ↓
4. Bot shows modal with 5 key fields (pre-filled with current values)
   ↓
5. MJ edits desired fields and submits
   ↓
6. Bot updates:
   - Database
   - Discord Event (if date changed)
   - Announcement message
   - Reminders (if date changed)
   ↓
7. Bot replies with success + updated embed
```

## Design Decisions

### Why 5 Fields Only?

Discord modals are limited to 5 components. We prioritize the most commonly edited fields:

1. **Date** - Most frequent change (rescheduling)
2. **Max Players** - Adjust capacity
3. **Status** - Update session state
4. **Description** - Update narrative
5. **Comments** - Add notes

### Why Not Edit All Fields?

- Discord modal limit (5 components max)
- Most fields rarely change after creation
- Keeps the edit flow simple and fast
- If MJ needs to change other fields, they can cancel and recreate

### Alternative: Multi-Modal Edit

Could split into multiple modals:
- Modal 1: Date + Time + Status
- Modal 2: Players + Description
- Modal 3: Comments + Warnings

**Decision:** Start with single modal (5 fields). Can add multi-modal later if needed.

## Implementation Details

### 1. Slash Command (`src/commands/session.js`)

```javascript
.addSubcommand(sub =>
  sub.setName('edit')
    .setDescription('Modifier une session (MJ uniquement)')
    .addIntegerOption(opt =>
      opt.setName('id')
        .setDescription('ID de la session')
        .setRequired(true)
    )
)
```

**Handler:**
```javascript
async function handleEdit(interaction) {
  // Check MJ role
  const mjRole = interaction.guild.roles.cache.find(r => r.name === config.mjRoleName);
  if (!mjRole || !interaction.member.roles.cache.has(mjRole.id)) {
    return interaction.reply({ content: t('mj_only'), ephemeral: true });
  }

  const sessionId = interaction.options.getInteger('id');
  const session = db.getSessionById(sessionId);

  if (!session) {
    return interaction.reply({ content: t('session_not_found'), ephemeral: true });
  }

  // Build and show edit modal
  const modal = buildSessionEditModal(session);
  await interaction.showModal(modal);
}
```

### 2. Edit Modal (`src/components/modals/sessionEdit.js`)

**New file:** Create modal with pre-filled fields

```javascript
function buildSessionEditModal(session) {
  const modal = new ModalBuilder()
    .setCustomId(`session_edit_modal:${session.id}`)
    .setTitle(`✏️ Modifier Session #${session.id}`);

  // Field 1: Date
  const dateInput = new TextInputBuilder()
    .setCustomId('date')
    .setLabel('Date (laisser vide pour "à définir")')
    .setPlaceholder('2024-06-13 14:00 ou Samedi 13 Juin 2024 14:00')
    .setStyle(TextInputStyle.Short)
    .setValue(session.date_text || '')
    .setRequired(false);

  // Field 2: Max Players
  const maxPlayersInput = new TextInputBuilder()
    .setCustomId('max_players')
    .setLabel('Nombre max de joueurs')
    .setPlaceholder('3')
    .setStyle(TextInputStyle.Short)
    .setValue(String(session.max_players || ''))
    .setRequired(true);

  // Field 3: Status
  const statusInput = new TextInputBuilder()
    .setCustomId('status')
    .setLabel('Statut')
    .setPlaceholder('recrutement / en_preparation / pret / fini / cancelled')
    .setStyle(TextInputStyle.Short)
    .setValue(session.status || 'recrutement')
    .setRequired(true);

  // Field 4: Description
  const descriptionInput = new TextInputBuilder()
    .setCustomId('description')
    .setLabel('Description')
    .setPlaceholder('Description narrative...')
    .setStyle(TextInputStyle.Paragraph)
    .setValue(session.description || '')
    .setRequired(false);

  // Field 5: Comments
  const commentsInput = new TextInputBuilder()
    .setCustomId('comments')
    .setLabel('Commentaires')
    .setPlaceholder('Notes additionnelles...')
    .setStyle(TextInputStyle.Paragraph)
    .setValue(session.comments || '')
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(dateInput),
    new ActionRowBuilder().addComponents(maxPlayersInput),
    new ActionRowBuilder().addComponents(statusInput),
    new ActionRowBuilder().addComponents(descriptionInput),
    new ActionRowBuilder().addComponents(commentsInput),
  );

  return modal;
}
```

### 3. Modal Handler (`src/events/interactionCreate.js`)

**Add handler for edit modal:**

```javascript
if (interaction.customId.startsWith('session_edit_modal:')) {
  await handleSessionEditModal(interaction);
}

async function handleSessionEditModal(interaction) {
  await interaction.deferReply({ ephemeral: true });

  // Extract session ID from customId
  const sessionId = parseInt(interaction.customId.split(':')[1], 10);
  const session = db.getSessionById(sessionId);

  if (!session) {
    return interaction.editReply({ content: t('session_not_found') });
  }

  // Extract new values
  const dateInput = interaction.fields.getTextInputValue('date');
  const newDateTimestamp = parseDateToTimestamp(dateInput);
  const newMaxPlayers = parseMaxPlayers(interaction.fields.getTextInputValue('max_players'));
  const newStatus = normalizeStatus(interaction.fields.getTextInputValue('status'));
  const newDescription = interaction.fields.getTextInputValue('description') || null;
  const newComments = interaction.fields.getTextInputValue('comments') || null;

  if (!newMaxPlayers) {
    return interaction.editReply({ content: t('error_invalid_players') });
  }

  // Check if date changed
  const dateChanged = newDateTimestamp !== session.date_timestamp;

  // Update database
  const updates = {
    date_timestamp: newDateTimestamp,
    date_text: dateInput,
    max_players: newMaxPlayers,
    status: newStatus,
    description: newDescription,
    comments: newComments,
  };

  db.updateSession(sessionId, updates);

  // Update Discord Event if date changed
  if (dateChanged && session.discord_event_id) {
    const updated = db.getSessionById(sessionId);
    await updateDiscordEvent(interaction.guild, session.discord_event_id, updated);
  }

  // Reschedule reminders if date changed
  if (dateChanged && newDateTimestamp) {
    scheduleReminders(sessionId, newDateTimestamp);
  }

  // Update announcement message
  const updated = db.getSessionById(sessionId);
  if (updated.announcement_message_id && updated.announcement_channel_id) {
    try {
      const channel = await interaction.client.channels.fetch(updated.announcement_channel_id);
      const message = await channel.messages.fetch(updated.announcement_message_id);
      await editAnnouncement(message, updated);
    } catch (err) {
      console.error('Failed to update announcement:', err);
    }
  }

  // Reply with success
  const { buildSessionEmbed } = require('../utils/embeds');
  const embed = buildSessionEmbed(updated);

  await interaction.editReply({
    content: `✅ Session #${sessionId} modifiée avec succès !`,
    embeds: [embed],
    ephemeral: true,
  });
}
```

### 4. Internationalization (`src/utils/i18n.js`)

**Add translations:**

```javascript
// French
session_edit_title: '✏️ Modifier la Session',
session_edited: '✅ Session modifiée avec succès !',

// English
session_edit_title: '✏️ Edit Session',
session_edited: '✅ Session edited successfully!',
```

## Edge Cases to Handle

### 1. Date Changed to "À définir"
- Set `date_timestamp = null`
- Keep `date_text = "à définir"`
- Delete Discord Event if it exists
- Delete all reminders

### 2. Date Changed from "À définir" to Valid Date
- Parse new date
- Create Discord Event
- Schedule reminders

### 3. Max Players Reduced Below Current Registrations
- Don't block the edit
- Show warning in response
- Existing confirmed players stay confirmed
- New registrations go to waitlist

### 4. Status Changed to "cancelled" or "fini"
- Disable registration buttons
- Update announcement embed
- Optionally notify registered players (future enhancement)

### 5. Session Not Found
- Reply with error message
- Don't show modal

### 6. Non-MJ User Tries to Edit
- Check MJ role before showing modal
- Reply with permission error

## Testing Checklist

- [ ] `/session edit <id>` shows modal with pre-filled values
- [ ] Edit date to valid timestamp → Discord Event updates
- [ ] Edit date to "à définir" → Discord Event deleted
- [ ] Edit max players → Announcement updates
- [ ] Edit status → Buttons disabled if cancelled/fini
- [ ] Edit description → Announcement updates
- [ ] Non-MJ user cannot edit
- [ ] Invalid session ID shows error
- [ ] Invalid max players shows error
- [ ] Reminders rescheduled when date changes
- [ ] Announcement message updates in real-time

## Future Enhancements

### Phase 2: Multi-Modal Edit
Add option to edit all fields across multiple modals:
- Modal 1: Date + Time + Status + Max Players
- Modal 2: Description + Comments + Warnings
- Modal 3: Tags + Game Type + Platform

### Phase 3: Field Selection
Add select menu to choose which fields to edit:
```
/session edit <id>
→ Shows select menu with all fields
→ User selects fields to edit
→ Modal opens with only selected fields
```

### Phase 4: Audit Log
Track all edits:
- Who edited what
- When it was edited
- Previous values
- Add `/session history <id>` command

## Files to Create/Modify

### New Files
1. `src/components/modals/sessionEdit.js` - Edit modal builder

### Modified Files
1. `src/commands/session.js` - Add edit subcommand
2. `src/events/interactionCreate.js` - Add edit modal handler
3. `src/utils/i18n.js` - Add translations

## Implementation Order

1. Create `sessionEdit.js` modal
2. Add edit subcommand to `session.js`
3. Add modal handler to `interactionCreate.js`
4. Add i18n translations
5. Test with valid session
6. Test edge cases
7. Deploy and verify

## Summary

The `/session edit` command provides a streamlined way to modify sessions with:
- Pre-filled modal for quick edits
- Automatic updates to all related systems
- Proper permission checks
- Graceful handling of edge cases

This keeps the bot user-friendly while maintaining data consistency across Discord Events, announcements, and reminders.
