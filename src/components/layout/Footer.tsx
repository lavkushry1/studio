'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t bg-secondary">
      <div className="container py-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} TicketFlow. All rights reserved.</p>
        <nav className="mt-2 space-x-4">
          <Link href="/about" className="hover:text-primary">About Us</Link>
          <Link href="/contact" className="hover:text-primary">Contact</Link>
          <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
        </nav>
      </div>
    </footer>
  );
}
