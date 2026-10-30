import { validateAuthCookieEncoding } from '@/lib/supabase/auth-cookie-validation';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Reject malformed UTF-8 in encoded Supabase session cookies
  // before initializing the SSR authentication client.
  const storageHost = new URL(
    process.env.NEXT_PUBLIC_SUPABASE_URL!
  ).hostname.split('.')[0];

  const authCookiePrefix = `sb-${storageHost}-auth-token`;

  try {
    validateAuthCookieEncoding(request.cookies.getAll(), authCookiePrefix);
  } catch {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    const result = NextResponse.redirect(url);
    result.headers.set('Cache-Control', 'private, no-store');
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name === authCookiePrefix || cookie.name.startsWith(authCookiePrefix + '.')) {
        result.cookies.set(cookie.name, '', { path: '/', maxAge: 0 });
      }
    }
    return result;
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const redirect = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = '';

    const result = NextResponse.redirect(url);

    response.cookies.getAll().forEach((cookie) => {
      result.cookies.set(cookie);
    });

    for (const header of ['cache-control', 'expires', 'pragma']) {
      const value = response.headers.get(header);
      if (value) result.headers.set(header, value);
    }

    result.headers.set('Cache-Control', 'private, no-store');
    return result;
  };

  const { data: authData, error: authError } =
    await supabase.auth.getUser();

  if (authError || !authData.user) {
    return redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role,status,is_blocked')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profile) {
    return redirect('/pending-info');
  }

  if (profile.is_blocked || profile.status === 'blocked') {
    return redirect('/blocked');
  }

  if (
    profile.status !== 'approved' ||
    (profile.role !== 'user' && profile.role !== 'admin')
  ) {
    return redirect('/pending-info');
  }

  if (
    request.nextUrl.pathname.startsWith('/admin/') ||
    request.nextUrl.pathname === '/admin'
  ) {
    if (profile.role !== 'admin') {
      return redirect('/');
    }
  }

  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = {
  matcher: ['/user-portal/:path*', '/admin/:path*'],
};
