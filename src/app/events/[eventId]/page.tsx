'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Ticket, CalendarDays, MapPin, Tag, Users, Clock, Info, Loader2, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from "@/components/ui/badge";
import { getEventById } from '@/services/eventService'; // Assuming this fetches from backend API
import type { Event as EventType, TicketCategory as TicketCategoryType, Team } from '@prisma/client'; // Added Team
import { useToast } from '@/hooks/use-toast';

// Adjust EventResponse type if your API returns nested data differently
interface EventResponse extends EventType {
    ticketCategories: TicketCategoryType[];
    organizer: { id: string; name: string | null; email: string };
    team: Team | null; // Include team relation
}

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

// Function to generate inline style for team colors
const getTeamStyle = (team: Team | null): React.CSSProperties => {
    if (!team) return {};
    return {
        '--team-primary-color': team.primaryColor || 'hsl(var(--primary))',
        '--team-secondary-color': team.secondaryColor || 'hsl(var(--secondary))',
        '--team-accent-color': team.colorAccent || 'hsl(var(--accent))',
    } as React.CSSProperties;
};

export default function EventDetailsPage() {
    const params = useParams();
    const eventId = params.eventId as string;
    const { toast } = useToast();

    // Fetch event data using React Query
    const { data: event, isLoading, isError, error } = useQuery<EventResponse, Error>({
        queryKey: ['event', eventId],
        queryFn: () => getEventById(eventId), // Call API service function
        enabled: !!eventId, // Only run query if eventId is available
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });

     React.useEffect(() => {
        if (isError) {
            toast({
                title: "Error Loading Event",
                description: error?.message || "Could not load event details.",
                variant: "destructive",
            });
        }
    }, [isError, error, toast]);


    if (isLoading) {
        return (
            <div className="container mx-auto py-16 text-center flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.14))]">
                <Loader2 className="h-12 w-12 animate-spin text-accent" />
                <p className="mt-4 text-muted-foreground">Loading event details...</p>
            </div>
        );
    }

    if (isError || !event) {
        return (
            <div className="container mx-auto py-16 text-center flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.14))]">
                 <AlertCircle className="h-12 w-12 text-destructive mb-4"/>
                 <h2 className="text-2xl font-semibold text-destructive mb-2">Event Not Found</h2>
                 <p className="text-muted-foreground mb-6">
                     {error?.message.includes('not found')
                        ? "Sorry, we couldn't find the event you're looking for."
                        : error?.message || "An error occurred while loading the event."}
                 </p>
                 <Button asChild variant="outline">
                     <Link href="/events">Back to Events</Link>
                 </Button>
            </div>
        );
    }

    const eventDate = new Date(event.date); // Convert string date from API to Date object
    const teamStyle = getTeamStyle(event.team); // Get team style variables

    return (
        // Apply team style variables to the root element of the page
        <div style={teamStyle} className="bg-background text-foreground">
            <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 max-w-7xl">
                <Card className="overflow-hidden bg-card shadow-xl border border-border">
                    {/* Event Image and Header */}
                    <div className="relative h-64 md:h-[450px] w-full group">
                        {event.imageUrl ? (
                            <Image
                                src={event.imageUrl}
                                alt={event.title}
                                layout="fill"
                                objectFit="cover"
                                priority
                                className="transition-transform duration-500 ease-in-out group-hover:scale-105"
                                data-ai-hint="event hero image"
                            />
                        ) : (
                             // Use team colors for fallback gradient
                            <div className="absolute inset-0 bg-gradient-to-br from-[var(--team-secondary-color,hsl(var(--secondary)))] to-[var(--team-primary-color,hsl(var(--muted)))] flex items-center justify-center">
                                <Ticket className="h-24 w-24 text-white/30" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent"></div>
                        <div className="absolute bottom-0 left-0 p-6 md:p-10 text-white flex flex-col sm:flex-row gap-4 justify-between items-end w-full">
                            {/* Left Side Info */}
                            <div>
                                 {event.category && (
                                     <Badge variant="secondary" className="mb-2 bg-white/20 text-white backdrop-blur-sm border-none">{event.category}</Badge>
                                 )}
                                <h1 className="text-3xl md:text-5xl font-bold mb-3 drop-shadow-md">{event.title}</h1>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-y-2 gap-x-6 text-gray-200 text-sm md:text-base">
                                    <div className="flex items-center gap-2">
                                        <CalendarDays className="h-5 w-5 flex-shrink-0" />
                                        <span>{eventDate.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-5 w-5 flex-shrink-0" />
                                        <span>{eventDate.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })} onwards</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-5 w-5 flex-shrink-0" />
                                        <span>{event.location}</span>
                                    </div>
                                </div>
                            </div>
                             {/* Team Logo (Right Side) */}
                             {event.team && event.team.logoUrl && (
                                <div className="relative w-20 h-20 md:w-28 md:h-28 flex-shrink-0 bg-white/80 p-2 rounded-full shadow-lg backdrop-blur-sm">
                                    <Image
                                        src={event.team.logoUrl}
                                        alt={`${event.team.name} Logo`}
                                        layout="fill"
                                        objectFit="contain"
                                    />
                                </div>
                             )}
                        </div>
                    </div>

                    <CardContent className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
                        {/* Main Content Area (Description & Tickets) */}
                        <div className="lg:col-span-2">
                            <h2 className="text-2xl font-semibold text-[var(--team-primary-color,hsl(var(--primary)))] mb-4">About the Event</h2>
                            <p className="text-muted-foreground leading-relaxed mb-8 whitespace-pre-line">{event.description}</p>

                            <Separator className="my-8" />

                            <h3 className="text-xl font-semibold text-[var(--team-primary-color,hsl(var(--primary)))] mb-6">Select Your Tickets</h3>
                            <div className="space-y-4">
                                {event.ticketCategories.map((category) => {
                                    const availableQty = category.totalQty - category.bookedQty;
                                    const isSoldOut = availableQty <= 0;
                                    let availabilityText = 'Available';
                                    let availabilityColor = 'text-green-600';
                                    let availabilityIcon = <Users className="h-4 w-4 mr-1" />;

                                    if (isSoldOut) {
                                        availabilityText = 'Sold Out';
                                        availabilityColor = 'text-destructive';
                                    } else if (availableQty <= 50 && availableQty > 0) {
                                        availabilityText = `Few Left! (${availableQty})`;
                                        availabilityColor = 'text-orange-500';
                                    } else {
                                        availabilityText = `Available (${availableQty})`;
                                    }

                                    return (
                                        <Card key={category.id} className={`p-4 border ${isSoldOut ? 'border-border bg-secondary/30 opacity-70' : 'border-border bg-background hover:border-[var(--team-accent-color,hsl(var(--accent)))] transition-colors'} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`}>
                                            <div className="flex-grow">
                                                <p className="font-medium text-primary flex items-center gap-2"><Tag className="h-4 w-4 text-[var(--team-accent-color,hsl(var(--accent)))] flex-shrink-0" /> {category.name}</p>
                                                <p className="text-xl font-bold text-[var(--team-accent-color,hsl(var(--accent)))] mt-1">₹{category.price.toLocaleString('en-IN')}</p>
                                            </div>
                                            <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto flex-shrink-0">
                                                <Badge variant={isSoldOut ? "destructive" : (availableQty <= 50 ? "default" : "secondary")} className={`font-medium ${availabilityColor} bg-opacity-10 border ${isSoldOut ? 'border-destructive/30' : (availableQty <= 50 ? 'border-orange-500/30' : 'border-green-600/30')} `}>
                                                    {availabilityIcon} {availabilityText}
                                                </Badge>
                                                <Button
                                                    asChild
                                                    className="w-full sm:w-auto bg-[var(--team-accent-color,hsl(var(--accent)))] text-[var(--team-secondary-color,hsl(var(--accent-foreground)))] hover:opacity-90 transition-all duration-200 hover:shadow-md disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
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
                             {/* Team Info Box */}
                             {event.team && (
                                <Card className="p-5 bg-[var(--team-primary-color,hsl(var(--secondary)))/10] border-[var(--team-primary-color,hsl(var(--border)))]">
                                     <CardHeader className="p-0 pb-3 flex flex-row items-center gap-3">
                                         {event.team.logoUrl && (
                                            <div className="relative w-10 h-10 flex-shrink-0">
                                                <Image src={event.team.logoUrl} alt={`${event.team.name} Logo`} layout="fill" objectFit="contain"/>
                                            </div>
                                         )}
                                        <CardTitle className="text-lg text-[var(--team-primary-color,hsl(var(--primary)))]">{event.team.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0 space-y-1 text-sm">
                                        <p><strong className="font-medium text-[var(--team-primary-color,hsl(var(--primary)))]">Team Code:</strong> {event.team.shortName}</p>
                                         {/* Maybe add link to team's official site or more info */}
                                    </CardContent>
                                </Card>
                             )}
                            <Card className="p-5 bg-secondary/50 border border-border">
                                <CardHeader className="p-0 pb-3">
                                    <CardTitle className="text-lg flex items-center gap-2 text-primary"><Info className="h-5 w-5" />Event Details</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0 space-y-2 text-sm">
                                     {event.category && (
                                          <p><strong className="font-medium text-primary">Category:</strong> {event.category}</p>
                                      )}
                                    <p><strong className="font-medium text-primary">Date:</strong> {eventDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                    <p><strong className="font-medium text-primary">Time:</strong> {eventDate.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })} onwards</p>
                                    <p><strong className="font-medium text-primary">Venue:</strong> {event.location}</p>
                                    <p><strong className="font-medium text-primary">Organizer:</strong> {event.organizer?.name || event.organizer?.email || 'N/A'}</p>
                                </CardContent>
                            </Card>
                            <Card className="p-5 bg-secondary/50 border border-border">
                                <CardHeader className="p-0 pb-3">
                                    <CardTitle className="text-lg flex items-center gap-2 text-primary"><MapPin className="h-5 w-5" />Location</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <p className="text-sm text-muted-foreground mb-3">{event.location}</p>
                                    {/* Placeholder for Map */}
                                    <div className="aspect-video bg-muted rounded flex items-center justify-center">
                                        <p className="text-sm text-muted-foreground">(Map Placeholder)</p>
                                    </div>
                                    <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
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
        </div>
    );
}
