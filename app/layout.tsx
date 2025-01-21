import "./globals.css"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"
import RootLayoutClient from "./RootLayoutClient"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "CRM Tool",
  description: "A highly extensible CRM tool with LLM integration",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <RootLayoutClient>
          {children}
        </RootLayoutClient>
        <Toaster />
      </body>
    </html>
  )
}

