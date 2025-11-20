# Stock Price Email Notifications Setup

This document explains how the daily stock price email notification system works and how to use it.

## Overview

The system automatically fetches daily closing stock prices from the Massive API and sends them to subscribers via Mailchimp email campaigns.

## Features

✅ **Automatic Daily Fetching**: Cron job runs daily at 11 PM UTC (6 PM EST) after market close
✅ **Email Notifications**: Sends professional HTML emails with stock data to subscribers
✅ **Subscriber Preferences**: Users can opt-in to receive stock price updates
✅ **Integration**: Works seamlessly with existing press release and SEC filing notifications

## Architecture

### 1. Content Type: `stock-price`

Located in: `src/api/stock-price/`

Schema includes:
- `symbol` (string, default: "DGXX")
- `date` (date, required)
- `open`, `high`, `low`, `close` (decimal)
- `volume` (biginteger)
- `preMarket` (decimal)

### 2. Stock Price Service

Located in: `src/services/stockPrice.ts`

**Key Methods**:
- `fetchStockPrice(symbol, date)` - Fetches data from Massive API
- `saveStockPrice(stockData)` - Saves to Strapi database
- `fetchAndSaveStockPrice(symbol, date)` - Combined fetch and save operation

### 3. Mailchimp Integration

Updated: `src/services/mailchimp.ts`

**New Features**:
- Stock price email template with price change indicators (▲/▼)
- Color-coded price movements (green for gains, red for losses)
- Detailed data table (Open, High, Low, Volume, Pre-Market)
- Support for `STOCK_PRICES` subscriber tag

**Email Template Highlights**:
```
Subject: Daily Stock Update: DGXX - [Date]
Content:
  - Large closing price display
  - Price change with percentage
  - Full market data table
  - Link to investor relations page
```

### 4. Lifecycle Hooks

Updated: `src/index.ts`

Automatically sends email campaigns when:
- A new stock price entry is published
- An existing stock price entry is updated to published status

### 5. Cron Job

Configured in: `config/server.ts`

**Schedule**: `0 23 * * 1-5` (11 PM UTC, Monday-Friday)
**Action**: Fetches previous day's closing price for DGXX and publishes it

## Configuration

### Environment Variables

Add to `.env`:
```bash
# Massive API (Stock Price Data)
MASSIVE_API_KEY=YkYoy5TFxWSGWgO6cZmX57tjyBWSzb2p
```

### Mailchimp Tags

Subscribers with the `STOCK_PRICES` tag will receive stock price emails.

### Email Alert Schema

The `email-alert` content type already includes:
- `stockDetailEndOfDay` (boolean) - User preference for stock price updates

## Setup Instructions

### 1. Start the Development Server

```bash
npm run develop
```

This will:
- Generate TypeScript definitions for the new content type
- Start Strapi with cron jobs enabled
- Make the admin panel available at http://localhost:1337/admin

### 2. Verify Content Type

1. Log into Strapi admin panel
2. Navigate to Content-Type Builder
3. Verify "Stock Price" collection type exists with all fields

### 3. Test Manual Fetch

You can manually fetch and publish stock prices through the Strapi API or admin panel:

**Via Strapi Console** (in bootstrap or controller):
```javascript
const { stockPriceService } = require('./src/services/stockPrice');
await stockPriceService.fetchAndSaveStockPrice('DGXX', '2025-11-20');
```

**Via Admin Panel**:
1. Go to Content Manager → Stock Prices
2. Click "Create new entry"
3. Fill in the data manually or wait for cron job
4. Click "Publish" to trigger email campaign

### 4. Verify Subscriber Preferences

1. Go to Content Manager → Email Alerts
2. Check that subscribers have `stockDetailEndOfDay` enabled
3. Verify they're synced to Mailchimp with `STOCK_PRICES` tag

## Testing

### Test Email Campaign

1. Create a test stock price entry in Strapi admin:
   ```json
   {
     "symbol": "DGXX",
     "date": "2025-11-20",
     "open": 3.66,
     "high": 3.98,
     "low": 3.20,
     "close": 3.85,
     "volume": 4376172,
     "preMarket": 3.77
   }
   ```

2. Click "Publish"
3. Check console for: `✅ Campaign sent successfully for stock-price: [campaign_id]`
4. Verify email in Mailchimp dashboard and subscriber inbox

### Test Cron Job

To test the cron job without waiting for the scheduled time, temporarily change the cron expression in `config/server.ts`:

```typescript
// Run every minute for testing
'* * * * *': async ({ strapi }) => {
  // ... existing code
}
```

Remember to change it back to `'0 23 * * 1-5'` after testing!

## API Details

### Massive API

**Endpoint**: `https://api.massive.com/v1/open-close/{symbol}/{date}?adjusted=true&apiKey={key}`

**Parameters**:
- `symbol` - Stock ticker (e.g., "DGXX")
- `date` - Date in YYYY-MM-DD format
- `adjusted` - Use adjusted prices (true)
- `apiKey` - Your Massive API key

**Response Example**:
```json
{
  "status": "OK",
  "from": "2025-11-20",
  "symbol": "DGXX",
  "open": 3.66,
  "high": 3.98,
  "low": 3.2001,
  "close": 3.85,
  "volume": 4376172,
  "preMarket": 3.77
}
```

## Customization

### Change Stock Symbol

Edit `config/server.ts`:
```typescript
await stockPriceService.fetchAndSaveStockPrice('YOUR_SYMBOL');
```

### Change Cron Schedule

Edit `config/server.ts` cron expression:
- `0 23 * * 1-5` - 11 PM UTC, weekdays (current)
- `0 21 * * 1-5` - 9 PM UTC (4 PM EST, right after market close)
- `0 0 * * 2-6` - Midnight UTC (previous day's data)

[Cron expression guide](https://crontab.guru/)

### Customize Email Template

Edit `src/services/mailchimp.ts`, method `generateEmailContent()`, section for `'stock-price'`.

You can customize:
- Colors and styling
- Data displayed
- Links and call-to-action buttons
- Footer text

## Troubleshooting

### TypeScript Errors

**Issue**: Build fails with "not assignable to parameter of type 'ContentType'"

**Solution**: Start dev server to generate types:
```bash
npm run develop
```

### Cron Job Not Running

**Issue**: Stock prices not fetched automatically

**Check**:
1. Verify cron is enabled in `config/server.ts`
2. Check server logs for cron execution messages
3. Verify server timezone matches expected cron time
4. Test cron expression at https://crontab.guru/

### Email Not Sending

**Issue**: Stock price published but no email sent

**Check**:
1. Verify Mailchimp credentials in `.env`
2. Check console for Mailchimp errors
3. Verify lifecycle hook is registered in `src/index.ts`
4. Ensure entry is published (not draft)
5. Check Mailchimp campaign dashboard

### API Fetch Failing

**Issue**: Can't fetch data from Massive API

**Check**:
1. Verify `MASSIVE_API_KEY` in `.env`
2. Check date format (must be YYYY-MM-DD)
3. Verify symbol exists and market was open on that date
4. Check API rate limits

## Future Enhancements

Potential improvements:

- [ ] Support multiple stock symbols
- [ ] Historical data import
- [ ] Charts in email template
- [ ] Weekly digest option
- [ ] Price alerts (threshold-based)
- [ ] Integration with more stock data providers
- [ ] Retry logic for failed API calls
- [ ] Admin UI for triggering manual fetches

## Support

For issues or questions:
- Check Strapi logs: `console` output when running server
- Check Mailchimp dashboard for campaign status
- Verify .env configuration
- Test API endpoint manually in browser/Postman

## Related Files

- Content Type: `src/api/stock-price/`
- Service: `src/services/stockPrice.ts`
- Mailchimp: `src/services/mailchimp.ts`
- Lifecycle Hooks: `src/index.ts`
- Cron Config: `config/server.ts`
- Environment: `.env`
