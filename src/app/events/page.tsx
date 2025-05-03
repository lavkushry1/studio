import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar"; // Assuming Calendar component exists
import { Label } from "@/components/ui/label";
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from "@/components/ui/badge"; // Import Badge
import { Search, Filter } from 'lucide-react'; // Import icons

// Mock data for events - Replace with actual data fetching later
const mockEvents = [
  { id: '1', name: 'IPL Finals 2024', description: 'The final clash of the titans!', date: new Date(2024, 10, 26), location: 'Mumbai', imageUrl: 'https://picsum.photos/400/200?random=1', category: 'Sports' , dataAiHint: "cricket stadium floodlights"},
  { id: '2', name: 'Rock Legends Live', description: 'Live performance by top rock bands.', date: new Date(2024, 11, 5), location: 'Bangalore', imageUrl: 'https://picsum.photos/400/200?random=2', category: 'Music' , dataAiHint: "rock concert stage crowd" },
  { id: '3', name: 'Future of AI Conference', description: 'Exploring the future of artificial intelligence.', date: new Date(2024, 11, 15), location: 'Hyderabad', imageUrl: 'https://picsum.photos/400/200?random=3', category: 'Conference', dataAiHint: "tech conference presentation robot" },
  { id: '4', name: 'IPL Qualifier 1', description: 'First qualifier match determining a finalist.', date: new Date(2024, 10, 20), location: 'Chennai', imageUrl: 'https://picsum.photos/400/200?random=4', category: 'Sports', dataAiHint: "cricket player batting action" },
   { id: '5', name: 'Indie Music Fest', description: 'Showcasing upcoming independent artists.', date: new Date(2024, 12, 1), location: 'Pune', imageUrl: 'https://picsum.photos/400/200?random=5', category: 'Music' , dataAiHint: "music festival outdoor stage" },
   { id: '6', name: 'Startup Summit 2024', description: 'Connect with innovators and investors.', date: new Date(2025, 0, 10), location: 'Delhi', imageUrl: 'https://picsum.photos/400/200?random=6', category: 'Conference', dataAiHint: "business meeting conference room" },
];

export default function EventsPage() {
  // TODO: Implement state and handlers for filtering and search

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-primary mb-8">Discover Events</h1>

      {/* Filter and Search Section */}
      <Card className="mb-10 bg-card shadow-lg border border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
             <Filter className="h-5 w-5 text-primary" /> Filter & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="search">Search Events</Label>
             <div className="relative">
                 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="search" placeholder="Name, location..." className="bg-background pl-8" />
             </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <Select>
              <SelectTrigger id="category" className="bg-background">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="sports">Sports</SelectItem>
                <SelectItem value="music">Music</SelectItem>
                <SelectItem value="conference">Conference</SelectItem>
                 <SelectItem value="workshop">Workshop</SelectItem>
                 <SelectItem value="theater">Theater</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
             <Label htmlFor="date">Date</Label>
             {/* Replace with Popover Calendar later */}
             <Input id="date" type="date" className="bg-background" />
          </div>
           <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input id="location" placeholder="Enter location" className="bg-background" />
          </div>
        </CardContent>
         <CardFooter className="pt-4">
            <Button className="ml-auto bg-accent text-accent-foreground hover:bg-accent/90">
                 Apply Filters
            </Button>
         </CardFooter>
      </Card>

      {/* Event Listing Section */}
      {mockEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockEvents.map((event) => (
              <Card key={event.id} className="overflow-hidden bg-card shadow-md hover:shadow-xl transition-all duration-300 flex flex-col border border-border hover:border-accent">
                 <div className="relative h-48 w-full">
                 {event.imageUrl ? (
                    <Image
                      src={event.imageUrl}
                      alt={event.name}
                      layout="fill"
                      objectFit="cover"
                      className="transition-transform duration-300 group-hover:scale-105" // Optional zoom effect
                      data-ai-hint={event.dataAiHint}
                    />
                  ) : (
                     <div className="h-full w-full bg-secondary flex items-center justify-center">
                          <Ticket className="h-16 w-16 text-muted-foreground" /> {/* Placeholder icon */}
                     </div>
                  )}
                </div>
                <CardHeader className="pb-3">
                  <CardTitle className="text-primary text-lg truncate">{event.name}</CardTitle>
                  <CardDescription className="text-sm">
                     {event.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} - {event.location}
                   </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow pb-4">
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{event.description}</p>
                  <Badge variant="secondary">{event.category}</Badge>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                    <Link href={`/events/${event.id}`}>View Details</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
      ) : (
           <div className="text-center py-16 text-muted-foreground">
                <p>No events found matching your criteria.</p>
                {/* Add a button to reset filters maybe */}
           </div>
      )}
       {/* TODO: Add Pagination component here */}
    </div>
  );
}
