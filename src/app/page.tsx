import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-secondary">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-4">
          Welcome to TicketFlow
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Your platform for discovering and booking event tickets.
        </p>
        <div className="space-x-4">
          <Button asChild variant="default" size="lg">
            <Link href="/events">Browse Events</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">Login / Sign Up</Link>
          </Button>
           {/* Example Button, Link to actual admin later */}
           <Button asChild variant="secondary" size="lg">
            <Link href="/admin">Admin Panel</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
