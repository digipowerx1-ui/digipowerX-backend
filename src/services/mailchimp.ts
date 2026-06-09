import mailchimp from '@mailchimp/mailchimp_marketing';

// Configuration interface for Mailchimp
interface MailchimpConfig {
  apiKey: string;
  serverPrefix: string;
  listId?: string;
}

// Subscriber interface placeholder (type any for now)
// type Subscriber = any;


class MailchimpService {
  private isConfigured = false;

  configure(config: MailchimpConfig) {
    if (!config.apiKey || !config.serverPrefix) {
      console.warn('Mailchimp API credentials not configured');
      return;
    }

    mailchimp.setConfig({
      apiKey: config.apiKey,
      server: config.serverPrefix,
    });

    this.isConfigured = true;
    console.log('✅ Mailchimp service configured successfully');
  }

  async sendCampaign(
    contentType: 'sec-filing' | 'press-release' | 'stock-price',
    content: any
  ) {
    if (!this.isConfigured) {
      console.warn('⚠️  Mailchimp service not configured. Skipping campaign send.');
      return;
    }

    try {
      const listId = process.env.MAILCHIMP_LIST_ID;
      if (!listId) {
        console.error('❌ MAILCHIMP_LIST_ID not configured');
        return;
      }

      // Create campaign and send to all list members
      // Note: Make sure subscribers are synced with proper tags (SEC_FILINGS, PRESS_RELEASES)
      // They can use Mailchimp's unsubscribe feature if they don't want emails
      const campaign = await this.createCampaign(contentType, content, listId);

      if (!campaign || !campaign.id) {
        console.error('❌ Failed to create campaign');
        return;
      }

      // Send campaign
      await mailchimp.campaigns.send(campaign.id);
      console.log(`✅ Campaign sent successfully for ${contentType}: ${campaign.id}`);
    } catch (error) {
      console.error(`❌ Error sending Mailchimp campaign for ${contentType}:`, error);
      throw error;
    }
  }


  private async createCampaign(
    contentType: 'sec-filing' | 'press-release' | 'stock-price',
    content: any,
    listId: string
  ) {
    try {
      const subject = this.getSubject(contentType, content);
      const emailContent = this.generateEmailContent(contentType, content);

      console.log('📋 Creating campaign with:', {
        contentType,
        listId,
        subject,
        from_name: process.env.MAILCHIMP_FROM_NAME,
        reply_to: process.env.MAILCHIMP_REPLY_TO,
      });

      let segmentName = '';
      if (contentType === 'press-release') segmentName = 'PRESS_RELEASES';
      if (contentType === 'sec-filing') segmentName = 'SEC_FILINGS';
      if (contentType === 'stock-price') segmentName = 'STOCK_PRICES';

      let savedSegmentId: number | undefined;

      if (segmentName) {
        try {
          // Fetch up to 100 segments to ensure we find it
          const segmentsResponse = await mailchimp.lists.listSegments(listId, { count: 100 });
          const segment = segmentsResponse.segments.find((s: any) => s.name === segmentName);
          if (segment) {
            savedSegmentId = segment.id;
            console.log(`✅ Found segment ${segmentName} with ID: ${savedSegmentId}`);
          } else {
            console.warn(`⚠️ Segment '${segmentName}' not found in Mailchimp list. Campaign will be sent to ALL subscribers!`);
          }
        } catch (error) {
          console.error('❌ Error fetching Mailchimp segments:', error);
        }
      }

      const recipients: any = { list_id: listId };
      if (savedSegmentId) {
        recipients.segment_opts = { saved_segment_id: savedSegmentId };
      }

      // Create campaign - send to targeted segment members
      const campaign = await mailchimp.campaigns.create({
        type: 'regular',
        recipients,
        settings: {
          subject_line: subject,
          from_name: process.env.MAILCHIMP_FROM_NAME || 'DigiPowerX',
          reply_to: process.env.MAILCHIMP_REPLY_TO || 'noreply@digipowerx.com',
          title: `${contentType} - ${new Date().toISOString()}`,
        },
      });

      console.log('✅ Campaign created:', campaign.id);

      // Set campaign content
      await mailchimp.campaigns.setContent(campaign.id, {
        html: emailContent,
      });

      console.log('✅ Campaign content set');

      return campaign;
    } catch (error: any) {
      console.error('❌ Error creating Mailchimp campaign:', error);
      if (error.response?.body) {
        console.error('📄 Mailchimp API Error Details:', JSON.stringify(error.response.body, null, 2));
      }
      throw error;
    }
  }

  private getSubject(contentType: 'sec-filing' | 'press-release' | 'stock-price', content: any): string {
    if (contentType === 'sec-filing') {
      return `New SEC Filing: ${content.form_type || 'Form'} - ${content.description || 'Update'}`;
    } else if (contentType === 'press-release') {
      return `New Press Release: ${content.title || 'Update'}`;
    } else {
      return `Daily Stock Update: ${content.symbol || 'DGXX'} - ${content.date ? new Date(content.date).toLocaleDateString() : ''}`;
    }
  }

  // ─── Email Content Router ────────────────────────────────────────────────────

  private generateEmailContent(contentType: 'sec-filing' | 'press-release' | 'stock-price', content: any): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://digipowerx.com';

    if (contentType === 'stock-price') {
      return this.generateStockPriceEmail(content, baseUrl);
    } else if (contentType === 'sec-filing') {
      return this.generateSecFilingEmail(content, baseUrl);
    } else {
      return this.generatePressReleaseEmail(content, baseUrl);
    }
  }

  // ─── Shared Template Helpers ─────────────────────────────────────────────────

  private getSharedHead(title: string): string {
    return `
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>${title}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&display=swap" rel="stylesheet">
      <style>
        @media only screen and (max-width: 600px) {
          .container-table { width: 100% !important; max-width: 100% !important; }
          .content-padding { padding: 10px !important; }
          .section-box { padding: 15px !important; }
          .hero-container { border-radius: 12px !important; height: 200px !important; }
          .stock-left { width: 100% !important; display: block !important; text-align: center !important; padding: 20px 10px !important; box-sizing: border-box !important; }
          .stock-right { width: 100% !important; display: block !important; text-align: center !important; border-left: none !important; padding: 20px 10px !important; box-sizing: border-box !important; }
          .stock-logo-table { margin: 0 auto 15px auto !important; }
          .stock-ticker { text-align: center !important; }
          .stock-date { text-align: center !important; }
          .stock-grid { margin: 0 auto !important; max-width: 100% !important; width: 100% !important; }
          .stock-stat { width: 50% !important; text-align: center !important; padding-left: 0 !important; }
          .stock-volume { text-align: center !important; padding-left: 0 !important; }
          .heading-row { flex-direction: column !important; align-items: flex-start !important; }
          .heading-left { width: 100% !important; display: block !important; }
          .heading-right { width: 100% !important; display: block !important; margin-top: 5px !important; text-align: left !important; }
        }
      </style>
    `;
  }

  private getSharedLogoAndHero(): string {
    return `
      <!-- HEADER LOGO SECTION -->
      <tr>
        <td class="content-padding" style="padding: 25px 10px; text-align: left;">
          <img src="https://www.digipowerx.com/assets/Digi%20new%20color%20logo-DZLOANmV.png" alt="DigiPowerX Logo" style="height: 100px; width: auto; display: block;">
        </td>
      </tr>

      <!-- HERO BANNER SECTION -->
      <tr>
        <td class="content-padding" style="padding: 0 10px 30px 10px;">
          <div class="hero-container" style="position: relative; overflow: hidden; border: 2px solid #F7C325; border-radius: 24px; background-color: #050505; height: 320px; box-shadow: 0 8px 30px rgba(0,0,0,0.8);">
            <img src="https://www.digipowerx.com/assets/hero-server-room-Dr-hbzUt.jpg" alt="DigiPowerX Server Racks" style="width: 100%; height: 100%; object-fit: cover; display: block; opacity: 0.85;">
          </div>
        </td>
      </tr>

      <!-- ABOUT SECTION -->
      <tr>
        <td class="content-padding" style="padding: 40px 30px; background-color: #FFFFFF; border-radius: 16px; text-align: center;">
          <h2 style="margin: 0 0 15px 0; color: #000000; font-size: 24px; font-weight: 700; font-family: 'Outfit', sans-serif;">
            About <span style="color: #F7C325;">DigiPowerX</span>
          </h2>
          <p style="margin: 0; color: #333333; font-size: 15px; line-height: 1.6; font-weight: 400; max-width: 540px; display: inline-block;">
            DigiPowerX Corporation is a vertically integrated AI Infrastructure company - Owning and Operating Power Generation Assets, Data Centers, and GPU compute capacity across the United States.
          </p>
        </td>
      </tr>

      <!-- SECTION DIVIDER -->
      <tr><td style="height: 20px;"></td></tr>
    `;
  }

  private getSharedFooter(): string {
    return `
      <!-- SECTION DIVIDER -->
      <tr><td style="height: 40px;"></td></tr>

      <!-- THANK YOU / FOOTER SECTION -->
      <tr>
        <td class="content-padding" style="padding: 50px 30px; background-color: #070707; text-align: center; border-top: 1px solid rgba(247, 195, 37, 0.2);">
          <h3 style="color: #F7C325; font-size: 20px; font-weight: 700; margin: 0 0 15px 0; font-family: 'Outfit', sans-serif; letter-spacing: 0.5px;">Thank You</h3>
          <p style="color: #A0A0A0; font-size: 12px; font-weight: 400; line-height: 1.5; margin: 0 0 25px 0;">
            You're receiving this email because you subscribed to DigiPowerX.
          </p>
          <p style="color: #A0A0A0; font-size: 11px; line-height: 1.6; margin: 0 0 35px 0;">
            You can <a href="*|UNSUB|*" style="color: #F7C325; text-decoration: underline;">unsubscribe from these emails</a>.<br>
            You can also <a href="*|ARCHIVE|*" style="color: #F7C325; text-decoration: underline;">view this email in your browser</a> and <a href="*|UPDATE_PROFILE|*" style="color: #F7C325; text-decoration: underline;">manage your preferences</a>.
          </p>
          <p style="color: #A0A0A0; font-size: 11px; line-height: 1.6; margin: 0 0 25px 0;">
            Miami, Florida, USA<br>
            &copy; ${new Date().getFullYear()} DigiPowerX
          </p>

          <!-- Footer Logo -->
          <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 35px auto; border-collapse: collapse;">
            <tr>
              <td style="vertical-align: middle; padding-right: 6px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="#FFFFFF" stroke-width="2.5" />
                  <path d="M12 6V12" stroke="#FFFFFF" stroke-width="2.5" />
                  <path d="M8 10H16" stroke="#FFFFFF" stroke-width="2.5" />
                  <path d="M9 14H15" stroke="#FFFFFF" stroke-width="2.5" />
                </svg>
              </td>
              <td style="font-size: 14px; font-weight: 800; color: #FFFFFF; font-family: 'Outfit', sans-serif;">
                DIGIPOWER <span style="color: #F7C325;">X</span>
              </td>
            </tr>
          </table>

          <!-- Social Media Row -->
          <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto; border-collapse: collapse;">
            <tr>
              <td style="padding: 0 10px;">
                <a href="https://www.facebook.com/DigiPowerX/" target="_blank" style="text-decoration: none; display: inline-block;">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="#F7C325" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 12C22 6.477 17.522 2 12 2S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12z" />
                  </svg>
                </a>
              </td>
              <td style="padding: 0 10px;">
                <a href="https://www.instagram.com/digipowerx/" target="_blank" style="text-decoration: none; display: inline-block;">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="#F7C325" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                </a>
              </td>
              <td style="padding: 0 10px;">
                <a href="https://x.com/DigipowerX" target="_blank" style="text-decoration: none; display: inline-block;">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="#F7C325" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              </td>
              <td style="padding: 0 10px;">
                <a href="https://www.linkedin.com/company/digi-power-x/" target="_blank" style="text-decoration: none; display: inline-block;">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="#F7C325" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </a>
              </td>
              <td style="padding: 0 10px;">
                <a href="https://www.youtube.com/@DigipowerX" target="_blank" style="text-decoration: none; display: inline-block;">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="#F7C325" xmlns="http://www.w3.org/2000/svg">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }

  // ─── Press Release Email ─────────────────────────────────────────────────────

  private generatePressReleaseEmail(content: any, baseUrl: string): string {
    const publishedDate = content.date
      ? new Date(content.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'N/A';
    const backendUrlRaw = process.env.BACKEND_URL || baseUrl;
    const backendUrl = String(backendUrlRaw).replace(/\/+$/g, '');
    const pdfUrl = content.pdf_file?.url
      ? (content.pdf_file.url.startsWith('http')
          ? content.pdf_file.url
          : (content.pdf_file.url.startsWith('/') ? `${backendUrl}${content.pdf_file.url}` : `${backendUrl}/${content.pdf_file.url}`))
      : `${backendUrl}/press-releases/${content.documentId}`;

    return `<!DOCTYPE html>
<html lang="en">
<head>${this.getSharedHead('New Press Release - DigiPowerX')}</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;">
  <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all;">DigiPowerX Press Release - ${content.title || 'Latest Update'}</div>
  <center style="width: 100%; background-color: #000000; padding: 20px 0;">
    <table class="container-table" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 650px; background-color: #000000; border-collapse: collapse; margin: 0 auto;">
      ${this.getSharedLogoAndHero()}

      <!-- OFFICIAL PRESS RELEASE HEADER -->
      <tr>
        <td class="content-padding" style="padding: 15px 15px; background-color: #000000;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr class="heading-row">
              <td class="heading-left" style="font-size: 20px; font-weight: 700; color: #FFFFFF;">
                Official <span style="color: #F7C325;">Press Release</span>
              </td>
              <td class="heading-right" style="text-align: right; font-size: 13px; color: #A0A0A0; font-weight: 500;">
                DigiPowerX updated with the latest
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- OFFICIAL PRESS RELEASE BOX -->
      <tr>
        <td class="content-padding" style="padding: 10px;">
          <div class="section-box" style="border: 2px solid #F7C325; border-radius: 16px; padding: 25px; background-color: #070707;">
            <div style="margin-bottom: 15px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 6L18 18M18 18H10M18 18V10" stroke="#F7C325" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
            <p style="margin: 0 0 20px 0; color: #FFFFFF; font-size: 15px; line-height: 1.6; font-weight: 300;">
              ${content.title || 'Press Release'}
            </p>
            ${content.content ? `<p style="margin: 0 0 20px 0; color: #A0A0A0; font-size: 13px; line-height: 1.6; font-weight: 300;">${content.content.substring(0, 250)}...</p>` : ''}
            <div style="font-size: 13px; color: #FFFFFF; font-weight: 300; margin-bottom: 15px;">
              <span style="color: #F7C325; font-weight: 600;">Published:</span> ${publishedDate}
            </div>
            <a href="${pdfUrl}" target="_blank" style="color: #F7C325; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-flex; align-items: center;">
              View PDF <span style="margin-left: 5px;">&#10142;</span>
            </a>
          </div>
        </td>
      </tr>

      <!-- VIEW MORE PRESS RELEASE BUTTON -->
      <tr>
        <td class="content-padding" style="padding: 20px 10px 40px 10px; text-align: center;">
          <a href="${baseUrl}/press-releases" style="background-color: #000000; border: 2px solid #F7C325; color: #F7C325; text-decoration: none; padding: 12px 30px; border-radius: 30px; font-size: 14px; font-weight: 700; display: inline-block;">
            View More Press Release
          </a>
        </td>
      </tr>

      ${this.getSharedFooter()}
    </table>
  </center>
</body>
</html>`;
  }

  // ─── SEC Filing Email ────────────────────────────────────────────────────────

  private generateSecFilingEmail(content: any, baseUrl: string): string {
    const filedDate = content.date
      ? new Date(content.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : 'N/A';
    const backendUrlRaw = process.env.BACKEND_URL || baseUrl;
    const backendUrl = String(backendUrlRaw).replace(/\/+$/g, '');
    const pdfUrl = content.pdf_file?.url
      ? (content.pdf_file.url.startsWith('http')
          ? content.pdf_file.url
          : (content.pdf_file.url.startsWith('/') ? `${backendUrl}${content.pdf_file.url}` : `${backendUrl}/${content.pdf_file.url}`))
      : `${backendUrl}/sec-filings/${content.documentId}`;

    return `<!DOCTYPE html>
<html lang="en">
<head>${this.getSharedHead('New SEC Filing - DigiPowerX')}</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;">
  <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all;">DigiPowerX New SEC Filing - ${content.form_type || 'Update'}</div>
  <center style="width: 100%; background-color: #000000; padding: 20px 0;">
    <table class="container-table" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 650px; background-color: #000000; border-collapse: collapse; margin: 0 auto;">
      ${this.getSharedLogoAndHero()}

      <!-- NEW SEC FILING HEADER -->
      <tr>
        <td class="content-padding" style="padding: 15px 15px; background-color: #000000;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr class="heading-row">
              <td class="heading-left" style="font-size: 20px; font-weight: 700; color: #FFFFFF;">
                New <span style="color: #F7C325;">SEC Filing</span>
              </td>
              <td class="heading-right" style="text-align: right; font-size: 13px; color: #A0A0A0; font-weight: 500;">
                DigiPowerX Investor Relations
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- NEW SEC FILING BOX -->
      <tr>
        <td class="content-padding" style="padding: 10px;">
          <div class="section-box" style="border: 2px solid #F7C325; border-radius: 16px; padding: 25px; background-color: #070707;">
            <div style="margin-bottom: 15px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 6L18 18M18 18H10M18 18V10" stroke="#F7C325" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
            ${content.form_type ? `<div style="margin-bottom: 10px;"><span style="background-color: #F7C325; color: #000000; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 4px; text-transform: uppercase;">${content.form_type}</span></div>` : ''}
            <p style="margin: 0 0 20px 0; color: #FFFFFF; font-size: 14px; line-height: 1.6; font-weight: 300;">
              ${content.description || 'View the latest SEC filing from DigiPowerX Investor Relations.'}
            </p>
            <div style="font-size: 13px; color: #FFFFFF; font-weight: 300; margin-bottom: 15px;">
              <span style="color: #F7C325; font-weight: 600;">Filed:</span> ${filedDate}
            </div>
            <a href="${pdfUrl}" target="_blank" style="color: #F7C325; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-flex; align-items: center;">
              View PDF <span style="margin-left: 5px;">&#10142;</span>
            </a>
          </div>
        </td>
      </tr>

      <!-- VIEW MORE SEC FILING BUTTON -->
      <tr>
        <td class="content-padding" style="padding: 20px 10px 40px 10px; text-align: center;">
          <a href="${baseUrl}/investor-relations" style="background-color: #000000; border: 2px solid #F7C325; color: #F7C325; text-decoration: none; padding: 12px 30px; border-radius: 30px; font-size: 14px; font-weight: 700; display: inline-block;">
            View More SEC Filing
          </a>
        </td>
      </tr>

      ${this.getSharedFooter()}
    </table>
  </center>
</body>
</html>`;
  }

  // ─── Stock Price Email ───────────────────────────────────────────────────────

  private generateStockPriceEmail(content: any, baseUrl: string): string {
    const priceChange = content.close - content.open;
    const priceChangePercent = ((priceChange / content.open) * 100).toFixed(2);
    const changeColor = priceChange >= 0 ? '#39D377' : '#ef4444';
    const changeBgColor = priceChange >= 0 ? '#0C3E20' : '#3e0c0c';
    const changeSymbol = priceChange >= 0 ? '&#9650;' : '&#9660;';
    const formattedDate = content.date
      ? new Date(content.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : 'N/A';

    return `<!DOCTYPE html>
<html lang="en">
<head>${this.getSharedHead('Daily Stock Update - DigiPowerX')}</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;">
  <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all;">DigiPowerX Daily Stock Update - ${content.symbol || 'DGXX'}</div>
  <center style="width: 100%; background-color: #000000; padding: 20px 0;">
    <table class="container-table" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 650px; background-color: #000000; border-collapse: collapse; margin: 0 auto;">
      ${this.getSharedLogoAndHero()}

      <!-- DAILY STOCK UPDATE HEADER -->
      <tr>
        <td class="content-padding" style="padding: 15px 15px; background-color: #000000;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr class="heading-row">
              <td class="heading-left" style="font-size: 20px; font-weight: 700; color: #FFFFFF;">
                Daily <span style="color: #F7C325;">Stock Update</span>
              </td>
              <td class="heading-right" style="text-align: right; font-size: 13px; color: #A0A0A0; font-weight: 500;">
                DigiPowerX Stock Performance
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- DAILY STOCK UPDATE BOX -->
      <tr>
        <td class="content-padding" style="padding: 10px;">
            <table class="stock-container" border="0" cellpadding="0" cellspacing="0" width="100%" background="https://www.digipowerx.com/assets/hero-server-room-Dr-hbzUt.jpg" style="border-collapse: collapse; background-image: url('https://www.digipowerx.com/assets/hero-server-room-Dr-hbzUt.jpg'); background-size: cover; background-position: center; background-repeat: no-repeat; width: 100%;">
              <tr>
                <td style="background-color: rgba(5, 5, 5, 0.78); padding: 0;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                    <tr>
                      <!-- Left Block -->
                      <td class="stock-left" valign="middle" style="width: 50%; padding: 30px 15px 30px 20px; box-sizing: border-box; text-align: left;">
                        <table border="0" cellpadding="0" cellspacing="0" class="stock-logo-table" style="margin: 0 0 15px 0; border-collapse: collapse;">
                          <tr>
                            <td style="vertical-align: middle; padding-right: 6px;">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" stroke="#FFFFFF" stroke-width="2.5" />
                                <path d="M12 6V12" stroke="#FFFFFF" stroke-width="2.5" />
                                <path d="M8 10H16" stroke="#FFFFFF" stroke-width="2.5" />
                                <path d="M9 14H15" stroke="#FFFFFF" stroke-width="2.5" />
                              </svg>
                            </td>
                            <td style="font-size: 13px; font-weight: 800; color: #FFFFFF; font-family: 'Outfit', sans-serif;">
                              DIGIPOWER <span style="color: #F7C325;">X</span>
                            </td>
                          </tr>
                        </table>
                        <div style="font-size: 56px; font-weight: 800; color: #FFFFFF; line-height: 1.1; margin-bottom: 12px; font-family: 'Outfit', sans-serif;">
                          $${content.close?.toFixed(2) || 'N/A'}
                        </div>
                        <span style="background-color: ${changeBgColor}; color: ${changeColor}; font-size: 14px; font-weight: 700; padding: 6px 14px; border-radius: 20px; display: inline-flex; align-items: center; font-family: 'Outfit', sans-serif;">
                          <span style="font-size: 10px; margin-right: 5px;">${changeSymbol}</span> $${Math.abs(priceChange).toFixed(2)} (${priceChangePercent}%)
                        </span>
                      </td>

                      <!-- Right Block -->
                      <td class="stock-right" valign="middle" style="width: 50%; border-left: 1px solid rgba(247, 195, 37, 0.3); padding: 30px 20px 30px 20px; box-sizing: border-box; text-align: right; font-family: 'Outfit', sans-serif;">
                        <div class="stock-ticker" style="text-align: right; margin-bottom: 2px;">
                          <span style="color: #F7C325; font-size: 18px; font-weight: 800; letter-spacing: 0.5px;">${content.symbol || 'DGXX'} &bull; NASDAQ</span>
                        </div>
                        <div class="stock-date" style="text-align: right; color: #A0A0A0; font-size: 11px; margin-bottom: 15px; font-weight: 500;">
                          Last Updated: ${formattedDate}
                        </div>
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="stock-grid" style="border-collapse: collapse; max-width: 240px; margin-left: auto;">
                          <tr>
                            <td align="right" valign="top" class="stock-stat" style="width: 50%; padding-bottom: 10px; padding-left: 5px; box-sizing: border-box;">
                              <div style="color: #A0A0A0; font-size: 10px; font-weight: 600; text-transform: uppercase;">OPEN</div>
                              <div style="color: #FFFFFF; font-size: 14px; font-weight: 700; margin-top: 2px;">$${content.open?.toFixed(2) || 'N/A'}</div>
                            </td>
                            <td align="right" valign="top" class="stock-stat" style="width: 50%; padding-bottom: 10px; padding-left: 5px; box-sizing: border-box;">
                              <div style="color: #A0A0A0; font-size: 10px; font-weight: 600; text-transform: uppercase;">PRE-MARKET</div>
                              <div style="color: #FFFFFF; font-size: 14px; font-weight: 700; margin-top: 2px;">$${content.preMarket ? content.preMarket.toFixed(2) : 'N/A'}</div>
                            </td>
                          </tr>
                          <tr>
                            <td align="right" valign="top" class="stock-stat" style="width: 50%; padding-bottom: 10px; padding-left: 5px; box-sizing: border-box;">
                              <div style="color: #A0A0A0; font-size: 10px; font-weight: 600; text-transform: uppercase;">DAY HIGH</div>
                              <div style="color: #FFFFFF; font-size: 14px; font-weight: 700; margin-top: 2px;">$${content.high?.toFixed(2) || 'N/A'}</div>
                            </td>
                            <td align="right" valign="top" class="stock-stat" style="width: 50%; padding-bottom: 10px; padding-left: 5px; box-sizing: border-box;">
                              <div style="color: #A0A0A0; font-size: 10px; font-weight: 600; text-transform: uppercase;">DAY LOW</div>
                              <div style="color: #FFFFFF; font-size: 14px; font-weight: 700; margin-top: 2px;">$${content.low?.toFixed(2) || 'N/A'}</div>
                            </td>
                          </tr>
                          <tr>
                            <td colspan="2" align="right" valign="top" class="stock-volume" style="padding-top: 5px; padding-left: 5px; box-sizing: border-box;">
                              <div style="color: #A0A0A0; font-size: 10px; font-weight: 600; text-transform: uppercase;">VOLUME</div>
                              <div style="color: #FFFFFF; font-size: 16px; font-weight: 700; margin-top: 2px;">${content.volume ? content.volume.toLocaleString() : 'N/A'}</div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
        </td>
      </tr>

      ${this.getSharedFooter()}
    </table>
  </center>
</body>
</html>`;
  }

  // ─── Subscriber Sync ─────────────────────────────────────────────────────────

  async syncSubscriber(subscriber) {
    if (!this.isConfigured) {
      console.warn('⚠️  Mailchimp service not configured. Skipping subscriber sync.');
      return;
    }

    try {
      const listId = process.env.MAILCHIMP_LIST_ID;
      if (!listId) {
        console.error('❌ MAILCHIMP_LIST_ID not configured');
        return;
      }

      const memberData = {
        email_address: subscriber.email,
        status: 'subscribed' as const,
        merge_fields: {
          FNAME: subscriber.firstName || '',
          LNAME: subscriber.lastName || '',
        },
        interests: {
          // You'll need to replace these with actual interest IDs from your Mailchimp list
          // or use tags instead
        },
      };

      const subscriberHash = this.getSubscriberHash(subscriber.email);

      await mailchimp.lists.setListMember(
        listId,
        subscriberHash,
        memberData
      );

      // Now update the tags explicitly
      const tagsToUpdate = [];
      if (subscriber.pressReleases !== undefined) {
        tagsToUpdate.push({ name: 'PRESS_RELEASES', status: subscriber.pressReleases ? 'active' : 'inactive' });
      }
      if (subscriber.secFilings !== undefined) {
        tagsToUpdate.push({ name: 'SEC_FILINGS', status: subscriber.secFilings ? 'active' : 'inactive' });
      }
      if (subscriber.stockPrices !== undefined) {
        tagsToUpdate.push({ name: 'STOCK_PRICES', status: subscriber.stockPrices ? 'active' : 'inactive' });
      }

      if (tagsToUpdate.length > 0) {
        await mailchimp.lists.updateListMemberTags(listId, subscriberHash, {
          tags: tagsToUpdate as any,
        });
      }

      console.log(`✅ Subscriber synced to Mailchimp: ${subscriber.email}`);
    } catch (error) {
      console.error('❌ Error syncing subscriber to Mailchimp:', error);
      throw error;
    }
  }

  private getSubscriberHash(email) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(email.toLowerCase()).digest('hex');
  }

  /**
   * Subscribe a user to the early access list (with EARLY_ACCESS tag) and
   * immediately send them an early-access welcome email via a one-off campaign.
   */
  async sendEarlyAccessEmail(email) {
    if (!this.isConfigured) {
      console.warn('⚠️  Mailchimp service not configured. Skipping early access email.');
      return;
    }

    const listId = process.env.MAILCHIMP_LIST_ID;
    if (!listId) {
      console.error('❌ MAILCHIMP_LIST_ID not configured');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Upsert the subscriber with the EARLY_ACCESS tag
    try {
      await mailchimp.lists.setListMember(
        listId,
        this.getSubscriberHash(normalizedEmail),
        {
          email_address: normalizedEmail,
          status_if_new: 'subscribed',
          tags: ['EARLY_ACCESS'],
        } as any
      );
      console.log(`✅ Early access subscriber synced: ${normalizedEmail}`);
    } catch (error: any) {
      console.error('❌ Error syncing early access subscriber:', error?.response?.body || error);
      throw error;
    }

    // 2. Create + send a one-off campaign targeted at just this email
    try {
      // Mailchimp needs a moment to index the new subscriber into segments
      await new Promise(resolve => setTimeout(resolve, 3000));

      const subject = "You're on the DigiPowerX Early Access list";
      const html = this.generateEarlyAccessEmailContent(normalizedEmail);

      const campaign = await mailchimp.campaigns.create({
        type: 'regular',
        recipients: {
          list_id: listId,
          segment_opts: {
            match: 'all',
            conditions: [
              {
                condition_type: 'EmailAddress',
                field: 'merge0',
                op: 'is',
                value: normalizedEmail,
              },
            ],
          },
        } as any,
        settings: {
          subject_line: subject,
          from_name: process.env.MAILCHIMP_FROM_NAME || 'DigiPowerX',
          reply_to: process.env.MAILCHIMP_REPLY_TO || 'noreply@digipowerx.com',
          title: `Early Access - ${normalizedEmail} - ${new Date().toISOString()}`,
        },
      });

      if (!campaign?.id) {
        throw new Error('Failed to create early access campaign');
      }

      await mailchimp.campaigns.setContent(campaign.id, { html });
      await mailchimp.campaigns.send(campaign.id);

      console.log(`✅ Early access email sent to ${normalizedEmail} (campaign ${campaign.id})`);
    } catch (error: any) {
      console.error('❌ Error sending early access campaign:', error?.response?.body || error);
      throw error;
    }
  }

  private generateEarlyAccessEmailContent(email: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://digipowerx.com';
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to DigiPowerX Early Access</title>
      </head>
      <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,sans-serif;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f1f5f9;">
          <tr>
            <td style="padding:40px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
                <tr>
                  <td style="background:linear-gradient(135deg,#334152 0%,#01d3ff 100%);padding:40px 30px;text-align:center;">
                    <h1 style="color:#ffffff;font-size:30px;font-weight:700;margin:0 0 10px 0;">&#128640; You're In!</h1>
                    <p style="color:#ffffff;font-size:16px;margin:0;opacity:0.95;">Welcome to DigiPowerX Early Access</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px 30px;color:#1e293b;">
                    <p style="font-size:16px;line-height:1.6;margin:0 0 20px 0;">Hi there,</p>
                    <p style="font-size:16px;line-height:1.6;margin:0 0 20px 0;">
                      Thanks for signing up for early access to <strong>DigiPowerX</strong>! We've added
                      <strong>${email}</strong> to our early access list.
                    </p>
                    <p style="font-size:16px;line-height:1.6;margin:0 0 20px 0;">
                      You'll be among the first to hear about new features, product launches, and exclusive
                      updates. Stay tuned — exciting things are on the way.
                    </p>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding:20px 0;text-align:center;">
                          <a href="${baseUrl}" style="display:inline-block;background-color:#01d3ff;color:#334152;font-size:14px;font-weight:600;text-decoration:none;padding:12px 30px;border-radius:6px;">Visit DigiPowerX &rarr;</a>
                        </td>
                      </tr>
                    </table>
                    <p style="font-size:14px;line-height:1.6;color:#64748b;margin:20px 0 0 0;">
                      &mdash; The DigiPowerX Team
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color:#f8fafc;padding:24px 30px;text-align:center;border-top:1px solid #e2e8f0;">
                    <p style="color:#94a3b8;font-size:12px;margin:0 0 8px 0;">You're receiving this email because you signed up for DigiPowerX early access.</p>
                    <p style="color:#94a3b8;font-size:12px;margin:0;">
                      <a href="${baseUrl}" style="color:#01d3ff;text-decoration:none;">DigiPowerX</a> |
                      <a href="*|UNSUB|*" style="color:#01d3ff;text-decoration:none;">Unsubscribe</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }
}

// Export singleton instance
export const mailchimpService = new MailchimpService();
