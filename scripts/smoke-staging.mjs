const baseUrl = String(process.env.STAGING_BASE_URL || '').replace(/\/$/, '');
const schoolId = process.env.STAGING_SCHOOL_ID || 'contract-test-school';
if (!/^https:\/\//.test(baseUrl)) throw new Error('STAGING_BASE_URL must be an https URL');

const checks = [
  ['/health', (body) => body.ok === true && body.service === 'brasa-content'],
  [`/v1/education/lessons?schoolId=${encodeURIComponent(schoolId)}&locale=en`, (body) => Array.isArray(body.data)],
  ['/v1/business/pathways?limit=1', (body) => Array.isArray(body.data) && body.meta],
  ['/v1/business/experiences/retail?locale=es', (body) => body.data?.type === 'business-experience' && body.data?.locale === 'es' && body.data?.steps?.length === 4],
  ['/v1/business/experiences/retail/learning?locale=es', (body) => Array.isArray(body.data) && body.meta?.progressTracked === false],
  ['/v1/business/experiences/retail/preparation?countryCode=CR', (body) => Array.isArray(body.data) && body.meta?.informationalOnly === true && body.meta?.legalAdvice === false],
  ['/v1/business/experiences/retail/providers?countryCode=CR&limit=6', (body) => Array.isArray(body.data) && body.meta?.verifiedOnly === true],
  ['/v1/business/providers?countryCode=CR&limit=1', (body) => Array.isArray(body.data) && body.meta?.notice],
  ['/v1/government/services?countryCode=CR&limit=1', (body) => Array.isArray(body.data) && body.meta]
];
for (const [path, validate] of checks) {
  const response = await fetch(`${baseUrl}${path}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
  const body = await response.json();
  if (!response.ok || !validate(body)) throw new Error(`${path} failed (${response.status})`);
  if (!response.headers.get('x-request-id')) throw new Error(`${path} omitted x-request-id`);
  console.log(JSON.stringify({ check: path, status: response.status, requestId: response.headers.get('x-request-id') }));
}
