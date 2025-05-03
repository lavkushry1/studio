import type { Metadata, Viewport } from 'next'; // Import Viewport
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Header } from '@/components/layout/Header'; // Import Header
import { Footer } from '@/components/layout/Footer'; // Import Footer
import { QueryProvider } from '@/providers/QueryProvider'; // Import QueryProvider
import { AuthProvider } from '@/hooks/useAuth'; // Import AuthProvider
import Script from 'next/script'; // Import Script

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'TicketFlow', // Updated App Name
  description: 'Event Ticketing Platform by Firebase Studio', // Updated Description
  manifest: '/manifest.json', // Link to the PWA manifest
};

// Add viewport settings for responsive design
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ffffff', // Example theme color
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
       {/* Link manifest.json and define theme color */}
       <head>
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#ffffff" /> {/* Match themeColor in viewport */}
          {/* Add other meta tags like apple-touch-icon if needed */}
       </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}>
        <QueryProvider> {/* Wrap content with QueryProvider */}
           <AuthProvider> {/* Wrap content with AuthProvider */}
            <Header /> {/* Add Header */}
            <main className="flex-grow"> {/* Main content area */}
              {children}
            </main>
            <Footer /> {/* Add Footer */}
            <Toaster /> {/* Add Toaster component */}
           </AuthProvider>
        </QueryProvider>

         {/* Basic Service Worker Registration Script */}
         <Script id="service-worker-registration" strategy="lazyOnload">
           {`
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then(registration => {
                      console.log('Service Worker registered with scope:', registration.scope);
                    })
                    .catch(error => {
                      console.error('Service Worker registration failed:', error);
                    });
                });
              }
           `}
         </Script>
      </body>
    </html>
  );
}
