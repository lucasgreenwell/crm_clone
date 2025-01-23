import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chat Support',
  description: 'Embedded chat support widget',
}

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full overflow-hidden">
        {children}
      </body>
    </html>
  )
} 