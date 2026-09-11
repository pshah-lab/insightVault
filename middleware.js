import { NextResponse } from "next/server";

/**
 * Next.js Edge Middleware for API Perimeter Security
 *
 * If `VAULT_ACCESS_TOKEN` is configured in the environment:
 * Protects all `/api/*` endpoints from unauthorized internet callers.
 * Callers must provide:
 * 1. An 'Authorization: Bearer <token>' header, or
 * 2. A 'vault_token' cookie, or
 * 3. An 'x-vault-token' header
 *
 * If `VAULT_ACCESS_TOKEN` is unset:
 * Permits local single-tenant development while logging a setup hint.
 */
export function middleware(req) {
  const { pathname } = req.nextUrl;

  // Only apply guard to API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const expectedToken = process.env.VAULT_ACCESS_TOKEN?.trim();

  // If no token is configured, allow single-tenant local dev
  if (!expectedToken) {
    return NextResponse.next();
  }

  // Check Bearer token in Authorization header
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  // Check custom header
  const customHeaderToken = req.headers.get("x-vault-token")?.trim();

  // Check cookie
  const cookieToken = req.cookies.get("vault_token")?.value?.trim();

  const providedToken = bearerToken || customHeaderToken || cookieToken;

  if (providedToken && providedToken === expectedToken) {
    return NextResponse.next();
  }

  return NextResponse.json(
    {
      success: false,
      error: "Unauthorized: Invalid or missing vault access token.",
      message: "Please provide a valid token via Authorization header or x-vault-token.",
    },
    { status: 401 }
  );
}

export const config = {
  matcher: ["/api/:path*"],
};
