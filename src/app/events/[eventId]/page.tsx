import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Ticket, CalendarDays, MapPin, Tag, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

// Mock data for a single event - Replace with actual data fetching later
const mockEvent = {
  id: '1',
  name: 'IPL Finals 2024',
  description: 'Experience the electrifying final match of the Indian Premier League 2024! Witness top teams battle for the championship trophy in a high-octane cricket showdown. Expect thrilling sixes, stunning catches, and an unforgettable atmosphere.',
  date: new Date(2024, 10, 26, 19, 30), // Added time
  location: 'Wankhede Stadium, Mumbai',
  imageUrl: 'https://picsum.photos/800/400?random=1',
  dataAiHint: "cricket stadium night match",
  categories: [
    { id: 'cat1', name: 'General Admission', price: 1500, totalQty: 5000, bookedQty: 2500 },
    { id: 'cat2', name: 'Lower Stand - East', price: 3000, totalQty: 2000, bookedQty: 1850 },
    { id: 'cat3', name: 'VIP Box', price: 10000, totalQty: 500, bookedQty: 495 },
  ],
  organizer: 'BCCI',
};

// Helper function to format date and time
const formatDateTime = (date: Date) => {
  return date.toLocaleString('en-IN', {
    dateStyle: 'full',
    timeStyle: 'short',
  });
};

export default function EventDetailsPage({ params }: { params: { eventId: string } }) {
  const event = mockEvent; // Use mock data for now
  const { eventId } = params;

  // TODO: Fetch event data based on eventId

  if (!event) {
    // TODO: Handle event not found case
    return <div className="container mx-auto py-8 text-center">Event not found.</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <Card className="overflow-hidden bg-card shadow-xl">
        {event.imageUrl && (
          <div className="relative h-64 md:h-96 w-full">
            <Image
              src={event.imageUrl}
              alt={event.name}
              layout="fill"
              objectFit="cover"
              priority // Prioritize loading the main image
              data-ai-hint={event.dataAiHint}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
             <div className="absolute bottom-0 left-0 p-6 md:p-8">
                 <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{event.name}</h1>
                 <div className="flex items-center space-x-4 text-gray-200">
                    <div className="flex items-center space-x-1">
                        <CalendarDays className="h-5 w-5" />
                        <span>{formatDateTime(event.date)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <MapPin className="h-5 w-5" />
                        <span>{event.location}</span>
                    </div>
                 </div>
             </div>
          </div>
        )}

        <CardContent className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <h2 className="text-2xl font-semibold text-primary mb-4">About the Event</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">{event.description}</p>

            <Separator className="my-6" />

            <h3 className="text-xl font-semibold text-primary mb-4">Ticket Categories</h3>
            <div className="space-y-4">
              {event.categories.map((category) => {
                const availableQty = category.totalQty - category.bookedQty;
                const isSoldOut = availableQty <= 0;
                const availabilityText = isSoldOut
                  ? 'Sold Out'
                  : availableQty < 50 // Example threshold for 'Few Left'
                  ? 'Few Left!'
                  : 'Available';
                const availabilityColor = isSoldOut
                  ? 'text-destructive'
                  : availableQty < 50
                  ? 'text-orange-500' // Example color for 'Few Left'
                  : 'text-green-600';

                return (
                   <Card key={category.id} className="p-4 border border-border bg-secondary/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                       <div>
                           <p className="font-medium text-primary flex items-center gap-2"><Tag className="h-4 w-4 text-accent"/> {category.name}</p>
                           <p className="text-lg font-semibold text-accent mt-1">₹{category.price.toLocaleString('en-IN')}</p>
                       </div>
                       <div className="text-right">
                            <p className={`text-sm font-medium ${availabilityColor} flex items-center gap-1 justify-end`}>
                                <Users className="h-4 w-4"/> {availabilityText}
                            </p>
                           <Button
                                asChild
                                className="mt-2 bg-accent text-accent-foreground hover:bg-accent/90 w-full sm:w-auto"
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

          {/* Sidebar Info (Optional) */}
          <div className="md:col-span-1 space-y-4">
             <Card className="p-4 bg-secondary/50">
                 <h4 className="font-semibold mb-2 text-primary">Organizer</h4>
                 <p className="text-sm text-muted-foreground">{event.organizer || 'N/A'}</p>
             </Card>
              <Card className="p-4 bg-secondary/50">
                 <h4 className="font-semibold mb-2 text-primary">Location</h4>
                 <p className="text-sm text-muted-foreground">{event.location}</p>
                 {/* Add a map component here later if needed */}
             </Card>
             {/* Add more info sections like 'Contact', 'Terms & Conditions' */}
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
