import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import Navbar from '@/components/Navbar'
import SyncManager from '@/components/SyncManager'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Muggi',
  description: 'Movie & Series Manager',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-gray-950 text-white antialiased`}>
        <Providers>
          <SyncManager />
          <Navbar />
          <main className="p-0">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}
