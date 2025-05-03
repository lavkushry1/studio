'use client';

import Link from 'next/link';
import { Ticket, LogIn, UserPlus, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
// import { useTheme } from 'next-themes'; // Add next-themes later if needed

export function Header() {
  // const { theme, setTheme } = useTheme(); // Use later for theme toggle

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/" className="flex items-center space-x-2 mr-6">
          <Ticket className="h-6 w-6 text-accent" />
          <span className="font-bold text-primary">TicketFlow</span>
        </Link>
        <nav className="flex items-center space-x-6 text-sm font-medium flex-grow">
          <Link href="/events" className="text-foreground/60 transition-colors hover:text-foreground/80">
            Events
          </Link>
          {/* Add more navigation links here as needed */}
        </nav>
        <div className="flex items-center justify-end space-x-2">
          {/* Theme Toggle Placeholder - Implement with next-themes later */}
          {/* <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button> */}
          <Button asChild variant="ghost" size="sm">
             <Link href="/login">
                <LogIn className="mr-1 h-4 w-4" /> Login
             </Link>
          </Button>
          <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href="/login?tab=signup">
               <UserPlus className="mr-1 h-4 w-4" /> Sign Up
            </Link>
          </Button>
           <Button asChild variant="outline" size="sm">
            <Link href="/admin">Admin</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
