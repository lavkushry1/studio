import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar"; // Assuming Calendar component exists
import { Label } from "@/components/ui/label";
import Image from 'next/image';
import Link from 'next/link';

// Mock data for events - Replace with actual data fetching later
const mockEvents = [
  { id: '1', name: 'IPL Finals 2024', description: 'The final clash of the titans!', date: new Date(2024, 10, 26), location: 'Mumbai', imageUrl: 'https://picsum.photos/400/200?random=1', category: 'Sports' , dataAiHint: "cricket stadium"},
  { id: '2', name: 'Music Concert', description: 'Live performance by top artists.', date: new Date(2024, 11, 5), location: 'Bangalore', imageUrl: 'https://picsum.photos/400/200?random=2', category: 'Music' , dataAiHint: "music concert stage" },
  { id: '3', name: 'Tech Conference', description: 'Exploring the future of technology.', date: new Date(2024, 11, 15), location: 'Hyderabad', imageUrl: 'https://picsum.photos/400/200?random=3', category: 'Conference', dataAiHint: "tech conference presentation" },
  { id: '4', name: 'IPL Qualifier 1', description: 'First qualifier match.', date: new Date(2024, 10, 20), location: 'Chennai', imageUrl: 'https://picsum.photos/400/200?random=4', category: 'Sports', dataAiHint: "cricket player action" },
];

export default function EventsPage() {
  // TODO: Implement state and handlers for filtering and search

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-primary mb-6">Discover Events</h1>

      {/* Filter and Search Section */}
      <Card className="mb-8 bg-card shadow-lg">
        <CardHeader>
          <CardTitle>Filter & Search</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search Events</Label>
            <Input id="search" placeholder="Search by name, location..." className="bg-background" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select>
              <SelectTrigger id="category" className="bg-background">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="sports">Sports</SelectItem>
                <SelectItem value="music">Music</SelectItem>
                <SelectItem value="conference">Conference</SelectItem>
                {/* Add more categories as needed */}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
             <Label htmlFor="date">Date</Label>
             {/* Basic date input for now, replace with ShadCN date picker later if needed */}
             <Input id="date" type="date" className="bg-background" />
          </div>
           <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" placeholder="Enter location" className="bg-background" />
          </div>
        </CardContent>
         <CardFooter>
            <Button className="ml-auto bg-accent text-accent-foreground hover:bg-accent/90">Apply Filters</Button>
         </CardFooter>
      </Card>

      {/* Event Listing Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockEvents.map((event) => (
          <Card key={event.id} className="overflow-hidden bg-card shadow-md hover:shadow-lg transition-shadow duration-200">
            <div className="relative h-48 w-full">
             {event.imageUrl && (
                <Image
                  src={event.imageUrl}
                  alt={event.name}
                  layout="fill"
                  objectFit="cover"
                  data-ai-hint={event.dataAiHint}
                />
              )}
            </div>
            <CardHeader>
              <CardTitle className="text-primary">{event.name}</CardTitle>
              <CardDescription>{event.date.toLocaleDateString()} - {event.location}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{event.description}</p>
              <Badge variant="secondary">{event.category}</Badge>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href={`/events/${event.id}`}>View Details</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
        {/* Add loading state and empty state */}
      </div>
    </div>
  );
}


// Simple Badge component (replace or import from shadcn if available)
function Badge({ children, variant = 'default', className }: { children: React.ReactNode, variant?: string, className?: string }) {
  // Basic styling, adapt as needed
  const baseStyle = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors";
  const variantStyle = variant === 'secondary' ? "border-transparent bg-secondary text-secondary-foreground" : "border-transparent bg-primary text-primary-foreground";
  return (
    <div className={`${baseStyle} ${variantStyle} ${className || ''}`}>
      {children}
    </div>
  );
}
