import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.redirect(new URL('/login?error=oauth_callback', request.url));
  const response = NextResponse.redirect(new URL('/user-portal/tables', request.url));
  response.headers.set('Cache-Control', 'private, no-store');
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => values.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    } },
  );
  const { error } = await client.auth.exchangeCodeForSession(code);
  if (error) {
    const failed = NextResponse.redirect(new URL('/login?error=oauth_callback', request.url));
    failed.headers.set('Cache-Control', 'private, no-store');
    return failed;
  }
  return response;
}
