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
    contentType: 'sec-filing' | 'press-release',
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

      // Send campaign
      await mailchimp.campaigns.send(campaign.id);
      console.log(`✅ Campaign sent successfully for ${contentType}: ${campaign.id}`);
    } catch (error) {
      console.error(`❌ Error sending Mailchimp campaign for ${contentType}:`, error);
      throw error;
    }
  }


  private async createCampaign(
    contentType: 'sec-filing' | 'press-release',
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

      // Create campaign - send to all list members
      // Users can manage preferences via Mailchimp tags or unsubscribe
      const campaign = await mailchimp.campaigns.create({
        type: 'regular',
        recipients: {
          list_id: listId,
        },
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

  private getSubject(contentType: 'sec-filing' | 'press-release', content: any): string {
    if (contentType === 'sec-filing') {
      return `New SEC Filing: ${content.form_type || 'Form'} - ${content.description || 'Update'}`;
    } else {
      return `New Press Release: ${content.title || 'Update'}`;
    }
  }

  private generateEmailContent(contentType: 'sec-filing' | 'press-release', content: any): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://digipowerx.com';

    if (contentType === 'sec-filing') {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New SEC Filing</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h1 style="color: #0066cc; margin-top: 0;">New SEC Filing Available</h1>
            <div style="background-color: white; padding: 20px; border-radius: 4px; margin-top: 20px;">
              <h2 style="color: #333; font-size: 20px;">${content.form_type || 'SEC Filing'}</h2>
              <p><strong>Date:</strong> ${content.date ? new Date(content.date).toLocaleDateString() : 'N/A'}</p>
              <p><strong>Description:</strong> ${content.description || 'N/A'}</p>
              ${content.pdf_file ? `<p><a href="${baseUrl}/sec-filings" style="display: inline-block; background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 10px;">View Filing</a></p>` : ''}
            </div>
            <p style="font-size: 12px; color: #666; margin-top: 20px;">
              You received this email because you subscribed to SEC filing alerts from DigiPowerX.
            </p>
          </div>
        </body>
        </html>
      `;
    } else {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Press Release</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h1 style="color: #0066cc; margin-top: 0;">New Press Release</h1>
            <div style="background-color: white; padding: 20px; border-radius: 4px; margin-top: 20px;">
              <h2 style="color: #333; font-size: 20px;">${content.title || 'Press Release'}</h2>
              <p><strong>Date:</strong> ${content.date ? new Date(content.date).toLocaleDateString() : 'N/A'}</p>
              ${content.content ? `<div style="margin-top: 15px;">${content.content.substring(0, 200)}...</div>` : ''}
              <p><a href="${baseUrl}/press-releases" style="display: inline-block; background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 10px;">Read Full Release</a></p>
            </div>
            <p style="font-size: 12px; color: #666; margin-top: 20px;">
              You received this email because you subscribed to press release alerts from DigiPowerX.
            </p>
          </div>
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
        tags: [
          ...(subscriber.pressReleases ? ['PRESS_RELEASES'] : []),
          ...(subscriber.secFilings ? ['SEC_FILINGS'] : []),
        ],
      };

      await mailchimp.lists.setListMember(
        listId,
        this.getSubscriberHash(subscriber.email),
        memberData
      );

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
}

// Export singleton instance
export const mailchimpService = new MailchimpService();
