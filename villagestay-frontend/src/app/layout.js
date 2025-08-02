// src/app/layout.js - Aggressive SW Registration
import { Inter } from 'next/font/google'
import './globals.css'
import ClientLayout from './layout.client'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'VillageStay - Authentic Rural Tourism',
  description: 'Discover authentic rural experiences with AI-powered recommendations',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'VillageStay'
  },
  icons: {
    icon: [
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ]
  }
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#10b981'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="application-name" content="VillageStay" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="VillageStay" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#10b981" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Aggressive Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Immediately register service worker
              (function() {
                if ('serviceWorker' in navigator) {
                  // Register as soon as possible
                  navigator.serviceWorker.register('/sw.js', {
                    scope: '/',
                    updateViaCache: 'none'
                  })
                  .then(function(registration) {
                    console.log('✅ SW registered successfully');
                    
                    // Force activation if waiting
                    if (registration.waiting) {
                      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                    }
                    
                    // Handle updates
                    registration.addEventListener('updatefound', () => {
                      const newWorker = registration.installing;
                      newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed') {
                          if (navigator.serviceWorker.controller) {
                            console.log('🔄 SW update available');
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                          } else {
                            console.log('✅ SW installed for first time');
                          }
                        }
                      });
                    });
                  })
                  .catch(function(error) {
                    console.error('❌ SW registration failed:', error);
                  });
                  
                  // Handle controller changes
                  navigator.serviceWorker.addEventListener('controllerchange', () => {
                    console.log('🔄 SW controller changed');
                    // Optionally reload: window.location.reload();
                  });
                  
                  // Listen for SW messages
                  navigator.serviceWorker.addEventListener('message', function(event) {
                    if (event.data && event.data.type === 'SW_ACTIVATED') {
                      console.log('✅ SW activated:', event.data.version);
                    }
                  });
                }
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning={true}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}