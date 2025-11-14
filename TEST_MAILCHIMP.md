# Mailchimp Integration Testing Guide

## Prerequisites
✅ Mailchimp credentials added to .env
✅ Strapi server restarted

## Test 1: Verify Configuration

1. **Start Strapi:**
   ```bash
   npm run develop
   ```

2. **Check console output for:**
   ```
   ✅ Mailchimp service configured successfully
   ```

   ❌ **If you see a warning instead:**
   - Double-check your .env file
   - Make sure there are no extra spaces
   - Verify API key includes the server prefix (e.g., `-us1`)

## Test 2: Create a Test Subscriber

1. **Access Strapi Admin:**
   - Go to http://localhost:1337/admin
   - Log in to your admin account

2. **Create Email Alert Subscriber:**
   - Navigate to **Content Manager** → **Email Alert**
   - Click **Create new entry**
   - Fill in:
     - **Email:** your-test-email@example.com (use your real email!)
     - **First Name:** Test
     - **Last Name:** User
     - **Company:** (optional)
     - **Press Releases:** ✅ Check this
     - **SEC Filings:** ✅ Check this
   - Click **Save**

3. **Check Console Logs:**
   ```
   📧 New email alert subscriber: your-test-email@example.com
   ✅ Subscriber synced to Mailchimp: your-test-email@example.com
   ```

4. **Verify in Mailchimp:**
   - Log in to Mailchimp
   - Go to **Audience** → **All contacts**
   - Search for your email
   - Check that it appears with tags: `PRESS_RELEASES`, `SEC_FILINGS`

## Test 3: Send a Test Press Release Campaign

1. **Create Press Release:**
   - In Strapi Admin, go to **Content Manager** → **Press Release**
   - Click **Create new entry**
   - Fill in:
     - **Title:** Test Press Release - Mailchimp Integration
     - **Date:** Today's date
     - **Content:** This is a test press release to verify Mailchimp integration is working correctly.
     - **PDF File:** (optional)
   - **Important:** Click **Save** first (saves as draft)

2. **Publish the Press Release:**
   - Click **Publish** button
   - This will trigger the email campaign!

3. **Check Console Logs:**
   ```
   📰 New Press Release created: [documentId]
   ✅ Campaign sent successfully for press-release: [campaignId]
   ```

   Or if updating:
   ```
   📰 Press Release updated: [documentId]
   ✅ Campaign sent successfully for press-release: [campaignId]
   ```

## Test 4: Verify Campaign in Mailchimp

1. **Check Mailchimp Dashboard:**
   - Go to https://mailchimp.com
   - Navigate to **Campaigns**
   - Look for a campaign with title: `press-release - [timestamp]`

2. **Verify Campaign Details:**
   - Click on the campaign
   - Check the **Recipients** count
   - View the **Content** to see your email template
   - Check **Reports** to see delivery status

3. **Check Your Email:**
   - Open the email inbox you used for testing
   - Look for email from "DigiPowerX"
   - Subject should be: "New Press Release: Test Press Release - Mailchimp Integration"
   - Verify the email looks good and links work

## Test 5: Send a Test SEC Filing Campaign

1. **Create SEC Filing:**
   - In Strapi Admin, go to **Content Manager** → **SEC Filing**
   - Click **Create new entry**
   - Fill in:
     - **Form Type:** 8-K
     - **Date:** Today's date
     - **Description:** Test SEC Filing for Mailchimp Integration
     - **PDF File:** (optional)
   - Click **Save** (saves as draft)

2. **Publish the SEC Filing:**
   - Click **Publish** button
   - This will trigger the email campaign!

3. **Check Console Logs:**
   ```
   📄 New SEC Filing created: [documentId]
   ✅ Campaign sent successfully for sec-filing: [campaignId]
   ```

4. **Verify in Mailchimp:**
   - Go to **Campaigns**
   - Look for campaign: `sec-filing - [timestamp]`
   - Check your email inbox

## Troubleshooting

### Error: "Mailchimp service not configured"
**Solution:**
- Check .env file has correct values
- Restart Strapi: `npm run develop`

### Error: "MAILCHIMP_LIST_ID not configured"
**Solution:**
- Verify MAILCHIMP_LIST_ID is set in .env
- Should be 10 characters (e.g., `40d53c0df0`)

### Error: API Key Invalid
**Solution:**
- Verify API key format: `{32-chars}-{server-prefix}`
- Example: `abc123...xyz789-us1`
- Check for extra spaces or line breaks

### Error: "No subscribers found"
**Solution:**
- Create at least one Email Alert entry
- Make sure the correct preference is checked
- For Press Release: `pressReleases` must be checked
- For SEC Filing: `secFilings` must be checked

### Campaign Created but Not Sending
**Solution:**
- Check Mailchimp account status (trial vs paid)
- Verify list has valid subscribers
- Check Mailchimp's Campaign sending limits
- Look for errors in Mailchimp dashboard

### Email Not Received
**Possible causes:**
1. **Spam folder** - Check your spam/junk folder
2. **Mailchimp queue** - Can take 2-10 minutes for small lists
3. **Invalid email** - Verify email is valid in Mailchimp
4. **List subscription** - Check subscriber is in the list and not unsubscribed

## Success Checklist

✅ Strapi starts with "Mailchimp service configured successfully"
✅ Subscriber syncs to Mailchimp with correct tags
✅ Publishing Press Release creates campaign in Mailchimp
✅ Publishing SEC Filing creates campaign in Mailchimp
✅ Email received in inbox with correct content
✅ Email template looks professional
✅ Links in email work correctly

## Clean Up After Testing

1. **Delete test entries:**
   - Remove test Press Release
   - Remove test SEC Filing
   - Keep or remove test subscriber

2. **Delete test campaigns in Mailchimp:**
   - Go to Campaigns → Select test campaigns → Delete

3. **Optional: Remove test subscriber from Mailchimp:**
   - Audience → All contacts → Find test email → Delete

---

## Next Steps After Successful Testing

1. ✅ Integration is working!
2. 🎯 Start collecting real subscribers
3. 📧 Publish real content to send campaigns
4. 📊 Monitor campaign performance in Mailchimp
5. 🔧 Customize email templates if needed (in [src/services/mailchimp.ts](src/services/mailchimp.ts))

## Need Help?

- Check console logs for detailed error messages
- Review Mailchimp campaign reports for delivery issues
- Verify environment variables are correct
- Test with a different email address
