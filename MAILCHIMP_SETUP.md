# Mailchimp Email Campaign Integration

This document describes how the Mailchimp integration works and how to set it up.

## Overview

The system automatically triggers email campaigns via Mailchimp when:
- A new **SEC Filing** is published
- A new **Press Release** is published

Emails are sent only to subscribers who have opted in for the specific content type (stored in the `email-alert` content type).

## Features

✅ Automatic email campaigns when SEC Filings are published
✅ Automatic email campaigns when Press Releases are published
✅ Automatic subscriber sync to Mailchimp
✅ Subscriber preference management (SEC Filings vs Press Releases)
✅ Professional HTML email templates
✅ Draft/Publish workflow support (only sends on publish)

## Setup Instructions

### 1. Get Mailchimp API Credentials

1. Log in to your [Mailchimp account](https://mailchimp.com/)
2. Navigate to **Account > Extras > API keys**
3. Create a new API key or use an existing one
4. Note your **API Key** and **Server Prefix** (e.g., `us1`, `us2`, etc.)
   - The server prefix is in your Mailchimp URL: `https://us1.admin.mailchimp.com/`

### 2. Create a Mailchimp Audience (List)

1. In Mailchimp, go to **Audience > All contacts**
2. Create a new audience or use an existing one
3. Note the **List ID** (found in Audience > Settings > Audience name and defaults)

### 3. Configure Mailchimp List Fields

To properly segment subscribers, you need to set up custom fields or tags:

#### Option A: Using Tags (Recommended - Simpler)
The integration uses these tags automatically:
- `SEC_FILINGS` - for subscribers interested in SEC filings
- `PRESS_RELEASES` - for subscribers interested in press releases

No additional setup required! Tags are created automatically when subscribers are synced.

#### Option B: Using Interest Groups (More Control)
1. Go to **Audience > Manage Audience > Signup forms**
2. Create an interest group called "Content Preferences"
3. Add two interests: "SEC Filings" and "Press Releases"
4. Update the `getSegmentOptions` method in [src/services/mailchimp.ts](src/services/mailchimp.ts) with the correct interest IDs

### 4. Configure Environment Variables

Update your `.env` file with your Mailchimp credentials:

```bash
# Mailchimp Configuration
MAILCHIMP_API_KEY=your_actual_api_key_here
MAILCHIMP_SERVER_PREFIX=us1  # Change to your server prefix
MAILCHIMP_LIST_ID=your_actual_list_id_here
MAILCHIMP_FROM_NAME=DigiPowerX  # Sender name
MAILCHIMP_REPLY_TO=noreply@digipowerx.com  # Reply-to email
FRONTEND_URL=https://digipowerx.com  # Your website URL
```

### 5. Restart Your Strapi Application

```bash
npm run develop
# or
npm run build && npm run start
```

## How It Works

### Lifecycle Hooks

The integration uses Strapi lifecycle hooks in [src/index.ts](src/index.ts):

1. **SEC Filing Hook** - Triggers on `afterCreate` and `afterUpdate`
2. **Press Release Hook** - Triggers on `afterCreate` and `afterUpdate`
3. **Email Alert Hook** - Syncs subscribers to Mailchimp

### Email Sending Flow

```
User publishes SEC Filing/Press Release
         ↓
Lifecycle hook triggered
         ↓
Fetch subscribers from email-alert content type
         ↓
Filter by content preference (secFilings or pressReleases)
         ↓
Create Mailchimp campaign with HTML email
         ↓
Send campaign to filtered subscribers
         ↓
Campaign sent ✅
```

### Subscriber Management

When users subscribe via the `email-alert` content type:
1. Their email and preferences are stored in Strapi
2. They are automatically synced to your Mailchimp list
3. Tags are added based on their preferences (SEC_FILINGS, PRESS_RELEASES)
4. Updates to their preferences automatically sync to Mailchimp

## Email Templates

The integration includes professional HTML email templates:

### SEC Filing Email
- Subject: `New SEC Filing: [Form Type] - [Description]`
- Contains: Form type, date, description, link to view filing

### Press Release Email
- Subject: `New Press Release: [Title]`
- Contains: Title, date, content preview, link to full release

### Customizing Templates

To customize email templates, edit the `generateEmailContent` method in [src/services/mailchimp.ts](src/services/mailchimp.ts:152).

## Testing

### Test the Integration

1. **Create a test subscriber:**
   - Go to Content Manager > Email Alert
   - Create a new entry with your test email
   - Check "SEC Filings" or "Press Releases" preference

2. **Publish a SEC Filing or Press Release:**
   - Go to Content Manager > SEC Filing (or Press Release)
   - Create a new entry
   - Click **Publish**

3. **Check Mailchimp:**
   - Log in to Mailchimp
   - Go to Campaigns
   - You should see a new campaign created
   - Check if it was sent successfully

4. **Check console logs:**
   ```
   ✅ Mailchimp service configured successfully
   📄 New SEC Filing created: [documentId]
   ✅ Campaign sent successfully for sec-filing: [campaignId]
   ```

## Troubleshooting

### Campaign Not Sending

**Check environment variables:**
```bash
# Verify in your .env file
MAILCHIMP_API_KEY=... (not empty)
MAILCHIMP_SERVER_PREFIX=... (correct prefix)
MAILCHIMP_LIST_ID=... (correct list ID)
```

**Check console logs:**
- Look for error messages in the Strapi console
- Common errors:
  - `⚠️ Mailchimp service not configured` - Check .env variables
  - `❌ MAILCHIMP_LIST_ID not configured` - Add list ID to .env
  - API errors - Verify API key and permissions

### No Subscribers Receiving Emails

**Verify subscribers exist:**
1. Go to Content Manager > Email Alert
2. Check if there are entries with the correct preferences
3. Verify the `secFilings` or `pressReleases` field is checked

**Check Mailchimp audience:**
1. Go to Mailchimp > Audience > All contacts
2. Verify subscribers are synced
3. Check their tags (SEC_FILINGS, PRESS_RELEASES)

### Draft vs Published

**Important:** Emails are ONLY sent when content is **published**, not when saved as a draft.

To trigger an email:
1. Create or edit content
2. Click the **Publish** button (not just Save)

## Code Reference

- **Main Service:** [src/services/mailchimp.ts](src/services/mailchimp.ts)
- **Lifecycle Hooks:** [src/index.ts](src/index.ts)
- **Environment Config:** [.env](.env)

## API Methods

### `mailchimpService.sendCampaign(contentType, content)`
Sends a campaign to subscribers interested in the content type.

### `mailchimpService.syncSubscriber(subscriber)`
Syncs a subscriber from Strapi to Mailchimp.

### `mailchimpService.configure(config)`
Initializes the Mailchimp service with API credentials.

## Support

For issues or questions:
1. Check the console logs for error messages
2. Verify all environment variables are set correctly
3. Test with the Mailchimp API directly if needed
4. Review Mailchimp's API documentation: https://mailchimp.com/developer/

## Future Enhancements

Possible improvements:
- [ ] Email preview before sending
- [ ] Schedule campaigns for specific times
- [ ] A/B testing for email content
- [ ] Email analytics dashboard
- [ ] Unsubscribe link management
- [ ] Custom email templates per campaign
- [ ] Bulk import subscribers from CSV
