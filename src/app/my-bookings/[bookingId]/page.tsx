// src/app/my-bookings/[bookingId]/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getBookingById } from '@/services/bookingService'; // Assuming service exists
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, ArrowLeft, Ticket, Download, CalendarDays, MapPin, User, Info, WifiOff } from 'lucide-react'; // Added WifiOff
import Link from 'next/link';
import { format } from 'date-fns';
import type { Booking as BookingType, BookingStatus, Seat as SeatType, Event as EventType, Ticket as TicketType } from '@prisma/client'; // Import Prisma types
import { useToast } from '@/hooks/use-toast';
import { openDB, IDBPDatabase } from 'idb'; // Import IndexedDB library

// Define extended type based on API response (including relations)
interface BookingDetails extends BookingType {
    event: { id: string; title: string; date: Date | string; location: string } | null;
    user: { id: string; email: string; name: string | null; } | null;
    seats: SeatType[];
    tickets: { id: string }[]; // Just need ticket IDs for download links
}

// Define structure for storing ticket data offline
interface OfflineTicketData {
    id: string; // Ticket ID
    bookingId: string;
    eventTitle: string;
    pdfBlob: Blob; // Store the PDF blob directly
    filename: string;
}

const DB_NAME = 'TicketFlowDB';
const STORE_NAME = 'tickets';

// Function to open IndexedDB
async function openTicketDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

// Function to save ticket offline
async function saveTicketOffline(ticketData: OfflineTicketData) {
  const db = await openTicketDB();
  await db.put(STORE_NAME, ticketData);
  console.log(`Ticket ${ticketData.id} saved offline.`);
}

// Function to retrieve ticket offline
async function getTicketOffline(ticketId: string): Promise<OfflineTicketData | undefined> {
  const db = await openTicketDB();
  return db.get(STORE_NAME, ticketId);
}

export default function BookingDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const bookingId = params.bookingId as string;
    const { getAccessToken, isLoading: authLoading } = useAuth();
    const { toast } = useToast();
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [offlineTickets, setOfflineTickets] = useState<OfflineTicketData[]>([]);

     useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const token = getAccessToken();

    const { data: booking, isLoading, isError, error, refetch } = useQuery<BookingDetails, Error>({
        queryKey: ['bookingDetails', bookingId],
        queryFn: async () => {
             // If offline, try to load minimal data? For now, rely on cache or show offline message
             if (isOffline) {
                 // Try loading from cache - React Query handles this automatically to some extent
                 // If cache miss and offline, it will stay in loading or error state
                 console.log("Offline mode: Attempting to load booking from cache.");
                 // No explicit offline fetch logic for booking details here, rely on RQ cache
                 throw new Error("Currently offline. Booking details might be outdated.");
             }
             return getBookingById(bookingId, token!);
        },
        enabled: !!bookingId && !!token && !authLoading, // Only run when bookingId and token are available
        staleTime: isOffline ? Infinity : 5 * 60 * 1000, // Keep data longer if offline
        retry: !isOffline, // Don't retry if offline
    });

     // Fetch offline tickets when booking data is loaded (or if initially offline)
     useEffect(() => {
         if (booking?.status === BookingStatus.CONFIRMED || isOffline) {
             const loadOfflineTickets = async () => {
                 if (booking?.tickets) {
                    const storedTickets = await Promise.all(
                        booking.tickets.map(ticket => getTicketOffline(ticket.id))
                    );
                    setOfflineTickets(storedTickets.filter(Boolean) as OfflineTicketData[]);
                 } else if (isOffline) {
                     // If offline and no booking data (or no tickets in booking data), try to load ALL tickets from DB? Risky.
                     // Better: Load tickets specifically for this booking ID if stored with it.
                     // This requires storing bookingId with the ticket in IndexedDB.
                     console.warn("Offline and no booking ticket data available. Cannot load specific offline tickets for this booking reliably without more info.");
                     // Maybe try loading all tickets and filter later?
                     // const db = await openTicketDB();
                     // const allOffline = await db.getAll(STORE_NAME);
                     // setOfflineTickets(allOffline.filter(t => t.bookingId === bookingId)); // Filter if bookingId is stored
                 }
             };
             loadOfflineTickets();
         }
     }, [booking, isOffline, bookingId]);


    const handleDownloadTicket = async (ticketId: string) => {
        // Prioritize offline stored ticket if available
        const offlineTicket = await getTicketOffline(ticketId);
        if (offlineTicket) {
             console.log("Serving ticket from offline storage.");
             try {
                 const url = window.URL.createObjectURL(offlineTicket.pdfBlob);
                 const link = document.createElement('a');
                 link.href = url;
                 link.download = offlineTicket.filename;
                 document.body.appendChild(link);
                 link.click();
                 document.body.removeChild(link);
                 window.URL.revokeObjectURL(url);
                 toast({ title: "Ticket Loaded", description: "Ticket loaded from offline storage." });
                 return;
             } catch(err) {
                  console.error("Error creating object URL for offline ticket:", err);
                  // Fallback to online download if object URL fails
             }
        }

         // If offline or offline retrieval failed, attempt online download
         if (isOffline) {
             toast({ title: "Offline", description: "Cannot download new ticket while offline. Try accessing saved tickets.", variant: "destructive" });
             return;
         }

        if (!token) {
            toast({ title: "Authentication Error", description: "Please log in to download.", variant: "destructive" });
            return;
        }

        // Initiate online download and potentially save offline
        const downloadUrl = `/api/bookings/${bookingId}/tickets/${ticketId}/download`;
        setIsLoading(true); // Use a loading state for download button?
        try {
            const response = await fetch(downloadUrl, { headers: { 'Authorization': `Bearer ${token}` }});
            if (!response.ok) {
                throw new Error(`Download failed: ${response.statusText}`);
            }
            const disposition = response.headers.get('Content-Disposition');
            let filename = `ticket_${ticketId}.pdf`;
            if (disposition && disposition.indexOf('attachment') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }
            const blob = await response.blob();

            // Save the downloaded ticket offline
            try {
                 await saveTicketOffline({
                     id: ticketId,
                     bookingId: bookingId,
                     eventTitle: booking?.event?.title || 'Event Ticket',
                     pdfBlob: blob,
                     filename: filename
                 });
                toast({ title: "Ticket Saved Offline", description: "Ticket available for offline access." });
                // Update local state for offline tickets
                setOfflineTickets(prev => {
                    const existing = prev.find(t => t.id === ticketId);
                    if (existing) return prev; // Avoid duplicates
                    return [...prev, { id: ticketId, bookingId, eventTitle: booking?.event?.title || '', pdfBlob: blob, filename }];
                });
            } catch (dbError) {
                 console.error("Failed to save ticket offline:", dbError);
                 toast({ title: "Offline Save Failed", description: "Could not save ticket for offline use.", variant: "destructive" });
            }

            // Trigger browser download
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(link.href);

        } catch (error: any) {
            console.error('Ticket download failed:', error);
            toast({ title: "Download Failed", description: error.message, variant: "destructive" });
        } finally {
             setIsLoading(false);
        }
    };

    // Handle main loading/error states for the booking itself
    if (authLoading || (isLoading && !data && !isOffline)) { // Check !isOffline here
        return (
            <div className="container mx-auto py-16 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-accent" />
                <p className="mt-4 text-muted-foreground">Loading booking details...</p>
            </div>
        );
    }

    // If offline and no cached data, show specific offline message
     if (isOffline && !booking && !isLoading) {
         return (
            <div className="container mx-auto py-16 text-center">
                 <WifiOff className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                 <h2 className="text-xl font-semibold mb-2">You are Offline</h2>
                 <p className="text-muted-foreground mb-6">Booking details cannot be loaded. Check your connection or view saved tickets below.</p>
                 {/* Section to display any offline tickets found */}
                 {offlineTickets.length > 0 && (
                     <div className="mt-8 max-w-md mx-auto">
                         <h3 className="font-semibold text-lg text-primary border-b pb-1 mb-4">Offline Tickets</h3>
                         <ul className="space-y-2 text-left">
                            {offlineTickets.map((ticket) => (
                                 <li key={ticket.id} className="flex items-center justify-between p-3 border rounded-md bg-secondary/50">
                                     <div className="flex items-center gap-2 text-sm">
                                         <Ticket className="h-5 w-5 text-accent"/>
                                         <span>Ticket {ticket.id.slice(-6)}... ({ticket.eventTitle})</span>
                                     </div>
                                     <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDownloadTicket(ticket.id)} // This will load from offline store
                                    >
                                        <Download className="mr-2 h-4 w-4" /> View Offline
                                    </Button>
                                 </li>
                             ))}
                         </ul>
                     </div>
                 )}
                 <Button variant="outline" onClick={() => router.back()} className="mt-6">Go Back</Button>
            </div>
         );
     }

    // If online but errored fetching booking
    if (isError && !isOffline) {
        return (
            <div className="container mx-auto py-16 text-center">
                <AlertCircle className="h-10 w-10 mx-auto text-destructive mb-4" />
                <h2 className="text-xl font-semibold text-destructive mb-2">Error Loading Booking</h2>
                <p className="text-muted-foreground mb-6">{error?.message || "Could not load booking details."}</p>
                <Button variant="outline" onClick={() => refetch()}>Retry</Button>
                <Button variant="link" onClick={() => router.back()}>Go Back</Button>
            </div>
        );
    }

    // If no booking data found (even after loading/cache check)
    if (!booking) {
        return (
            <div className="container mx-auto py-16 text-center">
                <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">Booking Not Found</h2>
                <p className="text-muted-foreground mb-6">The requested booking could not be found.</p>
                <Button variant="outline" asChild>
                    <Link href="/my-bookings">My Bookings</Link>
                </Button>
            </div>
        );
    }

    // Booking details available (online or from cache)
    const bookingDate = new Date(booking.createdAt);
    const eventDate = booking.event ? new Date(booking.event.date) : null;
    const isConfirmed = booking.status === BookingStatus.CONFIRMED;

    // Combine online ticket IDs with offline ticket IDs for display
    const allAvailableTicketIds = booking.tickets.map(t => t.id);
    const offlineTicketIds = offlineTickets.map(t => t.id);
    const ticketsToShow = Array.from(new Set([...allAvailableTicketIds, ...offlineTicketIds]));


    return (
        <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 max-w-4xl">
             <Button variant="outline" size="sm" onClick={() => router.push('/my-bookings')} className="mb-6">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Bookings
            </Button>
             {isOffline && (
                 <Alert variant="default" className="mb-6 bg-yellow-50 border-yellow-200 text-yellow-800 [&>svg]:text-yellow-600">
                     <WifiOff className="h-4 w-4" />
                     <AlertTitle>You are currently offline</AlertTitle>
                     <AlertDescription>
                         Showing cached booking details. Ticket download requires an internet connection unless already saved offline.
                     </AlertDescription>
                 </Alert>
             )}

            <Card className="shadow-lg border border-border">
                <CardHeader className="bg-secondary/30">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                         <div>
                            <CardTitle className="text-2xl text-primary mb-1">Booking Details</CardTitle>
                            <CardDescription className="font-mono text-xs">ID: {booking.id}</CardDescription>
                        </div>
                        <Badge variant={
                            booking.status === 'PENDING' ? 'outline' :
                            booking.status === 'PROCESSING' ? 'secondary' :
                            booking.status === 'CONFIRMED' ? 'default' :
                            'destructive'
                        } className={`text-sm ${
                             booking.status === 'PENDING' ? 'border-yellow-500 text-yellow-700' :
                             booking.status === 'PROCESSING' ? 'border-blue-500 text-blue-700 bg-blue-50' :
                             booking.status === 'CONFIRMED' ? 'bg-green-600 text-white hover:bg-green-700' :
                             (booking.status === 'FAILED' || booking.status === 'CANCELLED') ? 'bg-red-600 text-white hover:bg-red-700' : ''
                        }`}>
                           Status: {booking.status}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    {/* Status Specific Alerts */}
                     {booking.status === 'PROCESSING' && !isOffline && (
                         <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800 [&>svg]:text-blue-600">
                            <Info className="h-4 w-4" />
                            <AlertTitle>Payment Verification Pending</AlertTitle>
                            <AlertDescription>
                                Your payment (UTR: {booking.utr || 'N/A'}) is being verified. Tickets will be available once confirmed.
                            </AlertDescription>
                         </Alert>
                     )}
                     {booking.status === 'PENDING' && !isOffline && (
                         <Alert variant="default" className="bg-yellow-50 border-yellow-200 text-yellow-800 [&>svg]:text-yellow-600">
                             <Info className="h-4 w-4" />
                             <AlertTitle>Action Required</AlertTitle>
                             <AlertDescription>
                                Your booking is pending payment or UTR submission. Please complete the payment process.
                             </AlertDescription>
                         </Alert>
                     )}
                     {(booking.status === 'FAILED' || booking.status === 'CANCELLED') && (
                         <Alert variant="destructive">
                             <AlertCircle className="h-4 w-4" />
                             <AlertTitle>Booking {booking.status}</AlertTitle>
                             <AlertDescription>
                                 This booking was {booking.status.toLowerCase()}. If you believe this is an error, please contact support.
                             </AlertDescription>
                         </Alert>
                     )}


                    {/* Event Details */}
                    {booking.event && (
                         <div className="space-y-3">
                            <h3 className="font-semibold text-lg text-primary border-b pb-1">Event Information</h3>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                 <p><strong className="text-muted-foreground">Event:</strong> {booking.event.title}</p>
                                 <p><strong className="text-muted-foreground">Venue:</strong> {booking.event.location}</p>
                                 {eventDate && (
                                     <p><strong className="text-muted-foreground">Date:</strong> {format(eventDate, 'PPP')}</p>
                                 )}
                                 {eventDate && (
                                     <p><strong className="text-muted-foreground">Time:</strong> {format(eventDate, 'p')}</p>
                                 )}
                            </div>
                        </div>
                    )}

                    {/* Booking Summary */}
                    <div className="space-y-3">
                         <h3 className="font-semibold text-lg text-primary border-b pb-1">Booking Summary</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                            <p><strong className="text-muted-foreground">Booked On:</strong> {format(bookingDate, 'PPP p')}</p>
                            <p><strong className="text-muted-foreground">Total Price:</strong> ₹{booking.totalPrice.toLocaleString('en-IN')}</p>
                            <p><strong className="text-muted-foreground">Quantity:</strong> {booking.quantity} ticket(s)</p>
                            <p><strong className="text-muted-foreground">UTR:</strong> {booking.utr || 'N/A'}</p>
                        </div>
                    </div>

                    {/* Seat Details */}
                    {booking.seats && booking.seats.length > 0 && (
                         <div className="space-y-3">
                             <h3 className="font-semibold text-lg text-primary border-b pb-1">Seat Details</h3>
                            <div className="flex flex-wrap gap-2">
                                {booking.seats.map(seat => (
                                    <Badge key={seat.id} variant="secondary" className="font-mono text-xs">
                                        {seat.section ? `${seat.section}-` : ''}{seat.row}{seat.number}
                                    </Badge>
                                ))}
                            </div>
                         </div>
                     )}

                    {/* Delivery Details */}
                    {(booking.deliveryName || booking.deliveryEmail || booking.deliveryPhone) && (
                         <div className="space-y-3">
                             <h3 className="font-semibold text-lg text-primary border-b pb-1">Ticket Holder</h3>
                             <div className="text-sm space-y-1">
                                 {booking.deliveryName && <p><strong className="text-muted-foreground">Name:</strong> {booking.deliveryName}</p>}
                                 {booking.deliveryEmail && <p><strong className="text-muted-foreground">Email:</strong> {booking.deliveryEmail}</p>}
                                 {booking.deliveryPhone && <p><strong className="text-muted-foreground">Phone:</strong> {booking.deliveryPhone}</p>}
                            </div>
                         </div>
                     )}

                    {/* Tickets Section */}
                    {isConfirmed && ticketsToShow.length > 0 && (
                         <div className="space-y-4">
                            <Separator />
                             <h3 className="font-semibold text-lg text-primary">Your Tickets</h3>
                            <ul className="space-y-2">
                                {ticketsToShow.map((ticketId, index) => {
                                    const isOfflineAvailable = offlineTicketIds.includes(ticketId);
                                    return (
                                         <li key={ticketId} className="flex items-center justify-between p-3 border rounded-md bg-secondary/50">
                                             <div className="flex items-center gap-2 text-sm">
                                                 <Ticket className={`h-5 w-5 ${isOfflineAvailable ? 'text-green-600' : 'text-accent'}`}/>
                                                 <span>Ticket {index + 1} {isOfflineAvailable && <Badge variant="outline" className="ml-1 border-green-300 text-green-700 text-xs">Offline</Badge>}</span>
                                                 {/* Seat info lookup based on ticketId would be complex here if not directly linked */}
                                             </div>
                                             <Button
                                                variant={isOfflineAvailable ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => handleDownloadTicket(ticketId)}
                                                disabled={isLoading || (isOffline && !isOfflineAvailable)} // Disable online download if offline
                                             >
                                                 <Download className="mr-2 h-4 w-4" /> {isOfflineAvailable ? 'View Offline' : (isOffline ? 'Offline' : 'Download')}
                                             </Button>
                                         </li>
                                     );
                                })}
                            </ul>
                            <p className="text-xs text-muted-foreground">
                               {isConfirmed && !isOffline ? `Your tickets have also been sent to ${booking.deliveryEmail || booking.user?.email}.` : ''}
                               {offlineTickets.length > 0 && ` Green tickets are available offline.`}
                            </p>
                         </div>
                     )}
                      {isConfirmed && ticketsToShow.length === 0 && !isOffline && ( // Show generating message only if online and no tickets yet
                         <div className="space-y-4">
                            <Separator />
                             <h3 className="font-semibold text-lg text-primary">Tickets</h3>
                             <Alert variant="default" className="bg-yellow-50 border-yellow-200 text-yellow-800 [&>svg]:text-yellow-600">
                                 <Loader2 className="h-4 w-4 animate-spin" />
                                 <AlertTitle>Tickets Generating</AlertTitle>
                                 <AlertDescription>
                                    Your tickets are being generated and will appear here shortly. You will also receive them via email. Please refresh in a few moments.
                                 </AlertDescription>
                             </Alert>
                         </div>
                     )}

                </CardContent>
                 {/* Optional Footer Actions */}
                 {/* <CardFooter className="border-t pt-4">
                     {booking.status === 'PENDING' && <Button>Complete Payment</Button>}
                 </CardFooter> */}
            </Card>
        </div>
    );
}
