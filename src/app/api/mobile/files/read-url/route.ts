import { createClient } from '@supabase/supabase-js';

import { canReadPrivateFile } from '@/lib/storage/read-access';
import { createR2Reader } from '@/lib/storage/r2';
import { isSafeObjectPath } from '@/lib/storage/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const responseHeaders = {
  'Cache-Control': 'private, no-store',
  'Vary': 'Authorization',
  'X-Content-Type-Options': 'nosniff',
};

function reply(status: number, body: object) {
  return Response.json(body, {
    status,
    headers: responseHeaders,
  });
}

function stagingIsConfigured(): boolean {
  const env = process.env;

  if (
    env.DPMOST_DEPLOY_TARGET !== 'mobile-staging' ||
    env.R2_READ_ENABLED !== 'true' ||
    env.R2_UPLOAD_ENABLED === 'true' ||
    env.R2_DELETE_ENABLED === 'true'
  ) {
    return false;
  }

  const expectedRef = env.DPMOST_STAGING_SUPABASE_REF;

  if (
    !expectedRef ||
    !/^[a-z0-9]{20}$/.test(expectedRef) ||
    expectedRef === 'pxhdbjctgnaarijmkmfq'
  ) {
    return false;
  }

  if (
    env.NEXT_PUBLIC_SUPABASE_URL !==
    `https://${expectedRef}.supabase.co`
  ) {
    return false;
  }

  const bucket = env.R2_BUCKET_NAME ?? '';

  if (
    !/^[a-z0-9][a-z0-9.-]*-staging$/.test(bucket) ||
    bucket === 'mhd-portal-private'
  ) {
    return false;
  }

  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    env.R2_ACCOUNT_ID &&
    env.R2_ACCESS_KEY_ID &&
    env.R2_SECRET_ACCESS_KEY
  );
}

async function readBoundedBody(request: Request): Promise<
  | { ok: true; value: unknown }
  | { ok: false; status: number }
> {
  if (
    !request.headers
      .get('content-type')
      ?.toLowerCase()
      .startsWith('application/json')
  ) {
    return { ok: false, status: 415 };
  }

  const reader = request.body?.getReader();

  if (!reader) {
    return { ok: false, status: 400 };
  }

  const decoder = new TextDecoder();
  let text = '';
  let bytes = 0;

  try {
    while (true) {
      const { value, done } = await reader.read();

      if (done) break;

      bytes += value.byteLength;

      if (bytes > 4096) {
        await reader.cancel();
        return { ok: false, status: 413 };
      }

      text += decoder.decode(value, { stream: true });
    }

    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  try {
    return {
      ok: true,
      value: JSON.parse(text),
    };
  } catch {
    return { ok: false, status: 400 };
  }
}

export async function POST(request: Request) {
  // Runtime ochrana: nestačí kontrola při buildu.
  if (!stagingIsConfigured()) {
    return reply(503, {
      error: 'Staging služba není připravena.',
    });
  }

  const authorization = request.headers.get('authorization');

  const token = authorization
    ?.match(/^Bearer ([^\s]+)$/)?.[1];

  if (!token) {
    return reply(401, {
      error: 'Přihlášení je vyžadováno.',
    });
  }

  if (
    request.headers.get('sec-fetch-site') === 'cross-site'
  ) {
    return reply(403, {
      error: 'Přístup odepřen.',
    });
  }

  try {
    const parsed = await readBoundedBody(request);

    if (!parsed.ok) {
      return reply(parsed.status, {
        error: 'Neplatný požadavek.',
      });
    }

    const body = parsed.value;

    if (
      body === null ||
      typeof body !== 'object' ||
      Array.isArray(body)
    ) {
      return reply(400, {
        error: 'Neplatná data.',
      });
    }

    const input = body as Record<string, unknown>;

    // První fáze Androidu povoluje jen jízdní řády.
    if (
      input.bucket !== 'jizdni-rady' ||
      !isSafeObjectPath(input.path)
    ) {
      return reply(400, {
        error: 'Neplatná cesta jízdního řádu.',
      });
    }

    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );

    const { data: userData, error: userError } =
      await client.auth.getUser(token);

    if (userError || !userData.user) {
      return reply(401, {
        error: 'Přihlášení není platné.',
      });
    }

    const allowed = await canReadPrivateFile(
      client,
      userData.user.id,
      'jizdni-rady',
      input.path,
    );

    if (!allowed) {
      return reply(403, {
        error: 'K souboru nemáte přístup.',
      });
    }

    const signedUrl = await createR2Reader()
      .signedReadUrl('jizdni-rady', input.path);

    return reply(200, {
      signedUrl,
      expiresIn: 60,
    });
  } catch {
    return reply(503, {
      error: 'Soubor nyní nelze zpřístupnit.',
    });
  }
}
