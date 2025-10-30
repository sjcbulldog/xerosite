# Team Calendar Feed (WebCal)

## Overview

The Xerosite server provides ICS calendar feeds for each team, allowing users to subscribe to team calendars in their preferred calendar application.

## Endpoint

```
GET /calendar/{teamId}
```

Returns an ICS (iCalendar) format file containing all events for the specified team.

## Usage

### Subscribing to a Calendar

To subscribe to a team's calendar in your calendar application:

1. Get the team ID from the URL when viewing the team
2. Construct the subscription URL by replacing `http://` or `https://` with `webcal://`:
   ```
   webcal://yourdomain.com/calendar/{teamId}
   ```

### Example URLs

**Development:**
```
webcal://localhost:3000/calendar/abc123-team-id
```

**Production:**
```
webcal://xerosite.com/calendar/abc123-team-id
```

### Supported Calendar Applications

- **Google Calendar**: Use "Add calendar" → "From URL"
- **Apple Calendar**: File → New Calendar Subscription
- **Outlook**: Calendar → Add Calendar → Subscribe from web
- **Thunderbird**: Calendar → New Calendar → On the Network

## Features

### Timezone Support

- All events are displayed in the team's configured timezone
- Times are represented as "floating time" in the ICS feed, meaning they display at the same wall-clock time regardless of the viewer's timezone
- This ensures consistency for team members in the same timezone

### Recurrence Support

The feed includes proper recurrence rules (RRULE) for recurring events:
- **Daily recurrence**: With optional interval (every N days)
- **Weekly recurrence**: With specific days of the week
- **Monthly recurrence**: With specific days of the month
- **End dates**: Recurrence end dates are included when specified

### Exclusions

When a single occurrence of a recurring event is deleted:
- The exclusion is included in the feed using EXDATE
- Calendar applications will automatically hide that occurrence
- Other occurrences remain visible

### Event Details

Each event includes:
- **Summary**: Event name
- **Description**: Full event description (if provided)
- **Location**: Event location (if provided)
- **Start/End times**: In the team's timezone
- **Recurrence rules**: For recurring events
- **Exclusions**: For deleted occurrences

## Technical Details

### ICS Format

The calendar feed follows the iCalendar (RFC 5545) standard:
- Version: 2.0
- Format: text/calendar
- Character encoding: UTF-8

### Caching and Updates

Calendar applications typically refresh subscribed calendars:
- **Apple Calendar**: Every 5-15 minutes (configurable)
- **Google Calendar**: Every 8-24 hours
- **Outlook**: Every 3 hours (configurable)

To force an immediate refresh, use the "Refresh" or "Sync" option in your calendar application.

### Security Considerations

**Important:** The calendar feed endpoint is currently **not authenticated**. Any user with the team ID can access the calendar feed.

For production use, consider:
1. Adding authentication tokens to the URL
2. Implementing rate limiting
3. Using HTTPS (wss://) for encrypted transmission
4. Generating unique, unguessable feed URLs per user

## Implementation Details

### Files

- `calendar.controller.ts`: HTTP endpoint handler
- `calendar.service.ts`: ICS generation logic
- `timezone.utils.ts`: Timezone conversion utilities

### Key Functions

**generateTeamCalendarFeed(teamId)**
- Fetches all events for a team
- Loads exclusions for recurring events
- Generates properly formatted ICS content

**generateEventLines(event, exclusions, timezone)**
- Converts a single event to ICS format
- Handles recurrence rules
- Includes exclusion dates

**formatDateTimeInTimezone(date, timezone)**
- Converts UTC dates to team timezone
- Formats as floating time (no Z or timezone indicator)

## Future Enhancements

Potential improvements:
- [ ] Per-user authentication tokens
- [ ] Filtered feeds (by event type, user group, etc.)
- [ ] RSVP/attendance updates via calendar
- [ ] Reminders and alarms
- [ ] Attachments support
- [ ] Event categories/colors
