import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST() {
  // Only allow in test environment
  if (process.env.NODE_ENV !== "test") {
    return NextResponse.json(
      { error: "This endpoint is only available in test environment" },
      { status: 403 }
    )
  }

  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Delete all templates
    const { error } = await supabase
      .from("templates")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000") // Safety check to prevent deleting everything

    if (error) throw error

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("Error clearing templates:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
} 