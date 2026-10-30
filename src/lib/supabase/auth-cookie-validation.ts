/** Validate the complete encoded session, not individual transport chunks. */
export function validateAuthCookieEncoding(
  cookies: Array<{ name: string; value: string }>, prefix: string,
): void {
  const exact = cookies.find(cookie => cookie.name === prefix);
  const chunks = cookies.filter(cookie => cookie.name.startsWith(prefix + '.'));
  let value = exact?.value;
  if (!exact && chunks.length) {
    const ordered = chunks.map(cookie => {
      const suffix = cookie.name.slice(prefix.length + 1);
      if (!/^(0|[1-9][0-9]*)$/.test(suffix)) throw new Error('Invalid session chunk');
      return { index: Number(suffix), value: cookie.value };
    }).sort((a, b) => a.index - b.index);
    if (ordered.some((chunk, index) => chunk.index !== index)) throw new Error('Missing session chunk');
    value = ordered.map(chunk => chunk.value).join('');
  }
  if (!value?.startsWith('base64-')) return;
  const encoded = value.slice('base64-'.length);
  if (!/^[A-Za-z0-9_-]*$/.test(encoded)) throw new Error('Malformed base64url');
  const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const decoded = atob(padded);
  const bytes = Uint8Array.from(decoded, character => character.charCodeAt(0));
  new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}
