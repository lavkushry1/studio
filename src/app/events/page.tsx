'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Loader2, Ticket } from 'lucide-react';
import { getEvents } from '@/services/eventService';
import type { Event as EventType } from '@prisma/client'; // Assuming Event type from Prisma
import { Pagination } from '@/components/ui/pagination'; // Assuming Pagination component exists
import { useToast } from '@/hooks/use-toast';

// Assuming EventResponse includes necessary fields like ticketCategories, organizer etc.
interface EventResponse extends EventType {
    ticketCategories: any[]; // Replace 'any' with actual TicketCategory type if available
    organizer: { id: string; name: string | null; email: string };
}

// Simple state management for filters (can be replaced with Zustand or similar)
interface FilterState {
    q: string;
    category: string;
    location: string;
    date: string;
    page: number;
    limit: number;
}

const initialFilterState: FilterState = {
    q: '',
    category: '',
    location: '',
    date: '',
    page: 1,
    limit: 9, // Default items per page
};

export default function EventsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    // Component state for filters, initialized from URL search params
    const [filters, setFilters] = useState<FilterState>(() => {
        const params = new URLSearchParams(searchParams.toString());
        return {
            q: params.get('q') || initialFilterState.q,
            category: params.get('category') || initialFilterState.category,
            location: params.get('location') || initialFilterState.location,
            date: params.get('date') || initialFilterState.date,
            page: parseInt(params.get('page') || `${initialFilterState.page}`, 10),
            limit: parseInt(params.get('limit') || `${initialFilterState.limit}`, 10),
        };
    });

    // Update URL when filters change (debounced for text inputs)
     useEffect(() => {
        const params = new URLSearchParams();
        if (filters.q) params.set('q', filters.q);
        if (filters.category && filters.category !== 'all') params.set('category', filters.category);
        if (filters.location) params.set('location', filters.location);
        if (filters.date) params.set('date', filters.date); // Assuming date is YYYY-MM-DD
        if (filters.page > 1) params.set('page', filters.page.toString());
        if (filters.limit !== initialFilterState.limit) params.set('limit', filters.limit.toString());

        // Use replace to avoid adding multiple history entries for filter changes
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, [filters, pathname, router]);


    const handleFilterChange = (key: keyof FilterState, value: string | number) => {
         // Reset page to 1 when filters other than pagination change
        const resetPage = key !== 'page' && key !== 'limit';
        setFilters(prev => ({
            ...prev,
            [key]: value,
            page: resetPage ? 1 : prev.page,
        }));
    };

    const handleResetFilters = () => {
        setFilters(initialFilterState);
    }


    // Fetch events using React Query
    const { data, isLoading, isError, error } = useQuery<{ events: EventResponse[], totalCount: number, totalPages: number }>({
        queryKey: ['events', filters], // Query key includes filters
        queryFn: async () => {
            const params: Record<string, string> = {
                page: filters.page.toString(),
                limit: filters.limit.toString(),
            };
            if (filters.q) params.q = filters.q;
            if (filters.category && filters.category !== 'all') params.category = filters.category;
            if (filters.location) params.location = filters.location;
            // Assuming date format YYYY-MM-DD for startDate filter
            if (filters.date) params.startDate = filters.date;

            const response = await fetch(`/api/events?${new URLSearchParams(params)}`);

             if (!response.ok) {
                 const errorData = await response.json();
                 throw new Error(errorData.message || 'Failed to fetch events');
             }

             const events = await response.json();
             const totalCount = parseInt(response.headers.get('X-Total-Count') || '0', 10);
             const totalPages = parseInt(response.headers.get('X-Total-Pages') || '1', 10);

             return { events, totalCount, totalPages };
        },
        keepPreviousData: true, // Keep showing old data while new data loads
    });

     useEffect(() => {
        if (isError && error) {
             toast({
                 title: "Error Fetching Events",
                 description: (error as Error).message || "Could not load events.",
                 variant: "destructive",
             });
        }
    }, [isError, error, toast]);

    const events = data?.events ?? [];
    const totalCount = data?.totalCount ?? 0;
    const totalPages = data?.totalPages ?? 1;

    return (
        <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-primary mb-8">Discover Events</h1>

            {/* Filter and Search Section */}
            <Card className="mb-10 bg-card shadow-lg border border-border">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Filter className="h-5 w-5 text-primary" /> Filter & Search
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-xs text-muted-foreground">Reset Filters</Button>
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div className="space-y-1.5">
                        <Label htmlFor="search">Search Events</Label>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="search"
                                placeholder="Name, location, category..."
                                className="bg-background pl-8"
                                value={filters.q}
                                onChange={(e) => handleFilterChange('q', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="category">Category</Label>
                        <Select
                            value={filters.category}
                            onValueChange={(value) => handleFilterChange('category', value)}
                        >
                            <SelectTrigger id="category" className="bg-background">
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                <SelectItem value="Sports">Sports</SelectItem>
                                <SelectItem value="Music">Music</SelectItem>
                                <SelectItem value="Conference">Conference</SelectItem>
                                <SelectItem value="Workshop">Workshop</SelectItem>
                                <SelectItem value="Theater">Theater</SelectItem>
                                {/* Add more categories as needed */}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-1.5">
                        <Label htmlFor="location">Location</Label>
                        <Input
                            id="location"
                            placeholder="Enter location"
                            className="bg-background"
                            value={filters.location}
                            onChange={(e) => handleFilterChange('location', e.target.value)}
                         />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="date">Date (On or After)</Label>
                        <Input
                            id="date"
                            type="date"
                            className="bg-background"
                            value={filters.date}
                            onChange={(e) => handleFilterChange('date', e.target.value)}
                        />
                    </div>
                </CardContent>
                 {/* Optional: Add Apply Filters button if not updating URL on change */}
                {/* <CardFooter className="pt-4">
                    <Button onClick={() => { /* Manually trigger fetch or update URL */ }} className="ml-auto bg-accent text-accent-foreground hover:bg-accent/90">
                         Apply Filters
                    </Button>
                 </CardFooter> */}
            </Card>

            {/* Event Listing Section */}
            {isLoading ? (
                 <div className="text-center py-16">
                     <Loader2 className="h-12 w-12 animate-spin text-accent mx-auto" />
                     <p className="mt-4 text-muted-foreground">Loading events...</p>
                 </div>
            ) : isError ? (
                <div className="text-center py-16 text-destructive">
                    <p>Error loading events. Please try refreshing the page.</p>
                </div>
            ) : events.length > 0 ? (
                <>
                    <p className="text-sm text-muted-foreground mb-6">Showing {events.length} of {totalCount} events</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {events.map((event) => (
                            <Card key={event.id} className="overflow-hidden bg-card shadow-md hover:shadow-xl transition-all duration-300 flex flex-col border border-border hover:border-accent group">
                                <Link href={`/events/${event.id}`} className="block relative h-48 w-full bg-secondary overflow-hidden">
                                    {event.imageUrl ? (
                                        <Image
                                            src={event.imageUrl}
                                            alt={event.title}
                                            layout="fill"
                                            objectFit="cover"
                                            className="transition-transform duration-300 group-hover:scale-105"
                                            data-ai-hint="event image" // Generic hint
                                        />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center">
                                            <Ticket className="h-16 w-16 text-muted-foreground" />
                                        </div>
                                    )}
                                    {/* Optional: Add overlay or badge for category/status */}
                                    {event.category && (
                                        <Badge variant="secondary" className="absolute top-2 left-2">{event.category}</Badge>
                                    )}
                                </Link>
                                <CardHeader className="pb-3 pt-4">
                                    <CardTitle className="text-primary text-lg truncate group-hover:text-accent transition-colors">
                                         <Link href={`/events/${event.id}`}>{event.title}</Link>
                                    </CardTitle>
                                    <CardDescription className="text-sm">
                                        {new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} - {event.location}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow pb-4">
                                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{event.description}</p>
                                    {/* Display starting price or category info */}
                                    {event.ticketCategories && event.ticketCategories.length > 0 && (
                                         <p className="text-sm font-medium text-accent">
                                            Tickets from ₹{Math.min(...event.ticketCategories.map(tc => tc.price)).toLocaleString('en-IN')}
                                        </p>
                                    )}
                                </CardContent>
                                <CardFooter className="pt-0">
                                    <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                                        <Link href={`/events/${event.id}`}>View Details</Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                     {/* Pagination Controls */}
                     {totalPages > 1 && (
                         <div className="mt-10 flex justify-center">
                             <Pagination
                                currentPage={filters.page}
                                totalPages={totalPages}
                                onPageChange={(page) => handleFilterChange('page', page)}
                             />
                         </div>
                     )}
                </>
            ) : (
                <div className="text-center py-16 text-muted-foreground">
                    <p>No events found matching your criteria.</p>
                    <Button variant="link" onClick={handleResetFilters} className="mt-2">Reset Filters</Button>
                </div>
            )}
        </div>
    );
}
