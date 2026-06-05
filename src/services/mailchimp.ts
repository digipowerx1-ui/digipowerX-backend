import mailchimp from '@mailchimp/mailchimp_marketing';

interface MailchimpConfig {
  apiKey: string;
  serverPrefix: string;
  listId: string;
}

interface Subscriber {
  email: string;
  firstName?: string;
  lastName?: string;
  pressReleases?: boolean;
  secFilings?: boolean;
  stockPrices?: boolean;
}

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
  ): Promise<void> {
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

      // Temporarily disable auto-sending ONLY for stock-price during testing
      if (contentType === 'stock-price') {
        console.log('📧 MAILCHIMP CAMPAIGN CREATED');
        console.log(`📝 CAMPAIGN ID: ${campaign.id}`);
        console.log('🚫 AUTO SEND DISABLED FOR TESTING');
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

  private generateEmailContent(contentType: 'sec-filing' | 'press-release' | 'stock-price', content: any): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://digipowerx.com';

    if (contentType === 'stock-price') {
      const priceChange = content.close - content.open;
      const priceChangePercent = ((priceChange / content.open) * 100).toFixed(2);
      const changeColor = priceChange >= 0 ? '#10b981' : '#ef4444';
      const changeSymbol = priceChange >= 0 ? '▲' : '▼';
      const changeBgColor = priceChange >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';

      return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <title>Daily Stock Update - DigiPowerX</title>
          <style type="text/css">
            body { margin: 0 !important; padding: 0 !important; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
            table { border-spacing: 0; border-collapse: collapse; }
            img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
            @media only screen and (max-width: 600px) {
              .container { width: 100% !important; max-width: 600px !important; }
              .mobile-padding { padding: 20px !important; }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f1f5f9;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f1f5f9;">
            <tr>
              <td style="padding: 40px 0;">
                <table role="presentation" class="container" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #334152 0%, #01d3ff 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="color: #ffffff; font-size: 32px; font-weight: 700; margin: 0 0 10px 0; letter-spacing: -0.5px;">📈 Daily Stock Update</h1>
                      <p style="color: #ffffff; font-size: 16px; margin: 0; opacity: 0.95;">DigiPowerX Stock Performance</p>
                    </td>
                  </tr>

                  <tr><td style="height: 30px;"></td></tr>

                  <!-- Stock Price Card -->
                  <tr>
                    <td class="mobile-padding" style="padding: 0 30px 20px 30px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #334152 0%, #1a2633 100%); border-radius: 12px; overflow: hidden;">
                        <tr>
                          <td style="padding: 30px;">
                            <p style="color: #01d3ff; font-size: 14px; font-weight: 600; text-transform: uppercase; margin: 0 0 5px 0; letter-spacing: 1px;">${content.symbol || 'DGXX'} • NASDAQ</p>
                            <p style="color: #ffffff; font-size: 12px; margin: 0 0 20px 0; opacity: 0.8;">Last Updated: ${content.date ? new Date(content.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>

                            <!-- Price -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                              <tr>
                                <td style="padding-bottom: 20px;">
                                  <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                    <tr>
                                      <td style="vertical-align: baseline;">
                                        <span style="color: #ffffff; font-size: 48px; font-weight: 700; line-height: 1;">$${content.close?.toFixed(2) || 'N/A'}</span>
                                      </td>
                                      <td style="padding-left: 15px; vertical-align: baseline;">
                                        <span style="color: ${changeColor}; font-size: 18px; font-weight: 600; background-color: ${changeBgColor}; padding: 6px 12px; border-radius: 6px; display: inline-block;">${changeSymbol} $${Math.abs(priceChange).toFixed(2)} (${priceChangePercent}%)</span>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>

                            <!-- Stats Grid -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top: 1px solid rgba(1, 211, 255, 0.2); padding-top: 20px;">
                              <tr>
                                <td width="50%" style="padding-right: 10px;">
                                  <p style="color: rgba(255, 255, 255, 0.6); font-size: 12px; margin: 0 0 5px 0;">Open</p>
                                  <p style="color: #ffffff; font-size: 16px; font-weight: 600; margin: 0;">$${content.open?.toFixed(2) || 'N/A'}</p>
                                </td>
                                <td width="50%" style="padding-left: 10px;">
                                  <p style="color: rgba(255, 255, 255, 0.6); font-size: 12px; margin: 0 0 5px 0;">Volume</p>
                                  <p style="color: #ffffff; font-size: 16px; font-weight: 600; margin: 0;">${content.volume ? content.volume.toLocaleString() : 'N/A'}</p>
                                </td>
                              </tr>
                              <tr><td colspan="2" style="height: 15px;"></td></tr>
                              <tr>
                                <td width="50%" style="padding-right: 10px;">
                                  <p style="color: rgba(255, 255, 255, 0.6); font-size: 12px; margin: 0 0 5px 0;">Day High</p>
                                  <p style="color: #ffffff; font-size: 16px; font-weight: 600; margin: 0;">$${content.high?.toFixed(2) || 'N/A'}</p>
                                </td>
                                <td width="50%" style="padding-left: 10px;">
                                  <p style="color: rgba(255, 255, 255, 0.6); font-size: 12px; margin: 0 0 5px 0;">Day Low</p>
                                  <p style="color: #ffffff; font-size: 16px; font-weight: 600; margin: 0;">$${content.low?.toFixed(2) || 'N/A'}</p>
                                </td>
                              </tr>
                              ${content.preMarket ? `
                              <tr><td colspan="2" style="height: 15px;"></td></tr>
                              <tr>
                                <td width="50%" style="padding-right: 10px;">
                                  <p style="color: rgba(255, 255, 255, 0.6); font-size: 12px; margin: 0 0 5px 0;">Pre-Market</p>
                                  <p style="color: #ffffff; font-size: 16px; font-weight: 600; margin: 0;">$${content.preMarket.toFixed(2)}</p>
                                </td>
                                <td width="50%" style="padding-left: 10px;"></td>
                              </tr>
                              ` : ''}
                            </table>

                            <!-- Button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                              <tr>
                                <td style="padding-top: 25px; text-align: center;">
                                  <a href="${baseUrl}/investor-relations" style="display: inline-block; background-color: #01d3ff; color: #334152; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 30px; border-radius: 6px;">View Detailed Charts →</a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr><td style="height: 30px;"></td></tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                      <p style="color: #1e293b; font-size: 16px; font-weight: 600; margin: 0 0 15px 0;">DigiPowerX</p>
                      <p style="color: #94a3b8; font-size: 12px; margin: 0 0 10px 0;">You're receiving this email because you subscribed to DigiPowerX stock price updates.</p>
                      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                        <a href="${baseUrl}/investor-relations" style="color: #01d3ff; text-decoration: none;">Investor Relations</a> |
                        <a href="*|UNSUB|*" style="color: #01d3ff; text-decoration: none;">Unsubscribe</a>
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
    } else if (contentType === 'sec-filing') {
      return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <title>New SEC Filing - DigiPowerX</title>
          <style type="text/css">
            body { margin: 0 !important; padding: 0 !important; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
            table { border-spacing: 0; border-collapse: collapse; }
            img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
            @media only screen and (max-width: 600px) {
              .container { width: 100% !important; max-width: 600px !important; }
              .mobile-padding { padding: 20px !important; }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f1f5f9;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f1f5f9;">
            <tr>
              <td style="padding: 40px 0;">
                <table role="presentation" class="container" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #334152 0%, #01d3ff 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="color: #ffffff; font-size: 32px; font-weight: 700; margin: 0 0 10px 0; letter-spacing: -0.5px;">📄 New SEC Filing</h1>
                      <p style="color: #ffffff; font-size: 16px; margin: 0; opacity: 0.95;">DigiPowerX Investor Relations</p>
                    </td>
                  </tr>

                  <tr><td style="height: 30px;"></td></tr>

                  <!-- SEC Filing Card -->
                  <tr>
                    <td class="mobile-padding" style="padding: 0 30px 15px 30px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border: 1px solid #e2e8f0; border-radius: 8px;">
                        <tr>
                          <td style="padding: 20px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                              <tr>
                                <td width="80">
                                  <div style="width: 60px; height: 60px; background: linear-gradient(135deg, rgba(51, 65, 82, 0.1) 0%, rgba(1, 211, 255, 0.1) 100%); border-radius: 8px; text-align: center; line-height: 60px; font-size: 24px;">📋</div>
                                </td>
                                <td style="vertical-align: top;">
                                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tr>
                                      <td>
                                        <p style="background-color: #01d3ff; color: #ffffff; font-size: 11px; font-weight: 600; text-transform: uppercase; padding: 4px 10px; border-radius: 4px; display: inline-block; margin: 0 0 10px 0;">${content.form_type || 'SEC FILING'}</p>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>
                                        <h3 style="color: #1e293b; font-size: 18px; font-weight: 600; margin: 0 0 8px 0; line-height: 1.4;">${content.description || 'SEC Filing'}</h3>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>
                                        <p style="color: #64748b; font-size: 13px; margin: 0 0 10px 0;">Filed: ${content.date ? new Date(content.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>
                                        <a href="${content.pdf_file?.url ? (content.pdf_file.url.startsWith('http') ? content.pdf_file.url : `${baseUrl}${content.pdf_file.url}`) : `${baseUrl}/sec-filings/${content.documentId}`}" style="color: #01d3ff; font-size: 13px; font-weight: 600; text-decoration: none;" target="_blank">Download PDF →</a>
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

                  <!-- View All Button -->
                  <tr>
                    <td class="mobile-padding" style="padding: 10px 30px 0 30px; text-align: center;">
                      <a href="${baseUrl}/sec-filings" style="display: inline-block; color: #334152; font-size: 14px; font-weight: 600; text-decoration: none; border: 2px solid #334152; padding: 10px 25px; border-radius: 6px;">View All SEC Filings →</a>
                    </td>
                  </tr>

                  <tr><td style="height: 30px;"></td></tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                      <p style="color: #1e293b; font-size: 16px; font-weight: 600; margin: 0 0 15px 0;">DigiPowerX</p>
                      <p style="color: #94a3b8; font-size: 12px; margin: 0 0 10px 0;">You're receiving this email because you subscribed to DigiPowerX SEC filing updates.</p>
                      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                        <a href="${baseUrl}/investor-relations" style="color: #01d3ff; text-decoration: none;">Investor Relations</a> |
                        <a href="*|UNSUB|*" style="color: #01d3ff; text-decoration: none;">Unsubscribe</a>
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
    } else {
      return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <title>New Press Release - DigiPowerX</title>
          <style type="text/css">
            body { margin: 0 !important; padding: 0 !important; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
            table { border-spacing: 0; border-collapse: collapse; }
            img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
            @media only screen and (max-width: 600px) {
              .container { width: 100% !important; max-width: 600px !important; }
              .mobile-padding { padding: 20px !important; }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f1f5f9;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f1f5f9;">
            <tr>
              <td style="padding: 40px 0;">
                <table role="presentation" class="container" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #334152 0%, #01d3ff 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="color: #ffffff; font-size: 32px; font-weight: 700; margin: 0 0 10px 0; letter-spacing: -0.5px;">📰 New Press Release</h1>
                      <p style="color: #ffffff; font-size: 16px; margin: 0; opacity: 0.95;">DigiPowerX News & Updates</p>
                    </td>
                  </tr>

                  <tr><td style="height: 30px;"></td></tr>

                  <!-- Press Release Content -->
                  <tr>
                    <td class="mobile-padding" style="padding: 0 30px 20px 30px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc; border-radius: 8px; border-left: 4px solid #01d3ff;">
                        <tr>
                          <td style="padding: 20px;">
                            <p style="color: #01d3ff; font-size: 12px; font-weight: 600; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 0.5px;">${content.date ? new Date(content.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>
                            <h3 style="color: #1e293b; font-size: 20px; font-weight: 600; margin: 0 0 10px 0; line-height: 1.4;">${content.title || 'Press Release'}</h3>
                            <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 15px 0;">${content.content ? content.content.substring(0, 250) + '...' : 'Read the full press release on our website.'}</p>
                            <a href="${content.pdf_file?.url ? (content.pdf_file.url.startsWith('http') ? content.pdf_file.url : `${baseUrl}${content.pdf_file.url}`) : `${baseUrl}/press-releases/${content.documentId}`}" style="display: inline-block; color: #01d3ff; font-size: 14px; font-weight: 600; text-decoration: none; border-bottom: 2px solid #01d3ff; padding-bottom: 2px;" target="_blank">Read Full Release →</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- View All Button -->
                  <tr>
                    <td class="mobile-padding" style="padding: 10px 30px 0 30px; text-align: center;">
                      <a href="${baseUrl}/press-releases" style="display: inline-block; color: #334152; font-size: 14px; font-weight: 600; text-decoration: none; border: 2px solid #334152; padding: 10px 25px; border-radius: 6px;">View All Press Releases →</a>
                    </td>
                  </tr>

                  <tr><td style="height: 30px;"></td></tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                      <p style="color: #1e293b; font-size: 16px; font-weight: 600; margin: 0 0 15px 0;">DigiPowerX</p>
                      <p style="color: #94a3b8; font-size: 12px; margin: 0 0 10px 0;">You're receiving this email because you subscribed to DigiPowerX press release updates.</p>
                      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                        <a href="${baseUrl}/investor-relations" style="color: #01d3ff; text-decoration: none;">Investor Relations</a> |
                        <a href="*|UNSUB|*" style="color: #01d3ff; text-decoration: none;">Unsubscribe</a>
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


  async syncSubscriber(subscriber: Subscriber): Promise<void> {
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

  private getSubscriberHash(email: string): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(email.toLowerCase()).digest('hex');
  }

  /**
   * Subscribe a user to the early access list (with EARLY_ACCESS tag) and
   * immediately send them an early-access welcome email via a one-off campaign.
   */
  async sendEarlyAccessEmail(email: string): Promise<void> {
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

      const campaign: any = await mailchimp.campaigns.create({
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
                    <h1 style="color:#ffffff;font-size:30px;font-weight:700;margin:0 0 10px 0;">🚀 You're In!</h1>
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
                          <a href="${baseUrl}" style="display:inline-block;background-color:#01d3ff;color:#334152;font-size:14px;font-weight:600;text-decoration:none;padding:12px 30px;border-radius:6px;">Visit DigiPowerX →</a>
                        </td>
                      </tr>
                    </table>
                    <p style="font-size:14px;line-height:1.6;color:#64748b;margin:20px 0 0 0;">
                      — The DigiPowerX Team
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
