'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEventById, getSeatMapForEvent, updateSeatLayout } from '@/services/seatEditorService'; // Adjust service imports
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Save, Plus, Trash2, ArrowLeft, Grid, Sofa, AlertTriangle } from 'lucide-react';
import type { Seat, Event, SeatStatus } from '@prisma/client'; // Use Prisma types
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

// Interface for seat data used in the form/editor state
interface EditorSeat extends Partial<Seat> {
    _id?: string; // Temporary ID for new seats in the UI
    row: string;
    number: number;
    section?: string;
    status?: SeatStatus;
}

export default function SeatLayoutEditorPage() {
    const params = useParams();
    const eventId = params.eventId as string;
    const router = useRouter();
    const { getAccessToken } = useAuth();
    const queryClient = useQueryClient();

    const [editorSeats, setEditorSeats] = useState<EditorSeat[]>([]);
    const [newSeat, setNewSeat] = useState<Omit<EditorSeat, 'id' | '_id'>>({ row: '', number: 1, section: '', status: 'AVAILABLE' });
    const [rowsToAdd, setRowsToAdd] = useState<{ prefix: string, count: number, seatsPerRow: number, section: string, startNum: number }>({ prefix: 'A', count: 1, seatsPerRow: 10, section: '', startNum: 1 });

    // Fetch event data
    const { data: eventData, isLoading: isLoadingEvent, isError: isErrorEvent } = useQuery<Event>({
        queryKey: ['event', eventId],
        queryFn: () => getEventById(eventId, getAccessToken() || ''), // Assuming service needs token
        enabled: !!eventId && !!getAccessToken(),
    });

    // Fetch existing seat map
    const { data: currentSeats, isLoading: isLoadingSeats, refetch: refetchSeats } = useQuery<Seat[]>({
        queryKey: ['seatMap', eventId],
        queryFn: () => getSeatMapForEvent(eventId, getAccessToken() || '', { showAll: true }), // Fetch all statuses
        enabled: !!eventId && !!getAccessToken(),
        onSuccess: (data) => {
            // Initialize editor state with fetched seats
            setEditorSeats(data.map(s => ({ ...s }))); // Create copies
        },
    });

    // Mutation for updating the seat layout
    const { mutate: saveLayout, isLoading: isSaving } = useMutation({
        mutationFn: (seatsToSave: Omit<EditorSeat, 'id' | '_id'>[]) => updateSeatLayout(eventId, seatsToSave, getAccessToken() || ''),
        onSuccess: () => {
            toast({ title: "Layout Saved", description: "Seat layout has been updated successfully." });
            queryClient.invalidateQueries(['seatMap', eventId]); // Invalidate cache to refetch
            refetchSeats();
        },
        onError: (error: any) => {
            toast({
                title: "Error Saving Layout",
                description: error.message || "Could not update seat layout.",
                variant: "destructive",
            });
        },
    });

    const handleAddSeat = () => {
        if (!newSeat.row || newSeat.number <= 0) {
            toast({ title: "Invalid Seat", description: "Please provide a valid row and positive number.", variant: "destructive" });
            return;
        }
        setEditorSeats(prev => [...prev, { ...newSeat, _id: `new-${Date.now()}` }]);
        setNewSeat({ row: '', number: 1, section: newSeat.section, status: 'AVAILABLE' }); // Reset form, keep section
    };

     const handleAddMultipleRows = () => {
        const { prefix, count, seatsPerRow, section, startNum } = rowsToAdd;
        if (!prefix || count <= 0 || seatsPerRow <= 0 || startNum <= 0) {
            toast({ title: "Invalid Input", description: "Please provide valid values for adding rows.", variant: "destructive" });
            return;
        }

        const addedSeats: EditorSeat[] = [];
        for (let i = 0; i < count; i++) {
             const currentRow = `${prefix}${String.fromCharCode(prefix.charCodeAt(0) + i)}`; // Simple increment, might need better logic
             // Or use numeric row prefix: const currentRow = `${prefix}${i + 1}`;
            for (let j = 0; j < seatsPerRow; j++) {
                addedSeats.push({
                    row: currentRow,
                    number: startNum + j,
                    section: section || undefined,
                    status: 'AVAILABLE',
                    _id: `new-${Date.now()}-${i}-${j}`,
                });
            }
        }
        setEditorSeats(prev => [...prev, ...addedSeats]);
        // Optionally reset rowsToAdd form or increment prefix/start number
    };


    const handleRemoveSeat = (idToRemove: string | undefined) => {
        setEditorSeats(prev => prev.filter(seat => (seat.id || seat._id) !== idToRemove));
    };

    const handleSeatChange = (index: number, field: keyof EditorSeat, value: string | number | SeatStatus) => {
        setEditorSeats(prev => {
            const updated = [...prev];
            const seat = { ...updated[index] };
             // Ensure number is treated as number
            if (field === 'number') {
                seat[field] = parseInt(value as string, 10) || 0;
            } else {
                 (seat[field] as any) = value;
            }
            updated[index] = seat;
            return updated;
        });
    };

    const handleSaveLayout = () => {
        // Prepare data for the backend (exclude temporary IDs, ensure structure matches API)
        const seatsToSave = editorSeats.map(({ id, _id, eventId: seatEventId, bookingId, booking, reservedAt, createdAt, updatedAt, ...rest }) => ({
            ...rest,
            // Ensure number is a number
            number: Number(rest.number) || 0,
             // Ensure status is valid, default if missing
            status: rest.status && Object.values(SeatStatus).includes(rest.status) ? rest.status : SeatStatus.AVAILABLE,
        }));

        // Basic validation before sending
        if (seatsToSave.some(s => !s.row || s.number <= 0)) {
             toast({ title: "Invalid Seats", description: "Some seats have invalid rows or numbers. Please correct them.", variant: "destructive" });
             return;
        }
        // Check for duplicates within the editor state
         const seatKeys = new Set<string>();
         for (const seat of seatsToSave) {
            const key = `${seat.section || ''}-${seat.row}-${seat.number}`;
            if (seatKeys.has(key)) {
                toast({ title: "Duplicate Seat", description: `Duplicate seat found: Section '${seat.section || 'N/A'}', Row '${seat.row}', Number '${seat.number}'.`, variant: "destructive" });
                return;
            }
            seatKeys.add(key);
         }


        saveLayout(seatsToSave);
    };

     // Loading and Error States
     if (isLoadingEvent || isLoadingSeats) {
         return <div className="container mx-auto py-10 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /> Loading Event and Seat Data...</div>;
     }

     if (isErrorEvent) {
         return <div className="container mx-auto py-10 text-center text-destructive">Error loading event data.</div>;
     }

     // Warning if event has bookings or is published (based on fetched eventData)
     const canEditLayout = eventData?.status === 'DRAFT'; // Simplistic check, refine based on backend rules
     const cannotEditReason = !canEditLayout ? (eventData?.status === 'PUBLISHED' ? 'Event is already published.' : 'Event status prevents editing.') : '';


    return (
        <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
            <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-6">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Event
            </Button>
            <h1 className="text-3xl font-bold mb-2">Seat Layout Editor</h1>
            <p className="text-muted-foreground mb-6">Manage the seating arrangement for: <strong className="text-primary">{eventData?.title || 'Loading...'}</strong></p>

            {!canEditLayout && (
                 <Card className="mb-6 border-destructive bg-destructive/10">
                    <CardHeader className="flex-row items-center gap-4 space-y-0">
                         <AlertTriangle className="h-6 w-6 text-destructive"/>
                        <div>
                            <CardTitle className="text-destructive">Editing Locked</CardTitle>
                            <CardDescription className="text-destructive/80">
                                {cannotEditReason} Layout modifications might be restricted. Contact support or check event status if changes are needed.
                            </CardDescription>
                        </div>
                    </CardHeader>
                 </Card>
            )}

             {/* Section for Adding Multiple Rows */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="text-lg">Add Multiple Rows</CardTitle>
                     <CardDescription>Quickly generate multiple rows of seats.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
                    <div className="space-y-1">
                        <Label htmlFor="rowPrefix">Row Prefix</Label>
                        <Input id="rowPrefix" value={rowsToAdd.prefix} onChange={(e) => setRowsToAdd(p => ({ ...p, prefix: e.target.value }))} placeholder="e.g., A or GA" />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="rowCount">Number of Rows</Label>
                        <Input id="rowCount" type="number" min="1" value={rowsToAdd.count} onChange={(e) => setRowsToAdd(p => ({ ...p, count: parseInt(e.target.value) || 1 }))} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="rowSeats">Seats per Row</Label>
                        <Input id="rowSeats" type="number" min="1" value={rowsToAdd.seatsPerRow} onChange={(e) => setRowsToAdd(p => ({ ...p, seatsPerRow: parseInt(e.target.value) || 1 }))} />
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="rowStartNum">Start Number</Label>
                        <Input id="rowStartNum" type="number" min="1" value={rowsToAdd.startNum} onChange={(e) => setRowsToAdd(p => ({ ...p, startNum: parseInt(e.target.value) || 1 }))} />
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="rowSection">Section (Optional)</Label>
                        <Input id="rowSection" value={rowsToAdd.section} onChange={(e) => setRowsToAdd(p => ({ ...p, section: e.target.value }))} placeholder="e.g., North Stand" />
                    </div>
                    <Button onClick={handleAddMultipleRows} className="col-span-2 md:col-span-1" disabled={isSaving || !canEditLayout}>
                         <Grid className="mr-2 h-4 w-4"/> Add Rows
                    </Button>
                </CardContent>
            </Card>

            {/* Section for Adding Single Seat */}
             <Card className="mb-6">
                 <CardHeader>
                    <CardTitle className="text-lg">Add Single Seat</CardTitle>
                 </CardHeader>
                 <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
                    <div className="space-y-1">
                         <Label htmlFor="newRow">Row</Label>
                         <Input id="newRow" value={newSeat.row} onChange={(e) => setNewSeat(p => ({ ...p, row: e.target.value }))} placeholder="e.g., B" />
                     </div>
                     <div className="space-y-1">
                         <Label htmlFor="newNumber">Number</Label>
                         <Input id="newNumber" type="number" min="1" value={newSeat.number} onChange={(e) => setNewSeat(p => ({ ...p, number: parseInt(e.target.value) || 1 }))} />
                     </div>
                     <div className="space-y-1">
                         <Label htmlFor="newSection">Section (Optional)</Label>
                         <Input id="newSection" value={newSeat.section} onChange={(e) => setNewSeat(p => ({ ...p, section: e.target.value }))} placeholder="e.g., Block C" />
                     </div>
                      <div className="space-y-1">
                         <Label htmlFor="newStatus">Initial Status</Label>
                          <Select value={newSeat.status} onValueChange={(value: SeatStatus) => setNewSeat(p => ({ ...p, status: value }))} >
                             <SelectTrigger id="newStatus"><SelectValue placeholder="Status" /></SelectTrigger>
                             <SelectContent>
                                <SelectItem value="AVAILABLE">Available</SelectItem>
                                <SelectItem value="UNAVAILABLE">Unavailable</SelectItem>
                             </SelectContent>
                         </Select>
                     </div>
                     <Button onClick={handleAddSeat} className="col-span-2 md:col-span-1" disabled={isSaving || !canEditLayout}>
                         <Plus className="mr-2 h-4 w-4" /> Add Seat
                     </Button>
                 </CardContent>
            </Card>


            {/* Seat List Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                        Current Seat Layout ({editorSeats.length} seats)
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" disabled={isSaving || !canEditLayout || editorSeats.length === 0}>
                                    <Trash2 className="mr-2 h-4 w-4"/> Clear All Seats
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action will remove all currently defined seats in the editor. This change won't be saved until you click "Save Layout".
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => setEditorSeats([])} className="bg-destructive hover:bg-destructive/90">Yes, Clear All</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardTitle>
                     <CardDescription>Review and modify the seats below. Click "Save Layout" to apply changes.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="max-h-[500px] overflow-y-auto border rounded-md">
                        <Table>
                             <TableHeader className="sticky top-0 bg-muted">
                                <TableRow>
                                    <TableHead>Section</TableHead>
                                    <TableHead>Row</TableHead>
                                    <TableHead>Number</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {editorSeats.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                            No seats defined yet. Add seats using the forms above.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    editorSeats.map((seat, index) => (
                                        <TableRow key={seat.id || seat._id} className={`${seat._id ? 'bg-green-500/10' : ''}`}>
                                            <TableCell>
                                                 <Input
                                                     value={seat.section || ''}
                                                     onChange={(e) => handleSeatChange(index, 'section', e.target.value)}
                                                     placeholder="N/A"
                                                     className="h-8 text-xs"
                                                     disabled={isSaving || !canEditLayout}
                                                 />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={seat.row}
                                                    onChange={(e) => handleSeatChange(index, 'row', e.target.value)}
                                                    className="h-8 text-xs w-16"
                                                    disabled={isSaving || !canEditLayout}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                 <Input
                                                    type="number"
                                                    min="1"
                                                    value={seat.number}
                                                     onChange={(e) => handleSeatChange(index, 'number', e.target.value)}
                                                    className="h-8 text-xs w-16"
                                                    disabled={isSaving || !canEditLayout}
                                                />
                                            </TableCell>
                                             <TableCell>
                                                {/* Allow changing only between AVAILABLE and UNAVAILABLE in editor */}
                                                {/* RESERVED/BOOKED statuses are managed by booking flow */}
                                                <Select
                                                     value={seat.status === 'RESERVED' || seat.status === 'BOOKED' ? seat.status : (seat.status || 'AVAILABLE')}
                                                     onValueChange={(value: SeatStatus) => handleSeatChange(index, 'status', value)}
                                                     disabled={isSaving || !canEditLayout || seat.status === 'RESERVED' || seat.status === 'BOOKED'}
                                                 >
                                                    <SelectTrigger className="h-8 text-xs w-[120px]">
                                                         <SelectValue placeholder="Status" />
                                                    </SelectTrigger>
                                                     <SelectContent>
                                                         <SelectItem value="AVAILABLE">Available</SelectItem>
                                                         <SelectItem value="UNAVAILABLE">Unavailable</SelectItem>
                                                         {/* Show but disable booked/reserved */}
                                                         {seat.status === 'BOOKED' && <SelectItem value="BOOKED" disabled>Booked</SelectItem>}
                                                          {seat.status === 'RESERVED' && <SelectItem value="RESERVED" disabled>Reserved</SelectItem>}
                                                    </SelectContent>
                                                 </Select>
                                             </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveSeat(seat.id || seat._id)}
                                                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                                    disabled={isSaving || !canEditLayout || seat.status === 'BOOKED'} // Prevent removing booked seats easily
                                                    aria-label="Remove seat"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                 <CardFooter className="border-t pt-6">
                    <Button onClick={handleSaveLayout} disabled={isSaving || !canEditLayout} className="bg-accent text-accent-foreground hover:bg-accent/90">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Layout
                    </Button>
                     <p className="text-xs text-muted-foreground ml-auto">Saving will replace the entire existing layout for this event.</p>
                </CardFooter>
            </Card>
        </div>
    );
}


// Mock/Placeholder service functions - Replace with actual calls
// These should ideally be in a separate service file (e.g., src/services/seatEditorService.ts)
// For now, keeping them here as placeholders. Ensure they align with backend API endpoints.

// async function getEventById(eventId: string, token: string): Promise<Event> {
//     // Replace with actual fetch call using the token
//     console.log(`Fetching event ${eventId}`);
//     // Mock response - REMOVE THIS
//     await new Promise(res => setTimeout(res, 500));
//     if (eventId === 'error') throw new Error("Failed to fetch event");
//     return { id: eventId, title: `Event ${eventId}`, description: '', date: new Date(), location: '', organizerId: 'org1', status: 'DRAFT', createdAt: new Date(), updatedAt: new Date(), imageUrl: null, category: null };
// }

// async function getSeatMapForEvent(eventId: string, token: string, options?: { showAll?: boolean }): Promise<Seat[]> {
//     // Replace with actual fetch call using the token
//     console.log(`Fetching seat map for ${eventId}, showAll: ${options?.showAll}`);
//     // Mock response - REMOVE THIS
//      await new Promise(res => setTimeout(res, 700));
//     // return []; // Start empty
//      return [
//          { id: 's1', eventId, row: 'A', number: 1, section: 'Main', status: 'AVAILABLE', bookingId: null, reservedAt: null, createdAt: new Date(), updatedAt: new Date() },
//          { id: 's2', eventId, row: 'A', number: 2, section: 'Main', status: 'BOOKED', bookingId: 'b1', reservedAt: null, createdAt: new Date(), updatedAt: new Date() },
//          { id: 's3', eventId, row: 'B', number: 1, section: 'Main', status: 'UNAVAILABLE', bookingId: null, reservedAt: null, createdAt: new Date(), updatedAt: new Date() },
//      ];
// }

// async function updateSeatLayout(eventId: string, seats: Omit<EditorSeat, 'id' | '_id'>[], token: string): Promise<any> {
//     // Replace with actual fetch call using the token
//     console.log(`Updating layout for ${eventId} with ${seats.length} seats:`, seats);
//     // Mock response - REMOVE THIS
//     await new Promise(res => setTimeout(res, 1000));
//      if (Math.random() < 0.1) throw new Error("Simulated save error."); // Simulate occasional errors
//     return { message: 'Layout updated (mock)' };
// }

// Define SeatStatus enum if not using Prisma types directly
// enum SeatStatus { AVAILABLE = "AVAILABLE", RESERVED = "RESERVED", BOOKED = "BOOKED", UNAVAILABLE = "UNAVAILABLE" };
