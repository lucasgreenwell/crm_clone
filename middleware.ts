import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_PATHS = ["/login", "/signup", "/auth/callback"]

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const isPublicPath = PUBLIC_PATHS.includes(req.nextUrl.pathname)

  // Handle root path
  if (req.nextUrl.pathname === "/") {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    // Get user's role and redirect accordingly
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', session.user.id)
      .single()

    if (profile?.role === 'customer') {
      return NextResponse.redirect(new URL("/customer/tickets", req.url))
    } else {
      return NextResponse.redirect(new URL("/employee/dashboard", req.url))
    }
  }

  // If not authenticated and trying to access protected route
  if (!session && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // If authenticated and trying to access public routes
  if (session && isPublicPath && req.nextUrl.pathname !== "/auth/callback") {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', session.user.id)
      .single()

    if (profile?.role === 'customer') {
      return NextResponse.redirect(new URL("/customer/tickets", req.url))
    } else {
      return NextResponse.redirect(new URL("/employee/dashboard", req.url))
    }
  }

  // If customer trying to access employee routes or vice versa
  if (session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', session.user.id)
      .single()

    const isCustomerPath = req.nextUrl.pathname.startsWith('/customer/')
    const isEmployeePath = req.nextUrl.pathname.startsWith('/employee/')

    if (profile?.role === 'customer' && isEmployeePath) {
      return NextResponse.redirect(new URL("/customer/tickets", req.url))
    } else if (profile?.role !== 'customer' && isCustomerPath) {
      return NextResponse.redirect(new URL("/employee/dashboard", req.url))
    }
  }

  // Allow embedding of the chat widget from any domain
  if (req.nextUrl.pathname.startsWith('/embed')) {
    res.headers.set('X-Frame-Options', 'ALLOWALL')
    res.headers.set('Access-Control-Allow-Origin', '*')
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

