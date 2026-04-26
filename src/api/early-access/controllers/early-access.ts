/**
 * early-access controller
 */

import { factories } from '@strapi/strapi';
import { mailchimpService } from '../../../services/mailchimp';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default factories.createCoreController(
  'api::early-access.early-access',
  ({ strapi }) => ({
    async subscribe(ctx) {
      const { email } = (ctx.request.body?.data || ctx.request.body || {}) as {
        email?: string;
      };

      if (!email || !EMAIL_REGEX.test(email)) {
        return ctx.badRequest('A valid email is required');
      }

      const normalizedEmail = email.trim().toLowerCase();

      try {
        // Upsert into Strapi (don't fail if email already exists)
        const existing = await strapi.db
          .query('api::early-access.early-access')
          .findOne({ where: { email: normalizedEmail } });

        let entry = existing;
        if (!existing) {
          entry = await strapi.entityService.create(
            'api::early-access.early-access',
            { data: { email: normalizedEmail } }
          );
        }

        // Send the early access email via Mailchimp (subscribe + send campaign)
        try {
          await mailchimpService.sendEarlyAccessEmail(normalizedEmail);
        } catch (mailErr) {
          console.error('❌ Failed to send early access email:', mailErr);
          // Don't fail the request if email delivery fails; record is saved
        }

        ctx.send({
          data: { email: normalizedEmail, id: entry?.id },
          message: 'Early access email sent',
        });
      } catch (err: any) {
        console.error('❌ Early access subscribe error:', err);
        return ctx.internalServerError(
          err?.message || 'Failed to process early access request'
        );
      }
    },
  })
);
