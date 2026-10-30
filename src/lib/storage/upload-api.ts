import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { createR2Reader } from './r2';
import { isSafeObjectPath, isFileBucket } from './types';

const headers = { 'Cache-Control': 'private, no-store', Vary: 'Authorization', 'X-Content-Type-Options': 'nosniff' };
const reply = (status: number, error: string) => Response.json({ error }, { status, headers });
export async function handleTimetableUpload(request: Request, action: 'begin' | 'confirm') {
  if (process.env.R2_UPLOAD_ENABLED !== 'true') return reply(503, 'Nahrávání souborů není aktivní.');
  const token = request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/)?.[1];
  if (!token) return reply(401, 'Přihlášení je vyžadováno.');
  if (request.headers.get('sec-fetch-site') === 'cross-site') return reply(403, 'Přístup odepřen.');
  try {
    const reader = request.body?.getReader();
    if (!reader) return reply(400, 'Neplatný požadavek.');
    let size = 0, text = ''; const decoder = new TextDecoder();
    try {
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > 4096) { await reader.cancel(); return reply(413, 'Požadavek je příliš velký.'); }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
    } finally { reader.releaseLock(); }
    let body: Record<string, unknown>;
    try { body = JSON.parse(text); } catch { return reply(400, 'Neplatný požadavek.'); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return reply(400, 'Neplatný požadavek.');
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key || !serviceKey) return reply(503, 'Služba souborů není dostupná.');
    const authOptions = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };
    const user = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: authOptions });
    const { data: identity, error: authError } = await user.auth.getUser(token);
    if (authError || !identity.user) return reply(401, 'Přihlášení vypršelo.');
    const { data: profile, error: profileError } = await user.from('profiles').select('role,status,is_blocked').eq('id', identity.user.id).single();
    if (profileError || !profile || profile.role !== 'admin' || profile.status !== 'approved' || profile.is_blocked !== false) return reply(403, 'Přístup odepřen.');
    const bucket = body.bucket ?? 'jizdni-rady';
    if (!isFileBucket(bucket)) return reply(400, 'Neplatné úložiště.');
    const timetable = bucket === 'jizdni-rady';
    const r2 = createR2Reader();
    if (action === 'begin') {
      if (!Number.isSafeInteger(body.bytes) || (body.bytes as number) < 1 || (body.bytes as number) > 52428800 ||
          !(bucket === 'documents' ? ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] : timetable ? ['image/jpeg', 'application/pdf'] : ['image/jpeg']).includes(String(body.contentType))) return reply(400, 'Vyberte podporovaný soubor do 50 MB.');
      const { data: path, error } = await user.rpc(timetable ? 'begin_jizdni_rad_r2_upload' : 'begin_private_file_upload', { p_bytes: body.bytes, p_content_type: body.contentType, ...(!timetable ? { p_bucket: bucket, p_prefix: body.prefix ?? '' } : {}) });
      if (error || typeof path !== 'string' || !isSafeObjectPath(path)) return reply(503, 'Nahrání nelze připravit.');
      const upload = await r2.signedUploadUrl(bucket, path, body.contentType as string);
      return Response.json({ path, ...upload }, { headers });
    }
    if (!isSafeObjectPath(body.path)) return reply(400, 'Neplatná cesta souboru.');
    const { data: records, error } = await user.rpc(timetable ? 'inspect_jizdni_rad_r2_upload' : 'inspect_private_file_upload', { p_path: body.path, ...(!timetable ? { p_bucket: bucket } : {}) });
    if (error || !Array.isArray(records) || records.length !== 1) return reply(403, 'Nahrání není dostupné.');
    const object = await r2.head(bucket, body.path);
    if (object.bytes !== Number(records[0].expected_bytes) || object.contentType !== records[0].content_type || !object.etag) return reply(409, 'Nahraný soubor neodpovídá očekávaným údajům.');
    const service = createClient(url, serviceKey, { auth: authOptions });
    const receipt = await service.rpc(timetable ? 'verify_jizdni_rad_r2_upload' : 'verify_private_file_upload', {
      p_path: body.path, p_owner: identity.user.id, p_bytes: object.bytes, p_content_type: object.contentType, ...(timetable ? { p_etag: object.etag } : { p_bucket: bucket }),
    });
    if (receipt.error || receipt.data !== true) return reply(409, 'Nahrání vypršelo. Nahrajte soubor znovu.');
    return Response.json({ verified: true, path: body.path }, { headers });
  } catch { return reply(503, 'Soubor nyní nelze zpracovat.'); }
}
