function buildPdfUrl(pdfFileUrl, backendUrlRaw, baseUrl) {
  const backendUrl = String(backendUrlRaw || baseUrl || '').replace(/\/+$/g, '');
  if (pdfFileUrl) {
    if (pdfFileUrl.startsWith('http')) return pdfFileUrl;
    if (pdfFileUrl.startsWith('/')) return `${backendUrl}${pdfFileUrl}`;
    return `${backendUrl}/${pdfFileUrl}`;
  }
  return `${backendUrl}/press-releases/test-press-1`;
}

function generatePressReleaseEmailMinimal(content, baseUrl) {
  const backendUrlRaw = process.env.BACKEND_URL || baseUrl;
  const pdfUrl = buildPdfUrl(content.pdf_file?.url, backendUrlRaw, baseUrl);
  return `View PDF Link: <a href="${pdfUrl}" target="_blank">View PDF</a>`;
}

const baseUrl = 'https://staging.digipowerx.com';

const cases = [
  { pdf: { url: '/uploads/file1.pdf' }, desc: 'leading slash relative' },
  { pdf: { url: 'uploads/file2.pdf' }, desc: 'no leading slash relative' },
  { pdf: { url: 'https://cdn.example.com/file3.pdf' }, desc: 'absolute http' },
  { pdf: null, desc: 'no pdf_file present' },
];

console.log('BACKEND_URL env:', process.env.BACKEND_URL || '(unset, using baseUrl)');
for (const c of cases) {
  const html = generatePressReleaseEmailMinimal({ pdf_file: c.pdf, documentId: 'test-press-1' }, baseUrl);
  console.log(`\nCase: ${c.desc}`);
  console.log(html);
}
