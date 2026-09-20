import { proxy } from './src/proxy';

export default proxy;
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
