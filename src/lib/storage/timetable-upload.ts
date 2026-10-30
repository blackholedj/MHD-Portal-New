import { supabase } from '@/lib/supabase/client';

/** Uses the R2 route only after the complete release is explicitly enabled. */
export async function uploadTimetableFile(blob: Blob, contentType: string): Promise<string> {
  if (process.env.NEXT_PUBLIC_R2_ENABLED !== 'true') {
    const { data: path, error: registrationError } = await supabase.rpc('begin_jizdni_rad_upload', {
      p_extension: contentType === 'image/jpeg' ? 'jpg' : 'pdf',
    });
    if (registrationError || typeof path !== 'string' || !path) throw new Error('Nepodařilo se připravit nahrání souboru.');
    const { error } = await supabase.storage.from('jizdni-rady').upload(path, blob, { cacheControl: '3600', upsert: false, contentType });
    if (error) throw new Error('Nepodařilo se nahrát soubor.');
    return path;
  }
  return uploadR2File('jizdni-rady', blob, contentType);
}

export async function uploadR2File(bucket: 'jizdni-rady' | 'documents' | 'dopravni-info' | 'jidelni-listek' | 'oznameni', blob: Blob, contentType: string, prefix = ''): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Přihlaste se znovu.');
  const headers = { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' };
  const begin = await fetch('/api/files/upload', { method: 'POST', headers, body: JSON.stringify({ bucket, bytes: blob.size, contentType, prefix }), cache: 'no-store' });
  if (!begin.ok) throw new Error('Nepodařilo se připravit nahrání souboru.');
  const upload = await begin.json();
  const target = new URL(upload.url);
  if (target.protocol !== 'https:' || !/^[a-f0-9]{32}\.r2\.cloudflarestorage\.com$/.test(target.hostname) ||
      typeof upload.path !== 'string' || upload.headers?.['If-None-Match'] !== '*') throw new Error('Neplatná odpověď služby souborů.');
  const put = await fetch(target, { method: 'PUT', headers: upload.headers, body: blob });
  if (!put.ok) throw new Error('Nepodařilo se nahrát soubor. Nahrajte jej znovu.');
  const confirmed = await fetch('/api/files/confirm-upload', { method: 'POST', headers, body: JSON.stringify({ bucket, path: upload.path }), cache: 'no-store' });
  if (!confirmed.ok) throw new Error('Nahrání nebylo ověřeno. Nahrajte soubor znovu.');
  const receipt = await confirmed.json();
  if (receipt.verified !== true || receipt.path !== upload.path) throw new Error('Nahrání nebylo ověřeno.');
  return upload.path;
}
