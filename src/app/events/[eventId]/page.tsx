import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Ticket, CalendarDays, MapPin, Tag, Users, Clock, Info } from 'lucide-react'; // Added Clock, Info icons
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from "@/components/ui/badge"; // Import badge

// Mock data for a single event - Replace with actual data fetching later
const mockEvent = {
  id: '1',
  name: 'IPL Finals 2024',
  description: 'Experience the electrifying final match of the Indian Premier League 2024! Witness top teams battle for the championship trophy in a high-octane cricket showdown. Expect thrilling sixes, stunning catches, and an unforgettable atmosphere at the iconic Wankhede Stadium.',
  date: new Date(2024, 10, 26, 19, 30), // Month is 0-indexed (10 = November)
  location: 'Wankhede Stadium, Mumbai',
  imageUrl: 'https://picsum.photos/1200/600?random=1', // Larger image
  dataAiHint: "cricket stadium night match floodlights crowd",
  categories: [
    { id: 'cat1', name: 'General Admission (Upper Tier)', price: 1500, totalQty: 5000, bookedQty: 4980 }, // More booked
    { id: 'cat2', name: 'Lower Stand - East Wing', price: 3000, totalQty: 2000, bookedQty: 1850 },
    { id: 'cat3', name: 'Sachin Tendulkar Stand Box', price: 10000, totalQty: 100, bookedQty: 100 }, // Sold out
     { id: 'cat4', name: 'Corporate Box (Min. 10 seats)', price: 25000, totalQty: 50, bookedQty: 30 },
  ],
  organizer: 'Board of Control for Cricket in India (BCCI)',
};

// Helper function to format date and time
const formatDateTime = (date: Date) => {
  return date.toLocaleString('en-IN', {
    weekday: 'long', // e.g., Friday
    year: 'numeric', // e.g., 2024
    month: 'long', // e.g., November
    day: 'numeric', // e.g., 26
    hour: 'numeric', // e.g., 7 PM
    minute: '2-digit', // e.g., 30
    hour12: true, // Use AM/PM
  });
};

export default function EventDetailsPage({ params }: { params: { eventId: string } }) {
  const event = mockEvent; // Use mock data for now
  const { eventId } = params;

  // TODO: Fetch event data based on eventId using React Query or Server Component fetching

  if (!event) {
    // TODO: Handle event not found case (e.g., redirect or show a 404 component)
    return <div className="container mx-auto py-16 text-center">Event not found.</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 max-w-7xl"> {/* Increased max-width */}
      <Card className="overflow-hidden bg-card shadow-xl border border-border">
        {/* Event Image and Header */}
        <div className="relative h-64 md:h-[450px] w-full group"> {/* Increased height */}
            {event.imageUrl ? (
                 <Image
                    src={event.imageUrl}
                    alt={event.name}
                    layout="fill"
                    objectFit="cover"
                    priority // Prioritize loading the main image
                    className="transition-transform duration-500 ease-in-out group-hover:scale-105" // Subtle zoom on hover
                    data-ai-hint={event.dataAiHint}
                 />
            ) : (
                 <div className="absolute inset-0 bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
                      <Ticket className="h-24 w-24 text-muted-foreground opacity-50" />
                 </div>
            )}

            {/* Gradient Overlay for Text Contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent"></div>

            {/* Header Content */}
             <div className="absolute bottom-0 left-0 p-6 md:p-10 text-white">
                 <h1 className="text-3xl md:text-5xl font-bold mb-3 drop-shadow-md">{event.name}</h1>
                 <div className="flex flex-col sm:flex-row sm:items-center gap-y-2 gap-x-6 text-gray-200 text-sm md:text-base">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 flex-shrink-0" />
                        <span>{event.date.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                     <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 flex-shrink-0" />
                        <span>{event.date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })} onwards</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 flex-shrink-0" />
                        <span>{event.location}</span>
                    </div>
                 </div>
             </div>
          </div>

        <CardContent className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Main Content Area (Description & Tickets) */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-semibold text-primary mb-4">About the Event</h2>
            <p className="text-muted-foreground leading-relaxed mb-8 whitespace-pre-line">{event.description}</p> {/* Use whitespace-pre-line */}

            <Separator className="my-8" />

            <h3 className="text-xl font-semibold text-primary mb-6">Select Your Tickets</h3>
            <div className="space-y-4">
              {event.categories.map((category) => {
                const availableQty = category.totalQty - category.bookedQty;
                const isSoldOut = availableQty <= 0;
                let availabilityText = 'Available';
                let availabilityColor = 'text-green-600';
                let availabilityIcon = <Users className="h-4 w-4 mr-1"/>;

                if (isSoldOut) {
                  availabilityText = 'Sold Out';
                  availabilityColor = 'text-destructive';
                } else if (availableQty <= 50 && availableQty > 0) { // Example threshold for 'Few Left'
                  availabilityText = `Few Left! (${availableQty})`;
                  availabilityColor = 'text-orange-500';
                } else {
                     availabilityText = `Available (${availableQty})`;
                }


                return (
                   <Card key={category.id} className={`p-4 border ${isSoldOut ? 'border-border bg-secondary/30 opacity-70' : 'border-border bg-background hover:border-accent transition-colors'} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`}>
                       <div className="flex-grow">
                           <p className="font-medium text-primary flex items-center gap-2"><Tag className="h-4 w-4 text-accent flex-shrink-0"/> {category.name}</p>
                           <p className="text-xl font-bold text-accent mt-1">₹{category.price.toLocaleString('en-IN')}</p>
                       </div>
                       <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto flex-shrink-0">
                            <Badge variant={isSoldOut ? "destructive" : (availableQty <= 50 ? "default" : "secondary")} className={`font-medium ${availabilityColor} bg-opacity-10 border ${isSoldOut ? 'border-destructive/30' : (availableQty <=50 ? 'border-orange-500/30' : 'border-green-600/30')} `}>
                                {availabilityIcon} {availabilityText}
                            </Badge>
                           <Button
                                asChild
                                className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90 transition-all duration-200 hover:shadow-md disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
                                disabled={isSoldOut}
                                size="sm"
                            >
                                <Link href={`/checkout/${eventId}?category=${category.id}`}>
                                    <Ticket className="mr-2 h-4 w-4" />
                                    {isSoldOut ? 'Sold Out' : 'Book Now'}
                                </Link>
                            </Button>
                       </div>
                   </Card>
                );
              })}
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="lg:col-span-1 space-y-6">
             <Card className="p-5 bg-secondary/50 border border-border">
                 <CardHeader className="p-0 pb-3">
                     <CardTitle className="text-lg flex items-center gap-2 text-primary"><Info className="h-5 w-5"/>Event Details</CardTitle>
                 </CardHeader>
                 <CardContent className="p-0 space-y-2 text-sm">
                     <p><strong className="font-medium text-primary">Date:</strong> {event.date.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                     <p><strong className="font-medium text-primary">Time:</strong> {event.date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })} onwards</p>
                     <p><strong className="font-medium text-primary">Venue:</strong> {event.location}</p>
                     <p><strong className="font-medium text-primary">Organizer:</strong> {event.organizer || 'N/A'}</p>
                 </CardContent>
             </Card>
              <Card className="p-5 bg-secondary/50 border border-border">
                 <CardHeader className="p-0 pb-3">
                     <CardTitle className="text-lg flex items-center gap-2 text-primary"><MapPin className="h-5 w-5"/>Location</CardTitle>
                 </CardHeader>
                 <CardContent className="p-0">
                      <p className="text-sm text-muted-foreground mb-3">{event.location}</p>
                     {/* Placeholder for Map */}
                     <div className="aspect-video bg-muted rounded flex items-center justify-center">
                         <p className="text-sm text-muted-foreground">(Map Placeholder)</p>
                     </div>
                     <Button variant="outline" size="sm" className="mt-3 w-full">
                         <Link href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`} target="_blank" rel="noopener noreferrer">
                             View on Google Maps
                         </Link>
                     </Button>
                 </CardContent>
             </Card>
             {/* TODO: Add 'Share Event' or 'Contact Organizer' sections if needed */}
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
