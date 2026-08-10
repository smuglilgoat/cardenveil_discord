# Discord Native Timestamps Implementation

## Overview

The bot now uses Discord's native timestamp system which automatically displays times in each user's local timezone. This eliminates timezone confusion for international players.

## Discord Timestamp Format

Discord timestamps use the format: `<t:UNIX_TIMESTAMP:STYLE>`

### Available Styles

| Style | Format | Example |
|-------|--------|---------|
| `t` | Short Time | 9:30 PM |
| `T` | Long Time | 9:30:00 PM |
| `d` | Short Date | 11/20/2020 |
| `D` | Long Date | November 20, 2020 |
| `f` | Short Date/Time (default) | November 20, 2020 9:30 PM |
| `F` | Long Date/Time | Friday, November 20, 2020 9:30 PM |
| `R` | Relative | in 2 days / 2 months ago |

### Example in Bot

When a session is created with date "2024-06-13 14:00", the announcement shows:

```
📅 Date: Friday, June 13, 2024 2:00 PM (in 3 days)
```

Each user sees this in their own timezone automatically!

## Changes Made

### 1. Database Schema (`src/database.js`)

**Before:**
```sql
date TEXT  -- Stored as text like "Samedi 13 Juin"
```

**After:**
```sql
date_timestamp INTEGER  -- Unix timestamp in seconds
date_text TEXT          -- Original text for "à définir" sessions
```

- `date_timestamp`: Stores the parsed Unix timestamp (seconds since epoch)
- `date_text`: Stores the original input text for sessions without a fixed date

### 2. Date Parsing (`src/utils/validators.js`)

New function `parseDateToTimestamp()` supports multiple formats:

- **ISO**: `2024-06-13 14:00` or `2024-06-13T14:00:00`
- **French**: `Samedi 13 Juin 2024 14:00` or `13 Juin 2024 14:00`
- **European**: `13/06/2024 14:00`
- **US**: `06/13/2024 14:00`

Returns `null` for "à définir" or invalid dates.

New function `formatDiscordTimestamp(timestamp, style)` converts Unix timestamps to Discord format.

### 3. Embed Display (`src/utils/embeds.js`)

Dates now display with both absolute and relative time:

```javascript
// For sessions with a date
📅 Date: Friday, June 13, 2024 2:00 PM (in 3 days)

// For sessions without a date
📅 Date: À définir
```

Uses two timestamp styles:
- `F` (Long Date/Time) for the absolute time
- `R` (Relative) for "in X days" display

### 4. Modal Input (`src/components/modals/sessionCreate.js`)

Updated placeholder to show expected format:
```
2024-06-13 14:00 ou Samedi 13 Juin 2024 14:00
```

Users can still type naturally - the parser handles multiple formats.

### 5. Reminders (`src/services/reminder.js`)

Now works with Unix timestamps:
- Calculates reminder times by subtracting seconds from the session timestamp
- Compares against current Unix time for scheduling

### 6. Discord Events (`src/services/discordEvent.js`)

Converts Unix timestamps to Date objects for Discord Events API:
```javascript
const startDate = new Date(session.date_timestamp * 1000);
```

## Benefits

1. **Automatic Timezone Conversion**: Each user sees the time in their local timezone
2. **Relative Time Display**: Shows "in 3 days" which is more intuitive
3. **No Timezone Confusion**: International players always see correct local time
4. **Flexible Input**: Users can type dates in multiple formats
5. **Graceful Fallback**: Sessions without dates show "À définir"

## Testing

To test the timestamp display:

1. Create a session with `/session create`
2. Enter a date like `2024-06-13 14:00` or `Samedi 13 Juin 2024 14:00`
3. Check the announcement in #rp-orga
4. The date should show as: `Friday, June 13, 2024 2:00 PM (in 3 days)`
5. Each user will see this in their own timezone!

## Migration Note

If you had an existing database, you'll need to delete it:
```bash
rm data/cardenveil.db
```

The new schema will be created automatically on next startup.

## Technical Details

### Unix Timestamps

Unix timestamps are the number of seconds since January 1, 1970 (UTC).

Example: `1718280000` = June 13, 2024 2:00 PM UTC

Discord's `<t:TIMESTAMP>` format automatically converts this to each user's timezone.

### Database Changes

```sql
-- Old schema
date TEXT

-- New schema
date_timestamp INTEGER  -- Unix timestamp (seconds)
date_text TEXT          -- Original text input
```

### Index Added

```sql
CREATE INDEX idx_sessions_timestamp ON sessions(date_timestamp);
```

Optimizes sorting sessions by date.

## Future Enhancements

Potential improvements:
- Add timezone selection for MJ when creating sessions
- Show multiple timezone previews in the modal
- Add `/session reschedule` command to change dates
- Support for recurring sessions
