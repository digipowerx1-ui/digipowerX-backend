import type { Core } from '@strapi/strapi';
import { mailchimpService } from './services/mailchimp';
import { careerNotificationService } from './services/careerNotification';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }: { strapi: Core.Strapi }) {
    // Register lifecycle hooks for sec-filing
    strapi.db.lifecycles.subscribe({
      models: ['api::sec-filing.sec-filing'],
      async afterCreate(event) {
        const { result } = event;
        console.log('📄 New SEC Filing created:', result.documentId);

        // Only send email if the document is published
        if (result.publishedAt) {
          try {
            await mailchimpService.sendCampaign('sec-filing', result);
          } catch (error) {
            console.error('Failed to send Mailchimp campaign for SEC filing:', error);
          }
        }
      },
      async afterUpdate(event) {
        const { result } = event;
        console.log('📄 SEC Filing updated:', result.documentId);

        // Send email when document is published (transitioned from draft to published)
        if (result.publishedAt && event.params?.data?.publishedAt) {
          try {
            await mailchimpService.sendCampaign('sec-filing', result);
          } catch (error) {
            console.error('Failed to send Mailchimp campaign for SEC filing:', error);
          }
        }
      },
    });

    // Register lifecycle hooks for press-release
    strapi.db.lifecycles.subscribe({
      models: ['api::press-release.press-release'],
      async afterCreate(event) {
        const { result } = event;
        console.log('📰 New Press Release created:', result.documentId);

        // Only send email if the document is published
        if (result.publishedAt) {
          try {
            await mailchimpService.sendCampaign('press-release', result);
          } catch (error) {
            console.error('Failed to send Mailchimp campaign for press release:', error);
          }
        }
      },
      async afterUpdate(event) {
        const { result } = event;
        console.log('📰 Press Release updated:', result.documentId);

        // Send email when document is published (transitioned from draft to published)
        if (result.publishedAt && event.params?.data?.publishedAt) {
          try {
            await mailchimpService.sendCampaign('press-release', result);
          } catch (error) {
            console.error('Failed to send Mailchimp campaign for press release:', error);
          }
        }
      },
    });

    // Register lifecycle hooks for stock-price
    strapi.db.lifecycles.subscribe({
      models: ['api::stock-price.stock-price'],
      async afterCreate(event) {
        const { result } = event;
        console.log('📈 New Stock Price created:', result.documentId);

        // Only send email if the document is published
        if (result.publishedAt) {
          try {
            await mailchimpService.sendCampaign('stock-price', result);
          } catch (error) {
            console.error('Failed to send Mailchimp campaign for stock price:', error);
          }
        }
      },
      async afterUpdate(event) {
        const { result } = event;
        console.log('📈 Stock Price updated:', result.documentId);

        // Send email when document is published (transitioned from draft to published)
        if (result.publishedAt && event.params?.data?.publishedAt) {
          try {
            await mailchimpService.sendCampaign('stock-price', result);
          } catch (error) {
            console.error('Failed to send Mailchimp campaign for stock price:', error);
          }
        }
      },
    });

    // Register lifecycle hooks for career applications
    strapi.db.lifecycles.subscribe({
      models: ['api::career.career'],
      async afterCreate(event) {
        const { result } = event;
        console.log('💼 New career application received:', result.fullName);

        try {
          await careerNotificationService.sendApplicationNotification({
            fullName: result.fullName,
            email: result.email,
            phone: result.phone,
            interstedRole: result.interstedRole,
            portfolio_Link: result.portfolio_Link,
            resume: result.resume,
            problemSolutionAttachment: result.problemSolutionAttachment,
          });
        } catch (error) {
          console.error('Failed to send career notification:', error);
        }
      },
    });

    // Register lifecycle hooks for email-alert (optional: sync with Mailchimp)
    strapi.db.lifecycles.subscribe({
      models: ['api::email-alert.email-alert'],
      async afterCreate(event) {
        const { result } = event;
        console.log('📧 New email alert subscriber:', result.email);

        try {
          await mailchimpService.syncSubscriber({
            email: result.email,
            firstName: result.firstName,
            lastName: result.lastName,
            pressReleases: result.pressReleases,
            secFilings: result.secFilings,
            stockPrices: result.stockDetailEndOfDay,
          });
        } catch (error) {
          console.error('Failed to sync subscriber to Mailchimp:', error);
        }
      },
      async afterUpdate(event) {
        const { result } = event;
        console.log('📧 Email alert subscriber updated:', result.email);

        try {
          await mailchimpService.syncSubscriber({
            email: result.email,
            firstName: result.firstName,
            lastName: result.lastName,
            pressReleases: result.pressReleases,
            secFilings: result.secFilings,
            stockPrices: result.stockDetailEndOfDay,
          });
        } catch (error) {
          console.error('Failed to sync subscriber to Mailchimp:', error);
        }
      },
    });
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap({ strapi }: { strapi: Core.Strapi }) {
    // Log API keys on startup
    console.log('🚀 Server starting...');
    console.log('📋 MASSIVE_API_KEY configured:', process.env.MASSIVE_API_KEY ? 'Yes' : 'No');
    console.log('🔑 MASSIVE_API_KEY (first 10 chars):', process.env.MASSIVE_API_KEY ? process.env.MASSIVE_API_KEY.substring(0, 10) + '...' : 'NOT SET');
    console.log('📋 MAILCHIMP_API_KEY configured:', process.env.MAILCHIMP_API_KEY ? 'Yes' : 'No');

    // Initialize Mailchimp service
    mailchimpService.configure({
      apiKey: process.env.MAILCHIMP_API_KEY || '',
      serverPrefix: process.env.MAILCHIMP_SERVER_PREFIX || '',
      listId: process.env.MAILCHIMP_LIST_ID || '',
    });

    // Initialize career notification service
    careerNotificationService.configure();
  },
};
