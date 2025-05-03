import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Header } from '@/components/layout/Header'; // Import Header
import { Footer } from '@/components/layout/Footer'; // Import Footer
import { QueryProvider } from '@/providers/QueryProvider'; // Import QueryProvider

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning> {/* Add suppressHydrationWarning for potential theme issues */}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}>
        <QueryProvider> {/* Wrap content with QueryProvider */}
          <Header /> {/* Add Header */}
          <main className="flex-grow"> {/* Main content area */}
            {children}
          </main>
          <Footer /> {/* Add Footer */}
          <Toaster /> {/* Add Toaster component */}
        </QueryProvider>
      </body>
    </html>
  );
}
