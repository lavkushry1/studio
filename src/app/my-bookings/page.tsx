'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMyBookings } from '@/services/bookingService'; // Assuming service exists
import { useAuth } from '@/hooks/useAuth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Ticket, Eye } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Pagination } from '@/components/ui/pagination'; // Assuming Pagination component exists
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; // Import Card components

// Define Booking structure including relations if needed based on API response
interface BookingWithDetails {
    id: string;
    eventId: string;
    event: { title: string; date: Date | string; location: string } | null;
    quantity: number;
    totalPrice: number;
    status: 'PENDING' | 'PROCESSING' | 'CONFIRMED' | 'CANCELLED' | 'FAILED';
    createdAt: Date | string;
    updatedAt: Date | string;
    tickets: { id: string }[]; // Array of associated ticket IDs
}

export default function MyBookingsPage() {
    const { user, getAccessToken, isLoading: authLoading } = useAuth();
    const [page, setPage] = useState(1);
    const [limit] = useState(10); // Items per page

    const token = getAccessToken();

    const queryParams = React.useMemo(() => ({
        page: page.toString(),
        limit: limit.toString(),
        sortBy: 'createdAt', // Sort by booking creation date
        order: 'desc',       // Show newest first
    }), [page, limit]);

    const { data, isLoading, isError, error } = useQuery<{ bookings: BookingWithDetails[], totalCount: number, totalPages: number }, Error>({
        queryKey: ['myBookings', queryParams],
        queryFn: async () => {
             // Fetch using API route which handles headers internally
             const response = await fetch(`/api/bookings?${new URLSearchParams(queryParams)}`);
             if (!response.ok) {
                 const errorData = await response.json();
                 throw new Error(errorData.message || 'Failed to fetch bookings');
             }
             const bookingsData = await response.json();
             const totalCount = parseInt(response.headers.get('X-Total-Count') || '0', 10);
             const totalPages = parseInt(response.headers.get('X-Total-Pages') || '1', 10);
             return { bookings: bookingsData, totalCount, totalPages };
        },
        enabled: !!user && !!token && !authLoading, // Only run when user and token are available
        keepPreviousData: true, // Keep showing old data while loading new page
    });

    const bookings = data?.bookings ?? [];
    const totalCount = data?.totalCount ?? 0;
    const totalPages = data?.totalPages ?? 1;


    if (authLoading || (isLoading && !data)) { // Show loading if auth is loading OR first fetch is loading
        return (
            <div className="container mx-auto py-16 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-accent" />
                <p className="mt-4 text-muted-foreground">Loading your bookings...</p>
            </div>
        );
    }

     if (!user) {
         // Should be caught by middleware, but good fallback
         return (
            <div className="container mx-auto py-16 text-center">
                 <AlertCircle className="h-10 w-10 mx-auto text-destructive mb-4" />
                <h2 className="text-xl font-semibold mb-2">Please Log In</h2>
                <p className="text-muted-foreground mb-6">You need to be logged in to view your bookings.</p>
                <Button asChild>
                     <Link href="/login?redirect=/my-bookings">Login</Link>
                 </Button>
            </div>
         );
     }


    return (
        <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-primary mb-8 flex items-center gap-3">
                <Ticket className="h-8 w-8 text-accent"/> My Bookings
            </h1>

            <Card className="shadow-lg border border-border">
                <CardHeader>
                     <CardTitle>Your Booking History</CardTitle>
                     <CardDescription>View details and status of your past and upcoming event bookings.</CardDescription>
                 </CardHeader>
                 <CardContent>
                     {isError && (
                         <div className="text-center py-8 text-destructive">
                             <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                             Error loading bookings: {error?.message || 'Unknown error'}
                         </div>
                     )}
                    {!isError && bookings.length === 0 && !isLoading && (
                         <div className="text-center py-16 text-muted-foreground">
                            <p>You haven't made any bookings yet.</p>
                            <Button variant="link" asChild className="mt-2">
                                <Link href="/events">Browse Events</Link>
                            </Button>
                         </div>
                     )}
                    {!isError && bookings.length > 0 && (
                         <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead>Event</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                        <TableHead>Booked On</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading && bookings.length === 0 ? ( // Show loading rows only if data is actually loading and we have none yet
                                         Array.from({ length: 3 }).map((_, i) => (
                                             <TableRow key={`loading-${i}`}>
                                                 <TableCell colSpan={6} className="h-16 text-center">
                                                     <Loader2 className="h-5 w-5 animate-spin inline-block text-muted-foreground" />
                                                 </TableCell>
                                             </TableRow>
                                         ))
                                     ) : (
                                         bookings.map((booking) => (
                                            <TableRow key={booking.id} className="hover:bg-secondary/50">
                                                <TableCell className="font-medium">{booking.event?.title || 'N/A'}</TableCell>
                                                <TableCell className="text-xs">
                                                    {booking.event?.date ? format(new Date(booking.event.date), 'dd MMM yyyy') : 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-right font-medium">₹{booking.totalPrice.toLocaleString('en-IN')}</TableCell>
                                                <TableCell className="text-center">
                                                     <Badge variant={
                                                         booking.status === 'PENDING' ? 'outline' :
                                                         booking.status === 'PROCESSING' ? 'secondary' :
                                                         booking.status === 'CONFIRMED' ? 'default' :
                                                         'destructive'
                                                     } className={`text-xs ${
                                                         booking.status === 'PENDING' ? 'border-yellow-500 text-yellow-700' :
                                                         booking.status === 'PROCESSING' ? 'border-blue-500 text-blue-700 bg-blue-50' :
                                                         booking.status === 'CONFIRMED' ? 'bg-green-600 text-white hover:bg-green-700' :
                                                         (booking.status === 'FAILED' || booking.status === 'CANCELLED') ? 'bg-red-600 text-white hover:bg-red-700' : ''
                                                     }`}>
                                                         {booking.status}
                                                     </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {format(new Date(booking.createdAt), 'dd MMM yyyy, HH:mm')}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button asChild variant="ghost" size="sm" className="h-8 px-2">
                                                        <Link href={`/my-bookings/${booking.id}`}>
                                                            <Eye className="mr-1 h-4 w-4" /> View Details
                                                        </Link>
                                                    </Button>
                                                    {/* Add cancel button if applicable */}
                                                     {/* { (booking.status === 'PENDING' || booking.status === 'PROCESSING') &&
                                                         <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive h-8 px-2">Cancel</Button>
                                                     } */}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                 </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="mt-6 flex justify-center">
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                    />
                </div>
            )}
        </div>
    );
}
