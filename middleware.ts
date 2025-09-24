import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

import type { Database } from "@/types/database";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient<Database>({ req, res });

  const {
    data: { session: initialSession }
  } = await supabase.auth.getSession();

  let hasValidUser = false;

  if (initialSession) {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (user && !error) {
      hasValidUser = true;
    }
  }

  if (!hasValidUser && req.nextUrl.pathname.startsWith("/dashboard")) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectTo", req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl, { headers: res.headers });
  }

  if (hasValidUser && req.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url), {
      headers: res.headers
    });
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"]
};
