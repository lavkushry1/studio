// src/components/admin/AdminPaymentVerification.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllBookingsForAdmin, verifyBookingPayment } from '@/services/bookingService'; // Assuming these exist
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Check, X, Filter, Search, RefreshCw } from 'lucide-react';
import type { Booking as BookingType, BookingStatus } from '@prisma/client';
import { format } from 'date-fns'; // For date formatting
import { Pagination } from '@/components/ui/pagination'; // Assuming Pagination component exists

// Define Booking structure including relations if needed based on API response
interface BookingWithDetails extends BookingType {
    event: { id: string; title: string; } | null;
    user: { id: string; email: string; name: string | null; } | null;
    seats: { id: string; row: string; number: number; section: string | null; }[];
}


export function AdminPaymentVerification() {
    const { getAccessToken } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [filters, setFilters] = useState<{ status: BookingStatus | 'ALL', searchTerm: string }>({
        status: 'PROCESSING', // Default to processing
        searchTerm: '',
    });
    const [page, setPage] = useState(1);
    const [limit] = useState(10); // Items per page

    const token = getAccessToken();

    // Prepare query parameters
    const queryParams = useMemo(() => {
        const params: Record<string, string> = {
            page: page.toString(),
            limit: limit.toString(),
            sortBy: 'createdAt', // Sort by creation date
            order: 'desc', // Show newest first
        };
        if (filters.status !== 'ALL') {
            params.status = filters.status;
        }
        if (filters.searchTerm) {
            params.q = filters.searchTerm; // Assuming backend supports 'q' for search
        }
        return params;
    }, [filters, page, limit]);


    // Fetch bookings data for admin (requires token)
    const { data, isLoading, isError, error, refetch } = useQuery<{ bookings: BookingWithDetails[], totalCount: number, totalPages: number }, Error>({
        queryKey: ['adminBookings', queryParams],
        queryFn: () => getAllBookingsForAdmin(token!, queryParams), // Pass token and query params
        enabled: !!token,
        keepPreviousData: true, // Keep displaying old data while loading new page/filters
    });

    const bookings = data?.bookings ?? [];
    const totalCount = data?.totalCount ?? 0;
    const totalPages = data?.totalPages ?? 1;

    // Mutation for verifying/rejecting payment
    const { mutate: verifyPayment, isLoading: isVerifying } = useMutation({
        mutationFn: ({ bookingId, approve }: { bookingId: string; approve: boolean }) => verifyBookingPayment(bookingId, approve, token!),
        onSuccess: (_, variables) => {
            toast({
                title: `Payment ${variables.approve ? 'Approved' : 'Rejected'}`,
                description: `Booking ${variables.bookingId} status updated successfully.`,
            });
            // Invalidate or refetch the bookings query to update the list
            queryClient.invalidateQueries(['adminBookings']);
            // OR: refetch();
        },
        onError: (error: any, variables) => {
            toast({
                title: `Verification Failed`,
                description: error.message || `Could not update status for booking ${variables.bookingId}.`,
                variant: "destructive",
            });
        },
    });

    const handleFilterChange = (key: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1); // Reset page when filters change
    };

    const handleVerify = (bookingId: string, approve: boolean) => {
        if (isVerifying) return; // Prevent multiple clicks
        verifyPayment({ bookingId, approve });
    };


    return (
        <div className="space-y-6">
            {/* Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg bg-secondary/30">
                <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label htmlFor="status-filter">Status</Label>
                        <Select
                            value={filters.status}
                            onValueChange={(value) => handleFilterChange('status', value)}
                        >
                            <SelectTrigger id="status-filter">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Statuses</SelectItem>
                                <SelectItem value="PROCESSING">Processing (UTR Submitted)</SelectItem>
                                <SelectItem value="PENDING">Pending (No UTR yet)</SelectItem>
                                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                                <SelectItem value="FAILED">Failed/Rejected</SelectItem>
                                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                         <Label htmlFor="search-filter">Search</Label>
                         <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="search-filter"
                                placeholder="Booking ID, UTR, Email..."
                                value={filters.searchTerm}
                                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                                className="pl-8"
                            />
                         </div>
                    </div>
                </div>
                 <div className="flex items-end">
                    <Button onClick={() => refetch()} variant="outline" size="icon" disabled={isLoading}>
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                         <span className="sr-only">Refresh</span>
                    </Button>
                 </div>
            </div>

            {/* Bookings Table */}
            <div className="border rounded-lg overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead>Booking ID</TableHead>
                            <TableHead>Event</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>UTR</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead>Created At</TableHead>
                            <TableHead className="text-right w-[180px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center h-32">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                    Loading payments...
                                </TableCell>
                            </TableRow>
                        ) : isError ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center h-32 text-destructive">
                                    Error loading data: {error?.message || 'Unknown error'}
                                </TableCell>
                            </TableRow>
                        ) : bookings.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center h-32 text-muted-foreground">
                                    No bookings found matching the criteria.
                                </TableCell>
                            </TableRow>
                        ) : (
                            bookings.map((booking) => (
                                <TableRow key={booking.id} className="hover:bg-secondary/50">
                                    <TableCell className="font-mono text-xs">{booking.id}</TableCell>
                                    <TableCell className="text-xs">{booking.event?.title || 'N/A'}</TableCell>
                                    <TableCell className="text-xs">{booking.user?.email || booking.deliveryEmail || 'Anonymous'}</TableCell>
                                    <TableCell className="font-mono text-xs">{booking.utr || '-'}</TableCell>
                                    <TableCell className="text-right font-medium">₹{booking.totalPrice.toLocaleString('en-IN')}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={
                                            booking.status === 'PENDING' ? 'outline' :
                                            booking.status === 'PROCESSING' ? 'secondary' :
                                            booking.status === 'CONFIRMED' ? 'default' :
                                            'destructive'
                                        } className={
                                             booking.status === 'PENDING' ? 'border-yellow-500 text-yellow-700' :
                                             booking.status === 'PROCESSING' ? 'border-blue-500 text-blue-700 bg-blue-50' :
                                             booking.status === 'CONFIRMED' ? 'bg-green-600 text-white hover:bg-green-700' :
                                             (booking.status === 'FAILED' || booking.status === 'CANCELLED') ? 'bg-red-600 text-white hover:bg-red-700' : ''
                                        }>
                                            {booking.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {format(new Date(booking.createdAt), 'dd MMM yyyy, HH:mm')}
                                    </TableCell>
                                    <TableCell className="text-right space-x-1">
                                        {(booking.status === 'PROCESSING' || booking.status === 'PENDING') ? ( // Allow verify if PROCESSING or even PENDING
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 px-2 text-green-600 hover:bg-green-100 hover:text-green-700"
                                                    onClick={() => handleVerify(booking.id, true)}
                                                    disabled={isVerifying}
                                                >
                                                    <Check className="h-4 w-4 mr-1" /> Approve
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 px-2 text-destructive hover:bg-red-100 hover:text-destructive"
                                                    onClick={() => handleVerify(booking.id, false)}
                                                    disabled={isVerifying}
                                                >
                                                    <X className="h-4 w-4 mr-1" /> Reject
                                                </Button>
                                            </>
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">Verified</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

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
