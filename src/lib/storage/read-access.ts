import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FileBucket } from './types';

/** User-scoped client only. Every metadata query retains the user's RLS identity. */
export async function canReadPrivateFile(client: SupabaseClient, userId: string, bucket: FileBucket, path: string): Promise<boolean> {
  const { data: profile, error } = await client.from('profiles')
    .select('role,status,is_blocked').eq('id', userId).single();
  if (error || !profile || profile.status !== 'approved' || profile.is_blocked !== false) return false;
  const admin = profile.role === 'admin';
  if (bucket === 'documents') {
    // Mirror the existing Storage gate as well as metadata RLS.
    if (!admin && !path.startsWith('shared/')) return false;
    const { data, error } = await client.from('documents').select('id')
      .eq('file_path', path).limit(1).maybeSingle();
    return !error && data !== null;
  }
  if (bucket === 'jizdni-rady') {
    const { data, error } = await client.from('jizdni_rady').select('id')
      .eq('image_path', path).limit(1).maybeSingle();
    return !error && data !== null;
  }
  if (bucket === 'dopravni-info') {
    // Cutover normalizes existing URL arrays into relative object paths.
    const { data, error } = await client.from('dopravni_info').select('id')
      .contains('images', [path]).limit(1).maybeSingle();
    return !error && data !== null;
  }
  if (path.startsWith('r2/')) {
    const { data, error } = await client.from('app_config').select('id,is_visible')
      .eq('file_path', path).limit(1).maybeSingle();
    return !error && data !== null && (bucket === 'oznameni' ? ['dulezite_upozorneni'] : ['jidelni_listek', 'jidelni_listek_priprava']).includes(data.id) && (admin || data.is_visible === true);
  }
  const configId = bucket === 'oznameni' ? (path === 'upozorneni.jpg' ? 'dulezite_upozorneni' : null)
    : path === 'aktualni_menu.jpg' ? 'jidelni_listek'
    : path === 'nasledujici_menu.jpg' ? 'jidelni_listek_priprava' : null;
  if (!configId) return false;
  const { data, error: configError } = await client.from('app_config')
    .select('is_visible,file_path').eq('id', configId).maybeSingle();

  // Legacy files are accessible only while no replacement is configured.
  if (configError || !data) return false;

  const hasReplacement =
    typeof data.file_path === 'string' &&
    data.file_path.trim().length > 0;

  if (hasReplacement) return false;

  return admin || data.is_visible === true;
}
