'use client';

import Link from 'next/link';
import { Ticket, LogIn, UserPlus, Sun, Moon, User, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth'; // Import useAuth
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Import Avatar components
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// import { useTheme } from 'next-themes'; // Add next-themes later if needed

export function Header() {
  // const { theme, setTheme } = useTheme(); // Use later for theme toggle
  const { user, isAuthenticated, logout, isLoading } = useAuth(); // Get auth state and functions

  const getInitials = (name?: string | null): string => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

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
           {isAuthenticated && ( // Show only if logged in
               <Link href="/my-bookings" className="text-foreground/60 transition-colors hover:text-foreground/80">
                 My Bookings
               </Link>
           )}
           {user?.role === 'ADMIN' && ( // Show only for admins
              <Link href="/admin" className="text-foreground/60 transition-colors hover:text-foreground/80 font-semibold text-accent">
                Admin Panel
              </Link>
           )}
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

          {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : isAuthenticated && user ? (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                     <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                        <Avatar className="h-8 w-8">
                            {/* TODO: Add user avatar image URL if available */}
                            {/* <AvatarImage src={user.avatarUrl} alt={user.name || user.email} /> */}
                            <AvatarFallback className="bg-muted text-muted-foreground">
                                {getInitials(user.name)}
                            </AvatarFallback>
                        </Avatar>
                     </Button>
                </DropdownMenuTrigger>
                 <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{user.name || 'User'}</p>
                            <p className="text-xs leading-none text-muted-foreground">
                                {user.email}
                            </p>
                         </div>
                    </DropdownMenuLabel>
                     <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <Link href="/profile"><User className="mr-2 h-4 w-4" /> Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/my-bookings"><Ticket className="mr-2 h-4 w-4" /> My Bookings</Link>
                    </DropdownMenuItem>
                    {user.role === 'ADMIN' && (
                        <DropdownMenuItem asChild>
                            <Link href="/admin" className="font-semibold"><User className="mr-2 h-4 w-4" /> Admin Panel</Link>
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:bg-destructive focus:text-destructive-foreground cursor-pointer">
                        <LogOut className="mr-2 h-4 w-4" /> Logout
                    </DropdownMenuItem>
                 </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </header>
  );
}
