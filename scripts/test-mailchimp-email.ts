import { mailchimpService } from '../src/services/mailchimp';

async function run() {
  const sample = {
    title: 'Test Press Release for Staging',
    date: '2026-06-09',
    content: 'This is a test press release used to generate email HTML for staging validation.',
    pdf_file: {
      url: '/uploads/Digi_Power_X_Secures_NVIDIA_Vera_Rubin_Systems_e36df1af3f.pdf',
    },
    documentId: 'test-press-1',
  };

  const baseUrl = process.env.FRONTEND_URL || 'https://staging.digipowerx.com';

  // Call the internal generator via the service instance
  try {
    // @ts-ignore - access private method for testing
    const html = (mailchimpService as any).generatePressReleaseEmail(sample, baseUrl);
    console.log('--- GENERATED EMAIL HTML START ---');
    console.log(html.slice(0, 2000)); // print head
    console.log('--- GENERATED EMAIL HTML END ---');
  } catch (err) {
    console.error('Error generating email HTML:', err);
    process.exit(1);
  }
}

run();
