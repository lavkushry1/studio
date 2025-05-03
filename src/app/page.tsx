'use client'; // Add this directive

import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-[calc(100vh-theme(spacing.14))] flex-col items-center justify-center p-8 md:p-24 bg-gradient-to-b from-background to-secondary"> {/* Adjust min-height and padding */}
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary mb-4 animate-fade-in-up"> {/* Add animation */}
          Welcome to TicketFlow
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in-up animation-delay-200"> {/* Add animation and delay */}
          Your ultimate platform for discovering, booking, and managing event tickets seamlessly.
        </p>
        <div className="space-y-4 sm:space-y-0 sm:space-x-4 animate-fade-in-up animation-delay-400"> {/* Add animation and delay */}
          <Button asChild variant="default" size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 transition-transform duration-200 hover:scale-105"> {/* Style primary button */}
            <Link href="/events">Browse Events</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="transition-transform duration-200 hover:scale-105"> {/* Style secondary button */}
            <Link href="/login">Login / Sign Up</Link>
          </Button>
        </div>
      </div>
       {/* Optional: Add styles for animation */}
       <style jsx>{`
          @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in-up {
            animation: fade-in-up 0.6s ease-out forwards;
            opacity: 0; /* Start hidden */
          }
          .animation-delay-200 { animation-delay: 0.2s; }
          .animation-delay-400 { animation-delay: 0.4s; }
      `}</style>
    </main>
  );
}
