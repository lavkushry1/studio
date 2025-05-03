'use client';

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EventFormValues, eventFormSchema, TicketCategoryFormValues } from '@/lib/validation/event';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"; // Added SelectGroup, SelectLabel
import { cn } from "@/lib/utils";
import { CalendarIcon, PlusCircle, Trash2, Loader2, Upload, Image as ImageIcon, Tag, Users } from "lucide-react"; // Added Users icon for Team
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { createEvent, getTeams } from '@/services/eventService'; // Added getTeams
import { useAuth } from '@/hooks/useAuth';
import { EventStatus, Team } from '@prisma/client'; // Import EventStatus and Team
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';

interface EventFormProps {
    initialData?: EventFormValues & { teamId?: string | null }; // For editing later, include teamId
}

export function EventForm({ initialData }: EventFormProps) {
    const { toast } = useToast();
    const router = useRouter();
    const { user, getAccessToken } = useAuth(); // Use useAuth hook
    const [isLoading, setIsLoading] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imageUrl || null);

    const form = useForm<EventFormValues>({
        resolver: zodResolver(eventFormSchema),
        defaultValues: initialData || {
            title: '',
            description: '',
            category: '', // Initialize category
            date: undefined, // Start with undefined for date picker
            location: '',
            imageUrl: '',
            status: EventStatus.DRAFT, // Default status
            teamId: null, // Initialize teamId as null
            ticketCategories: [{ name: '', price: 0, totalQty: 0 }], // Start with one empty category
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "ticketCategories",
    });

     // Fetch teams for the dropdown
    const { data: teams, isLoading: isLoadingTeams } = useQuery<Team[]>({
        queryKey: ['teams'],
        queryFn: () => getTeams(getAccessToken()!), // Assuming getTeams requires token
        enabled: !!getAccessToken(),
    });


    // Handle image URL change and preview
    const handleImageUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const url = event.target.value;
        form.setValue('imageUrl', url); // Update form value
        // Basic validation for preview
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            setImagePreview(url);
        } else {
            setImagePreview(null);
        }
    };

    // Handle date change to include time (basic example, needs time input)
    const handleDateChange = (date: Date | undefined) => {
        if (date) {
            // You might want to add time selection here
            // For now, just sets the date part
            form.setValue('date', date);
        }
    };


    async function onSubmit(values: EventFormValues) {
        setIsLoading(true);
        const token = getAccessToken();

        if (!token) {
            toast({
                title: "Authentication Error",
                description: "You must be logged in to create an event.",
                variant: "destructive",
            });
            setIsLoading(false);
            router.push('/login'); // Redirect to login
            return;
        }

        try {
            // Convert Date object to ISO string for backend
             const dataToSend = {
                 ...values,
                 date: values.date.toISOString(),
                 // Ensure image URL is empty string if not provided, not null/undefined
                 imageUrl: values.imageUrl || undefined, // Send undefined if empty for optional field
                 teamId: values.teamId || null, // Ensure teamId is null if empty or 'none'
             };

            console.log("Submitting data:", dataToSend);

            const newEvent = await createEvent(dataToSend, token);
            toast({
                title: "Event Created",
                description: `"${newEvent.title}" has been successfully created.`,
            });
            // TODO: Redirect to the newly created event's detail page or admin event list
            // Example: router.push(`/admin/events/${newEvent.id}`);
            router.push('/admin/events'); // Redirect to events list for now
        } catch (error: any) {
            console.error("Failed to create event:", error);
            toast({
                title: "Error Creating Event",
                description: error.message || "An unexpected error occurred.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Event Details</CardTitle>
                        <CardDescription>Provide the main information about the event.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Event Title</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., IPL Finals 2024" {...field} disabled={isLoading} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Category</FormLabel>
                                    <FormControl>
                                        <div className="flex items-center gap-2">
                                             <Tag className="h-5 w-5 text-muted-foreground"/>
                                             <Input placeholder="e.g., Sports, Music, Conference" {...field} disabled={isLoading} />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Describe the event..." {...field} disabled={isLoading} rows={5} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Date & Time</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "pl-3 text-left font-normal",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                        disabled={isLoading}
                                                    >
                                                        {field.value ? (
                                                            format(field.value, "PPP HH:mm") // Basic format, add time later
                                                        ) : (
                                                            <span>Pick a date</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={(date) => handleDateChange(date)}
                                                    disabled={(date) =>
                                                        date < new Date(new Date().setHours(0, 0, 0, 0)) || isLoading // Disable past dates
                                                    }
                                                    initialFocus
                                                />
                                                {/* Add Time Picker component here if needed */}
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="location"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Location</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., Wankhede Stadium, Mumbai" {...field} disabled={isLoading} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                         <FormField
                            control={form.control}
                            name="teamId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Associated Team (Optional)</FormLabel>
                                     <Select
                                         onValueChange={(value) => field.onChange(value === 'none' ? null : value)} // Set null if 'none' selected
                                         defaultValue={field.value || 'none'} // Default to 'none' if null/undefined
                                         disabled={isLoading || isLoadingTeams}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                 <SelectValue placeholder="Select a team (optional)" />
                                            </SelectTrigger>
                                        </FormControl>
                                         <SelectContent>
                                            <SelectItem value="none">-- No Team --</SelectItem>
                                            {isLoadingTeams && <SelectItem value="loading" disabled>Loading teams...</SelectItem>}
                                            {teams?.map((team) => (
                                                <SelectItem key={team.id} value={team.id}>
                                                     {team.name} ({team.shortName})
                                                 </SelectItem>
                                            ))}
                                         </SelectContent>
                                     </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="imageUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Event Image URL</FormLabel>
                                    <FormControl>
                                        <div className="flex items-center gap-2">
                                           <ImageIcon className="h-5 w-5 text-muted-foreground"/>
                                            <Input
                                               type="url"
                                               placeholder="https://example.com/image.jpg"
                                               {...field}
                                               onChange={handleImageUrlChange} // Use custom handler
                                               disabled={isLoading}
                                            />
                                        </div>
                                    </FormControl>
                                    {imagePreview && (
                                        <div className="mt-2 relative w-full aspect-video max-w-sm rounded border overflow-hidden">
                                            <Image src={imagePreview} alt="Image Preview" layout="fill" objectFit="cover" />
                                        </div>
                                    )}
                                     {!imagePreview && field.value && <FormMessage>Invalid URL or unable to load preview.</FormMessage>}
                                     {!field.value && <p className="text-xs text-muted-foreground pt-1">Optional: Provide a URL for the event's promotional image.</p>}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Status</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select event status" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value={EventStatus.DRAFT}>Draft</SelectItem>
                                            <SelectItem value={EventStatus.PUBLISHED}>Published</SelectItem>
                                            <SelectItem value={EventStatus.CANCELLED}>Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Ticket Categories</CardTitle>
                        <CardDescription>Define the types of tickets available for this event.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {fields.map((field, index) => (
                            <div key={field.id} className="p-4 border rounded-md relative space-y-3 bg-secondary/30">
                                <h4 className="font-medium text-sm">Category {index + 1}</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <FormField
                                        control={form.control}
                                        name={`ticketCategories.${index}.name`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Category Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g., General Admission" {...field} disabled={isLoading} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`ticketCategories.${index}.price`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Price (₹)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="e.g., 1500" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} disabled={isLoading} min="0" step="0.01" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`ticketCategories.${index}.totalQty`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Total Quantity</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="e.g., 5000" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} disabled={isLoading} min="1" step="1" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                {fields.length > 1 && (
                                     <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => remove(index)}
                                        className="absolute top-2 right-2 text-destructive hover:bg-destructive/10 h-7 w-7"
                                        disabled={isLoading}
                                        aria-label="Remove category"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => append({ name: '', price: 0, totalQty: 0 })}
                            disabled={isLoading}
                            className="mt-2"
                        >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Ticket Category
                        </Button>
                         {form.formState.errors.ticketCategories && !Array.isArray(form.formState.errors.ticketCategories) && (
                            <p className="text-sm font-medium text-destructive">
                                {form.formState.errors.ticketCategories.message}
                            </p>
                        )}
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                        <Button type="submit" disabled={isLoading} className="bg-accent text-accent-foreground hover:bg-accent/90">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {initialData ? 'Update Event' : 'Create Event'}
                        </Button>
                         <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading} className="ml-auto">
                            Cancel
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    );
}
