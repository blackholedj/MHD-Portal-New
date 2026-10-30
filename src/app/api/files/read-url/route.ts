import { createClient } from '@supabase/supabase-js';
import { canReadPrivateFile } from '@/lib/storage/read-access';
import { createR2Reader } from '@/lib/storage/r2';
import { isFileBucket, isSafeObjectPath } from '@/lib/storage/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', 'Vary': 'Authorization', 'X-Content-Type-Options': 'nosniff' };
const reply = (status: number, body: object) => Response.json(body, { status, headers });

export async function POST(request: Request) {
  // Until migration and live R2 validation are complete, the endpoint stays disabled.
  if (process.env.R2_READ_ENABLED !== 'true') return reply(503, { error: 'Služba souborů není aktivní.' });
  const token = request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/)?.[1];
  if (!token) return reply(401, { error: 'Přihlášení je vyžadováno.' });
  if (request.headers.get('sec-fetch-site') === 'cross-site') return reply(403, { error: 'Přístup odepřen.' });
  try {
    // Bounded parsing also protects requests without a Content-Length header.
    const reader = request.body?.getReader();
    if (!reader) return reply(400, { error: 'Neplatný požadavek.' });
    const decoder = new TextDecoder(); let text = '', size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > 4096) { await reader.cancel(); return reply(413, { error: 'Požadavek je příliš velký.' }); }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
    } finally { reader.releaseLock(); }
    let body: unknown;
    try { body = JSON.parse(text); } catch { return reply(400, { error: 'Neplatný požadavek.' }); }
    if (!body || typeof body !== 'object' || !('bucket' in body) || !('path' in body) ||
        !isFileBucket(body.bucket) || !isSafeObjectPath(body.path)) return reply(400, { error: 'Neplatná cesta souboru.' });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return reply(503, { error: 'Služba souborů není dostupná.' });
    const client = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return reply(401, { error: 'Přihlášení vypršelo.' });
    if (!await canReadPrivateFile(client, data.user.id, body.bucket, body.path)) return reply(403, { error: 'Přístup odepřen.' });
    const signedUrl = await createR2Reader().signedReadUrl(body.bucket, body.path);
    return reply(200, { signedUrl, expiresIn: 60 });
  } catch {
    // Never return credentials, tokens, SDK errors or presigned URLs in diagnostics.
    return reply(503, { error: 'Soubor nyní nelze zpřístupnit.' });
  }
}
