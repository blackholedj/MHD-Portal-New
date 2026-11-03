import assert from 'node:assert/strict';

const env = process.env;

// Produkční identifikátor převzatý z aktuálního
// ověřovacího skriptu webového projektu.
const PRODUCTION_SUPABASE_REF = 'pxhdbjctgnaarijmkmfq';

const target = env.DPMOST_DEPLOY_TARGET;
const local = target === 'mobile-local';

assert.ok(
  local || target === 'mobile-staging',
  'Nepovoleny rezim nasazeni.',
);

const configuredUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? '';

if (local) {
  assert.equal(
    configuredUrl,
    'http://127.0.0.1:57321',
    'Lokalni rezim smi pouzit pouze Docker Supabase.',
  );
} else {
  const url = new URL(configuredUrl);
  const expectedRef = env.DPMOST_STAGING_SUPABASE_REF ?? '';

  assert.match(url.hostname, /^[a-z0-9]{20}\.supabase\.co$/);
  assert.equal(url.protocol, 'https:');
  assert.match(expectedRef, /^[a-z0-9]{20}$/);
  assert.notEqual(expectedRef, PRODUCTION_SUPABASE_REF);
  assert.equal(url.hostname, `${expectedRef}.supabase.co`);
}

const publicKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

assert.ok(
  publicKey &&
  !publicKey.startsWith('sb_secret_') &&
  !publicKey.startsWith('sb_service_role_'),
  'Vyžaduje se veřejný Supabase klíč.',
);

if (publicKey.startsWith('eyJ')) {
  const payload = publicKey.split('.')[1];

  assert.ok(payload, 'Neplatný Supabase JWT klíč.');

  const claims = JSON.parse(
    Buffer.from(payload, 'base64url').toString(),
  );

  if (!local) {
    assert.equal(
      claims.ref,
      new URL(configuredUrl).hostname.split('.')[0],
      'Supabase klíč neodpovídá staging projektu.',
    );
  }

  assert.equal(
    claims.role,
    'anon',
    'Vyžaduje se anon klíč.',
  );
}

const bucket = env.R2_BUCKET_NAME ?? '';

assert.match(
  bucket,
  /^[a-z0-9][a-z0-9.-]*-staging$/,
  'R2 bucket musí mít vyhrazený staging název.',
);

assert.notEqual(
  bucket,
  'mhd-portal-private',
  'Produkční R2 bucket je zakázaný.',
);

assert.match(
  env.R2_ACCOUNT_ID ?? '',
  /^[a-f0-9]{32}$/i,
  'Neplatný R2 account ID.',
);

assert.ok(
  env.R2_ACCESS_KEY_ID &&
  env.R2_SECRET_ACCESS_KEY,
  'Chybí serverové R2 přístupové údaje.',
);

assert.notEqual(
  env.R2_UPLOAD_ENABLED,
  'true',
  'Staging API nesmí povolit upload.',
);

assert.notEqual(
  env.R2_DELETE_ENABLED,
  'true',
  'Staging API nesmí povolit mazání.',
);

for (const name of Object.keys(env)) {
  assert.ok(
    !(
      name.startsWith('NEXT_PUBLIC_') &&
      /SECRET|SERVICE_ROLE|PASSWORD|ACCESS_KEY/.test(name)
    ),
    'Citlivé údaje nesmí být veřejné.',
  );
}

console.log(
  'OK: Staging konfigurace splňuje základní bezpečnostní podmínky.',
);
