import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css' // Ensure you have this, or remove if using default Tailwind setup without global css file

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Prompt Library',
  description: 'A local library for your AI prompts',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}