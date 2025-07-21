// src/app/layout.js
import { Inter } from 'next/font/google'
import './globals.css'
import ClientLayout from './layout.client'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'VillageStay - Authentic Rural Tourism',
  description: 'Discover authentic rural experiences with AI-powered recommendations',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.className} antialiased`}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  )
}