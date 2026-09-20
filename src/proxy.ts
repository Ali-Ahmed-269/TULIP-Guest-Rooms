import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function copyCookies(source: NextResponse, target: NextResponse): NextResponse {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie.name, cookie.value, cookie);
  });
  return target;
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh auth session token on every request (per @supabase/ssr docs)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();

  // Guard admin API routes
  if (url.pathname.startsWith('/api/admin')) {
    if (!user) {
      const unauthorizedResponse = NextResponse.json(
        { success: false, message: 'Unauthorized access.' },
        { status: 401 }
      );
      return copyCookies(supabaseResponse, unauthorizedResponse);
    }
    return supabaseResponse;
  }

  // Guard admin page routes
  if (url.pathname.startsWith('/admin')) {
    if (url.pathname === '/admin/login') {
      if (user) {
        url.pathname = '/admin/dashboard';
        return copyCookies(supabaseResponse, NextResponse.redirect(url));
      }
      return supabaseResponse;
    }

    if (!user) {
      url.pathname = '/admin/login';
      return copyCookies(supabaseResponse, NextResponse.redirect(url));
    }

    // Default /admin access redirects to dashboard
    if (url.pathname === '/admin') {
      url.pathname = '/admin/dashboard';
      return copyCookies(supabaseResponse, NextResponse.redirect(url));
    }
  }

  return supabaseResponse;
}

export { proxy as middleware };

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Static asset file extensions (images, fonts, styles, scripts)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|ico|css|js)$).*)',
  ],
};
