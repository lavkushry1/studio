import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose'; // Using jose for JWT verification on edge

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'your_access_token_secret'; // Ensure this matches backend

interface AccessTokenPayload {
  userId: string;
  role: string;
  // iat: number; // Issued at
  // exp: number; // Expiration time
}

// Function to verify JWT on the edge
async function verifyToken(token: string): Promise<AccessTokenPayload | null> {
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(ACCESS_TOKEN_SECRET);
    const { payload } = await jwtVerify<AccessTokenPayload>(token, secret);
    return payload;
  } catch (error) {
    console.error('Token verification failed in middleware:', error);
    return null;
  }
}

// Define paths that require authentication
const protectedPaths = ['/my-bookings', '/profile', '/checkout']; // Add paths like /checkout
const adminPaths = ['/admin']; // Add paths requiring admin role

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('accessToken')?.value; // Check cookies first

  // Check if the path requires authentication
  const isProtected = protectedPaths.some(path => pathname.startsWith(path)) ||
                      adminPaths.some(path => pathname.startsWith(path));

  if (isProtected) {
    const payload = await verifyToken(accessToken || '');

    if (!payload) {
      // If no valid token, redirect to login page
      // Preserve the intended destination for redirect after login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname); // Pass redirect path
      return NextResponse.redirect(loginUrl);
    }

    // Check for admin routes
    const isAdminPath = adminPaths.some(path => pathname.startsWith(path));
    if (isAdminPath && payload.role !== 'ADMIN') {
       // If user is not admin, redirect to a 'forbidden' page or home
       console.warn(`User ${payload.userId} attempted to access admin path ${pathname} without ADMIN role.`);
       return NextResponse.redirect(new URL('/events', request.url)); // Redirect to events page
    }
  }

  // If authenticated and trying to access login/signup, redirect away
  if ((pathname === '/login' || pathname === '/signup') && accessToken) {
     const payload = await verifyToken(accessToken);
     if (payload) {
          console.log("Authenticated user trying to access login/signup, redirecting...");
         return NextResponse.redirect(new URL('/events', request.url)); // Redirect to events page
     }
  }

  // Allow the request to proceed
  return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (public image folder if you have one)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images).*)',
  ],
};

// Note: Using cookies (accessToken) for middleware checks is simpler on the edge than localStorage.
// Your client-side auth context (`useAuth`) should still use localStorage for persistence
// and potentially synchronize the cookie when tokens change. This might require additional logic
// in your `AuthProvider` to set/remove cookies upon login/logout/refresh.
