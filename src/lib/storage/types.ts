export const FILE_BUCKETS = ['jizdni-rady', 'documents', 'dopravni-info', 'jidelni-listek', 'oznameni'] as const;
export type FileBucket = typeof FILE_BUCKETS[number];
export function isFileBucket(value: unknown): value is FileBucket {
  return typeof value === 'string' && FILE_BUCKETS.some(bucket => bucket === value);
}
export function isSafeObjectPath(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim() || value.length > 1024 || /[\u0000-\u001f\u007f\\?#:]/.test(value)) return false;
  return value.split('/').every(segment => {
    if (!segment || segment === '.' || segment === '..') return false;
    try {
      let decoded = segment;
      for (let i = 0; i < 3; i++) {
        const next = decodeURIComponent(decoded);
        if (next === decoded) break;
        decoded = next;
      }
      return !decoded.includes('%') && decoded !== '.' && decoded !== '..' && !/[\u0000-\u001f\u007f\\/]/.test(decoded);
    } catch { return false; }
  });
}
