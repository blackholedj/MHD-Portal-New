// This project now backs production. The historical filename does not imply staging isolation.
import assert from 'node:assert/strict';
const ref = 'pxhdbjctgnaarijmkmfq';
assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').origin, `https://${ref}.supabase.co`, 'Known project URL required');
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
assert(key && !key.startsWith('sb_secret_'), 'Public Supabase key required');
if (key.startsWith('eyJ')) {
  const claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
  assert.equal(claims.ref, ref, 'Known project public key required');
  assert.equal(claims.role, 'anon', 'Only anon key may be public');
}
for (const name of Object.keys(process.env)) {
  assert(!(name.startsWith('NEXT_PUBLIC_') && /SECRET|SERVICE_ROLE|PASSWORD|ACCESS_KEY/.test(name)), 'Secret must not use a public variable');
}
assert.notEqual(process.env.R2_UPLOAD_ENABLED, 'true', 'This staging candidate keeps uploads disabled');
console.log('Known project and public-variable checks passed; this does not establish staging isolation');
