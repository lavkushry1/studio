'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getBookingById } from '@/services/bookingService'; // Assuming service exists
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, ArrowLeft, Ticket, Download, CalendarDays, MapPin, User, Info } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import type { Booking as BookingType, BookingStatus, Seat as SeatType, Event as EventType, Ticket as TicketType } from '@prisma/client'; // Import Prisma types

// Define extended type based on API response (including relations)
interface BookingDetails extends BookingType {
    event: { id: string; title: string; date: Date | string; location: string } | null;
    user: { id: string; email: string; name: string | null; } | null;
    seats: SeatType[];
    tickets: { id: string }[]; // Just need ticket IDs for download links
}

export default function BookingDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const bookingId = params.bookingId as string;
    const { getAccessToken, isLoading: authLoading } = useAuth();

    const token = getAccessToken();

    const { data: booking, isLoading, isError, error } = useQuery<BookingDetails, Error>({
        queryKey: ['bookingDetails', bookingId],
        queryFn: () => getBookingById(bookingId, token!),
        enabled: !!bookingId && !!token && !authLoading, // Only run when bookingId and token are available
    });

    const handleDownloadTicket = (ticketId: string) => {
        // Construct the download URL for the backend endpoint
        const downloadUrl = `/api/bookings/${bookingId}/tickets/${ticketId}/download`;
        // Open the URL in a new tab or trigger download directly
        window.open(downloadUrl, '_blank');
        // TODO: Handle potential errors during download initiation (e.g., backend issues)
    };

    if (isLoading || authLoading) {
        return (
            <div className="container mx-auto py-16 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-accent" />
                <p className="mt-4 text-muted-foreground">Loading booking details...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="container mx-auto py-16 text-center">
                <AlertCircle className="h-10 w-10 mx-auto text-destructive mb-4" />
                <h2 className="text-xl font-semibold text-destructive mb-2">Error Loading Booking</h2>
                <p className="text-muted-foreground mb-6">{error?.message || "Could not load booking details."}</p>
                <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
            </div>
        );
    }

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

    const bookingDate = new Date(booking.createdAt);
    const eventDate = booking.event ? new Date(booking.event.date) : null;
    const isConfirmed = booking.status === BookingStatus.CONFIRMED;

    return (
        <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 max-w-4xl">
             <Button variant="outline" size="sm" onClick={() => router.push('/my-bookings')} className="mb-6">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Bookings
            </Button>

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
                     {booking.status === 'PROCESSING' && (
                         <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800 [&>svg]:text-blue-600">
                            <Info className="h-4 w-4" />
                            <AlertTitle>Payment Verification Pending</AlertTitle>
                            <AlertDescription>
                                Your payment (UTR: {booking.utr || 'N/A'}) is being verified by our team. Tickets will be available once confirmed.
                            </AlertDescription>
                         </Alert>
                     )}
                     {booking.status === 'PENDING' && (
                         <Alert variant="default" className="bg-yellow-50 border-yellow-200 text-yellow-800 [&>svg]:text-yellow-600">
                             <Info className="h-4 w-4" />
                             <AlertTitle>Action Required</AlertTitle>
                             <AlertDescription>
                                Your booking is pending payment or UTR submission. Please complete the payment process.
                                {/* Optionally add a link back to checkout/payment */}
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
                    {isConfirmed && booking.tickets && booking.tickets.length > 0 && (
                         <div className="space-y-4">
                            <Separator />
                             <h3 className="font-semibold text-lg text-primary">Your Tickets</h3>
                            <ul className="space-y-2">
                                {booking.tickets.map((ticket, index) => (
                                    <li key={ticket.id} className="flex items-center justify-between p-3 border rounded-md bg-secondary/50">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Ticket className="h-5 w-5 text-accent"/>
                                            <span>Ticket {index + 1}</span>
                                            {/* Optionally display associated seat info here */}
                                             {booking.seats.find(s => s.ticketId === ticket.id) && (
                                                 <Badge variant="outline" className="font-mono text-xs">
                                                    Seat: {booking.seats.find(s => s.ticketId === ticket.id)?.row}{booking.seats.find(s => s.ticketId === ticket.id)?.number}
                                                 </Badge>
                                             )}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDownloadTicket(ticket.id)}
                                        >
                                            <Download className="mr-2 h-4 w-4" /> Download PDF
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                            <p className="text-xs text-muted-foreground">Your tickets have also been sent to {booking.deliveryEmail || booking.user?.email}. Please check your inbox (and spam folder).</p>
                         </div>
                     )}
                      {isConfirmed && (!booking.tickets || booking.tickets.length === 0) && (
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
