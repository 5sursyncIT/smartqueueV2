import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pages publiques (auth)
  if (pathname.startsWith('/login')) {
    return NextResponse.next();
  }

  // Pour le développement, on simplifie la vérification d'authentification
  // La protection réelle se fait côté client via les composants et layouts
  // En production, vous devriez implémenter une vérification JWT via cookie httpOnly

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
