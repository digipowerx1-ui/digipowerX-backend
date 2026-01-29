import nodemailer from 'nodemailer';

interface CareerApplication {
  fullName: string;
  email: string;
  phone: string;
  interstedRole: string;
  portfolio_Link?: string;
  resume?: {
    url: string;
    name: string;
  };
  problemSolutionAttachment?: {
    url: string;
    name: string;
  };
}

class CareerNotificationService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;

  configure() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      console.warn('⚠️  SMTP credentials not configured. Career notifications will be disabled.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    this.isConfigured = true;
    console.log('✅ Career notification service configured successfully');
  }

  async sendApplicationNotification(application: CareerApplication): Promise<void> {
    if (!this.isConfigured || !this.transporter) {
      console.warn('⚠️  Career notification service not configured. Skipping email.');
      return;
    }

    const notificationEmail = process.env.CAREER_NOTIFICATION_EMAIL || 'DGXX@zelarsoft.com';
    const baseUrl = process.env.FRONTEND_URL || 'https://digipowerx.com';

    try {
      const resumeUrl = application.resume?.url
        ? (application.resume.url.startsWith('http') ? application.resume.url : `${baseUrl}${application.resume.url}`)
        : null;

      const problemSolutionUrl = application.problemSolutionAttachment?.url
        ? (application.problemSolutionAttachment.url.startsWith('http') ? application.problemSolutionAttachment.url : `${baseUrl}${application.problemSolutionAttachment.url}`)
        : null;

      const emailHtml = this.generateEmailContent(application, resumeUrl, problemSolutionUrl);

      await this.transporter.sendMail({
        from: `"DigiPowerX Careers" <${process.env.SMTP_USER}>`,
        to: notificationEmail,
        subject: `New Job Application: ${application.interstedRole} - ${application.fullName}`,
        html: emailHtml,
      });

      console.log(`✅ Career notification sent to ${notificationEmail} for applicant: ${application.fullName}`);
    } catch (error) {
      console.error('❌ Error sending career notification email:', error);
      throw error;
    }
  }

  private generateEmailContent(
    application: CareerApplication,
    resumeUrl: string | null,
    problemSolutionUrl: string | null
  ): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Job Application - DigiPowerX</title>
        <style type="text/css">
          body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
          table { border-spacing: 0; border-collapse: collapse; }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f1f5f9;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f1f5f9;">
          <tr>
            <td style="padding: 40px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #334152 0%, #01d3ff 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0 0 10px 0;">📋 New Job Application</h1>
                    <p style="color: #ffffff; font-size: 16px; margin: 0; opacity: 0.95;">DigiPowerX Careers</p>
                  </td>
                </tr>

                <tr><td style="height: 30px;"></td></tr>

                <!-- Applicant Details -->
                <tr>
                  <td style="padding: 0 30px 20px 30px;">
                    <h2 style="color: #334152; font-size: 20px; font-weight: 600; margin: 0 0 20px 0; border-bottom: 2px solid #01d3ff; padding-bottom: 10px;">Applicant Details</h2>

                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                          <strong style="color: #64748b; font-size: 14px;">Full Name:</strong>
                          <p style="color: #1e293b; font-size: 16px; margin: 5px 0 0 0;">${application.fullName}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                          <strong style="color: #64748b; font-size: 14px;">Email:</strong>
                          <p style="color: #1e293b; font-size: 16px; margin: 5px 0 0 0;"><a href="mailto:${application.email}" style="color: #01d3ff; text-decoration: none;">${application.email}</a></p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                          <strong style="color: #64748b; font-size: 14px;">Phone:</strong>
                          <p style="color: #1e293b; font-size: 16px; margin: 5px 0 0 0;">${application.phone}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                          <strong style="color: #64748b; font-size: 14px;">Interested Role:</strong>
                          <p style="color: #1e293b; font-size: 16px; margin: 5px 0 0 0; font-weight: 600;">${application.interstedRole}</p>
                        </td>
                      </tr>
                      ${application.portfolio_Link ? `
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                          <strong style="color: #64748b; font-size: 14px;">Portfolio Link:</strong>
                          <p style="color: #1e293b; font-size: 16px; margin: 5px 0 0 0;"><a href="${application.portfolio_Link}" style="color: #01d3ff; text-decoration: none;" target="_blank">${application.portfolio_Link}</a></p>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>

                <!-- Attachments -->
                <tr>
                  <td style="padding: 0 30px 30px 30px;">
                    <h2 style="color: #334152; font-size: 20px; font-weight: 600; margin: 0 0 20px 0; border-bottom: 2px solid #01d3ff; padding-bottom: 10px;">Attachments</h2>

                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      ${resumeUrl ? `
                      <tr>
                        <td style="padding: 15px; background-color: #f8fafc; border-radius: 8px; margin-bottom: 10px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td width="50">
                                <div style="width: 40px; height: 40px; background: linear-gradient(135deg, rgba(51, 65, 82, 0.1) 0%, rgba(1, 211, 255, 0.1) 100%); border-radius: 8px; text-align: center; line-height: 40px; font-size: 20px;">📄</div>
                              </td>
                              <td>
                                <p style="color: #64748b; font-size: 12px; margin: 0;">Resume</p>
                                <a href="${resumeUrl}" style="color: #01d3ff; font-size: 14px; font-weight: 600; text-decoration: none;" target="_blank">Download Resume →</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr><td style="height: 10px;"></td></tr>
                      ` : '<tr><td style="padding: 10px; color: #ef4444;">⚠️ Resume not uploaded</td></tr>'}

                      ${problemSolutionUrl ? `
                      <tr>
                        <td style="padding: 15px; background-color: #f8fafc; border-radius: 8px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td width="50">
                                <div style="width: 40px; height: 40px; background: linear-gradient(135deg, rgba(51, 65, 82, 0.1) 0%, rgba(1, 211, 255, 0.1) 100%); border-radius: 8px; text-align: center; line-height: 40px; font-size: 20px;">💡</div>
                              </td>
                              <td>
                                <p style="color: #64748b; font-size: 12px; margin: 0;">Problem Solutioning Document</p>
                                <a href="${problemSolutionUrl}" style="color: #01d3ff; font-size: 14px; font-weight: 600; text-decoration: none;" target="_blank">Download Document →</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ` : '<tr><td style="padding: 10px; color: #ef4444;">⚠️ Problem Solutioning document not uploaded</td></tr>'}
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="color: #1e293b; font-size: 16px; font-weight: 600; margin: 0 0 10px 0;">DigiPowerX</p>
                    <p style="color: #94a3b8; font-size: 12px; margin: 0;">This is an automated notification from the DigiPowerX careers system.</p>
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

export const careerNotificationService = new CareerNotificationService();
