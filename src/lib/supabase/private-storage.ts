import { supabase } from '@/lib/supabase/client';

/** Convert a legacy Supabase public URL or a stored relative path into a storage path.
 * Reject unrelated URLs and traversal segments; never use as authorization.
 */
export function resolvePrivateStoragePath(value: string, bucket: string): string | null {
  if (!value || !bucket) return null;
  let path = value;
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const marker = `/storage/v1/object/public/${bucket}/`;
      const index = url.pathname.indexOf(marker);
      if (index < 0) return null;
      path = decodeURIComponent(url.pathname.slice(index + marker.length));
    } catch { return null; }
  }
  path = path.replace(/^\/+/, '');
  if (!path || path.split('/').some(part => part === '..' || part === '.' || !part)) return null;
  return path;
}

export function extractLegacyObjectPath(value: string, bucket: string): string {
  const path = resolvePrivateStoragePath(value, bucket);
  if (!path) throw new Error('Neplatná cesta k souboru.');
  return path;
}

/** A signed URL is a bearer token until it expires. Storage policies must enforce access at signing time. */
export async function getPrivateFileUrl(
  bucket: 'documents' | 'jizdni-rady' | 'jidelni-listek' | 'dopravni-info' | 'oznameni',
  objectPath: string,
  expiresInSeconds = 300,
): Promise<string> {
  const path = resolvePrivateStoragePath(objectPath, bucket);
  if (!path) throw new Error('Neplatná cesta k souboru.');
  if (process.env.NEXT_PUBLIC_R2_ENABLED === 'true') {
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session.session?.access_token) throw new Error('Přihlaste se znovu.');
    const response = await fetch('/api/files/read-url', {
      method: 'POST', cache: 'no-store',
      headers: { Authorization: `Bearer ${session.session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket, path }),
    });
    if (!response.ok) throw new Error('Soubor nyní nelze zpřístupnit.');
    const result = await response.json();
    if (typeof result.signedUrl !== 'string') throw new Error('Neplatná odpověď služby souborů.');
    const target = new URL(result.signedUrl);
    if (target.protocol !== 'https:' || !/^[a-f0-9]{32}\.r2\.cloudflarestorage\.com$/.test(target.hostname)) throw new Error('Neplatný odkaz souboru.');
    return result.signedUrl;
  }
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? 'Nepodařilo se získat soubor.');
  return data.signedUrl;
}
