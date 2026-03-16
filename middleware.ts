import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

// Apply security headers
function addSecurityHeaders(response: NextResponse) {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')
  
  // Enable XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Content Security Policy - relaxed for OAuth and external APIs
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://github.com; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https: wss:; frame-src https://accounts.google.com https://github.com; object-src 'none';"
  )
  
  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(self), microphone=(self), geolocation=()'
  )
  
  // Strict Transport Security
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  
  return response
}

export const middleware = withAuth(
  function middleware(request) {
    // Skip auth middleware for NextAuth routes, public auth pages, and API routes that don't need auth
    if (
      request.nextUrl.pathname.startsWith('/api/auth') ||
      request.nextUrl.pathname.startsWith('/auth') ||
      request.nextUrl.pathname === '/'
    ) {
      // Still apply security headers but skip auth check
      const response = NextResponse.next()
      return addSecurityHeaders(response)
    }

    // For protected routes, apply security headers
    const response = NextResponse.next()
    return addSecurityHeaders(response)
  },
  {
    pages: {
      signIn: '/auth',
    },
  }
)

export const config = {
  matcher: [
    '/chat/:path*',
    '/auth/:path*',
    '/api/:path*',
    '/',
  ]
}
