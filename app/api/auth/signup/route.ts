import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Initialize Supabase client with service role key
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function POST(request: Request) {
  try {
    const { email, password, displayName, role } = await request.json()

    // Validate admin role
    if (role === "admin" && !email.endsWith("@gauntletai.com")) {
      return NextResponse.json({ error: "Only @gauntletai.com emails can sign up as admin" }, { status: 400 })
    }

    // Create the user with Supabase auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for development
      user_metadata: {
        display_name: displayName,
      },
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (authData.user) {
      // Create profile using service role client (bypasses RLS)
      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: authData.user.id,
        display_name: displayName,
        role,
      })

      if (profileError) {
        // If profile creation fails, clean up by deleting the auth user
        await supabase.auth.admin.deleteUser(authData.user.id)
        return NextResponse.json({ error: profileError.message }, { status: 400 })
      }

      return NextResponse.json({
        message: "Account created successfully. You can now log in.",
      })
    }

    return NextResponse.json({ error: "Failed to create user" }, { status: 400 })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}

