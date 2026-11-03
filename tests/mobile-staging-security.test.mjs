import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const script = 'scripts/verify-mobile-staging-env.mjs';

function check(overrides = {}) {
  const env = {
    PATH: process.env.PATH ?? '',
    DPMOST_DEPLOY_TARGET: 'mobile-staging',
    DPMOST_STAGING_SUPABASE_REF: 'abcdefghijklmnopqrst',
    NEXT_PUBLIC_SUPABASE_URL:
      'https://abcdefghijklmnopqrst.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_test_only',
    R2_ACCOUNT_ID: '0123456789abcdef0123456789abcdef',
    R2_BUCKET_NAME: 'dpmost-mobile-staging',
    R2_ACCESS_KEY_ID: 'test-only-id',
    R2_SECRET_ACCESS_KEY: 'test-only-secret',
    R2_READ_ENABLED: 'true',
    R2_UPLOAD_ENABLED: 'false',
    R2_DELETE_ENABLED: 'false',
    ...overrides,
  };

  return spawnSync(process.execPath, [script], {
    env,
    encoding: 'utf8',
  });
}

test('správná testovací staging konfigurace projde', () => {
  const result = check();
  assert.equal(result.status, 0, result.stderr);
});

test('produkční Supabase je odmítnuta', () => {
  const result = check({
    DPMOST_STAGING_SUPABASE_REF: 'pxhdbjctgnaarijmkmfq',
    NEXT_PUBLIC_SUPABASE_URL:
      'https://pxhdbjctgnaarijmkmfq.supabase.co',
  });
  assert.notEqual(result.status, 0);
});

test('nesoulad Supabase projektu je odmítnut', () => {
  const result = check({
    DPMOST_STAGING_SUPABASE_REF: 'bbbbbbbbbbbbbbbbbbbb',
  });
  assert.notEqual(result.status, 0);
});

test('produkční R2 bucket je odmítnut', () => {
  const result = check({
    R2_BUCKET_NAME: 'mhd-portal-private',
  });
  assert.notEqual(result.status, 0);
});

test('jiný než staging bucket je odmítnut', () => {
  const result = check({
    R2_BUCKET_NAME: 'dpmost-private',
  });
  assert.notEqual(result.status, 0);
});

test('produkční režim nasazení je odmítnut', () => {
  const result = check({
    DPMOST_DEPLOY_TARGET: 'production',
  });
  assert.notEqual(result.status, 0);
});

test('povolený upload je odmítnut', () => {
  const result = check({
    R2_UPLOAD_ENABLED: 'true',
  });
  assert.notEqual(result.status, 0);
});

test('povolené mazání je odmítnuto', () => {
  const result = check({
    R2_DELETE_ENABLED: 'true',
  });
  assert.notEqual(result.status, 0);
});

test('chybějící R2 klíč je odmítnut', () => {
  const result = check({
    R2_SECRET_ACCESS_KEY: '',
  });
  assert.notEqual(result.status, 0);
});

test('tajný Supabase klíč nesmí být veřejný', () => {
  const result = check({
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_secret_test_only',
  });
  assert.notEqual(result.status, 0);
});
