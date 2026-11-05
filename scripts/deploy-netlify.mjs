// Requires Node.js 22.16+ and the Netlify CLI (netlify login).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const siteId = '595475d6-dc41-4145-9e35-278c0da44d06';
const production = process.argv.includes('--prod');
assert(process.argv.slice(2).every(a => a === '--prod'), 'Supported option: --prod');
const configPath = path.resolve('.env.deploy.local');
const config = parseEnv(fs.readFileSync(configPath, 'utf8'));
assert.equal(fs.statSync(configPath).mode & 0o077, 0, 'Run chmod 600 .env.deploy.local');
assert.equal(config.NEXT_PUBLIC_SUPABASE_URL, 'https://pxhdbjctgnaarijmkmfq.supabase.co');
assert.equal(config.R2_BUCKET_NAME, 'mhd-portal-private');
for (const k of ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']) assert(config[k], `Missing ${k}`);
const redact = s => Object.values(config).filter(v => v.length > 15).reduce((text, v) => text.split(v).join('[REDACTED]'), s);
function run(args, env = process.env) {
  const r = spawnSync('netlify', args, { env, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (r.status !== 0) { console.error(redact((r.stdout ?? '') + (r.stderr ?? ''))); throw new Error('Netlify command failed. If publication had started, check the live site and deploy history.'); }
  return r.stdout;
}
const site = JSON.parse(run(['api', 'getSite', '--data', JSON.stringify({ site_id: siteId })]));
assert.equal(site.id, siteId);
assert.equal(site.ssl_url, 'https://dpmost.netlify.app');
assert.equal(site.build_settings.repo_url.replace(/\.git$/, ''), 'https://github.com/blackholedj/MHD-Portal-New');
console.log('Target: https://dpmost.netlify.app; site ID:', siteId);
console.log('Previous published deploy:', site.published_deploy?.id);
console.log('Building current source. This can take a minute.');
const buildEnv = { ...process.env, ...config, NETLIFY_SITE_ID: siteId, R2_UPLOAD_ENABLED: 'false' };
console.log(redact(run(['build', '--context', 'production'], buildEnv)));
// netlify.toml explicitly retains the image redirect for --no-build deploys.
const args = ['deploy', '--no-build', '--dir', path.resolve('.netlify/static'), '--site', siteId, '--json', '--message', 'MHD Portal controlled release'];
for (const k of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_R2_ENABLED', 'R2_READ_ENABLED', 'R2_UPLOAD_ENABLED']) args.push('--env', `${k}=${config[k]}`);
for (const k of ['R2_ACCOUNT_ID', 'R2_BUCKET_NAME', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']) args.push('--secret-env', `${k}=${config[k]}`);
console.log('Uploading draft to the existing site.');
const draft = JSON.parse(run(args));
assert.equal(draft.site_id, siteId);
const assets = fs.readdirSync('.netlify/static/_next/static/chunks/app/user-portal/tables').filter(f => f.endsWith('.js')).map(f => '/_next/static/chunks/app/user-portal/tables/' + f);
async function verify(base) {
  for (const p of ['/login', '/images/logo-dpmost.png', '/_next/image?url=%2Fimages%2Flogo-dpmost.png&w=256&q=75']) {
    const r = await fetch(base + p); assert.equal(r.status, 200, `${base}${p}`);
    if (p.includes('logo-dpmost')) assert(r.headers.get('content-type')?.startsWith('image/'), 'Image response required');
  }
  for (const p of assets) {
    const r = await fetch(base + p); assert.equal(r.status, 200);
    assert(Buffer.from(await r.arrayBuffer()).equals(fs.readFileSync('.netlify/static' + p)), 'Published asset differs from current build');
  }
  const protectedPage = await fetch(base + '/user-portal/tables', { redirect: 'manual' });
  assert.equal(protectedPage.status, 307); assert.equal(protectedPage.headers.get('location'), '/login');
  for (const p of ['read-url', 'upload', 'confirm-upload']) {
    const r = await fetch(base + '/api/files/' + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(r.status, 401, 'Unauthenticated file endpoint must be protected');
  }
}
await verify(draft.deploy_url);
console.log('Draft checks passed:', draft.deploy_url);
if (production) {
  const current = JSON.parse(run(['api', 'getSite', '--data', JSON.stringify({ site_id: siteId })]));
  assert.equal(current.published_deploy?.id, site.published_deploy?.id, 'Production changed during build; inspect before publishing.');
  const published = JSON.parse(run(['api', 'restoreSiteDeploy', '--data', JSON.stringify({ site_id: siteId, deploy_id: draft.deploy_id })]));
  assert.equal(published.id, draft.deploy_id); assert.equal(published.state, 'ready');
  await verify('https://dpmost.netlify.app');
  console.log('Production verified: https://dpmost.netlify.app; deploy:', draft.deploy_id);
} else console.log('Production unchanged. To build, verify and publish: npm run deploy:production');
