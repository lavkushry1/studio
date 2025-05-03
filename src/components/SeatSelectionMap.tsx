'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Seat } from '@prisma/client'; // Assuming Seat type from Prisma
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Armchair, XCircle, CheckCircle, Info } from 'lucide-react';

interface SeatSelectionMapProps {
    eventId: string;
    seats: Seat[]; // All seats for the event
    selectedSeats: string[]; // IDs of currently selected seats by the user
    onSeatsSelected: (selectedIds: string[]) => void; // Callback when selection is confirmed/changed
    maxSelectableSeats?: number;
}

// Group seats by section and then by row for rendering
const groupSeats = (seats: Seat[]) => {
    const grouped: Record<string, Record<string, Seat[]>> = {};
    seats.forEach(seat => {
        const section = seat.section || 'Default'; // Group seats without a section into 'Default'
        if (!grouped[section]) {
            grouped[section] = {};
        }
        if (!grouped[section][seat.row]) {
            grouped[section][seat.row] = [];
        }
        grouped[section][seat.row].push(seat);
        // Sort seats within the row by number
        grouped[section][seat.row].sort((a, b) => a.number - b.number);
    });
    // Optional: Sort sections if needed
    // const sortedSections = Object.keys(grouped).sort();
    // const sortedGrouped: Record<string, Record<string, Seat[]>> = {};
    // sortedSections.forEach(section => sortedGrouped[section] = grouped[section]);
    // return sortedGrouped;
    return grouped;
};

const SeatComponent: React.FC<{ seat: Seat; isSelected: boolean; onClick: (id: string) => void }> = ({ seat, isSelected, onClick }) => {
    const isAvailable = seat.status === 'AVAILABLE';
    const isReserved = seat.status === 'RESERVED';
    const isBooked = seat.status === 'BOOKED';
    const isUnavailable = seat.status === 'UNAVAILABLE';

    let seatColor = 'text-muted-foreground/30 border-muted/30'; // Default unavailable look
    let tooltipContent = `Seat ${seat.row}${seat.number} - Unavailable`;
    let cursorStyle = 'cursor-not-allowed';
    let hoverEffect = '';

    if (isAvailable) {
        seatColor = isSelected ? 'text-accent-foreground bg-accent border-accent' : 'text-primary/70 border-primary/30';
        tooltipContent = `Seat ${seat.row}${seat.number} - Available (₹${seat.price || 'N/A'})`; // Assuming price is on seat model
        cursorStyle = 'cursor-pointer';
        hoverEffect = isSelected ? '' : 'hover:bg-accent/20 hover:border-accent';
    } else if (isReserved) {
        tooltipContent = `Seat ${seat.row}${seat.number} - Reserved`;
        seatColor = 'text-orange-600/80 border-orange-500/50 bg-orange-500/10';
    } else if (isBooked) {
        tooltipContent = `Seat ${seat.row}${seat.number} - Booked`;
        seatColor = 'text-red-600/80 border-red-500/50 bg-red-500/10';
    }

    return (
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={() => isAvailable && onClick(seat.id)}
                        disabled={!isAvailable}
                        className={cn(
                            `relative flex items-center justify-center w-7 h-7 m-1 border rounded text-xs font-mono transition-colors duration-150`,
                            seatColor,
                            cursorStyle,
                            hoverEffect
                        )}
                        aria-label={tooltipContent}
                    >
                        {/* Show icon based on status or selection */}
                        {isBooked || isReserved || isUnavailable ? (
                            <XCircle className="w-4 h-4 opacity-60" />
                        ) : isSelected ? (
                             <CheckCircle className="w-5 h-5" />
                        ) : (
                            <span className="absolute inset-0 flex items-center justify-center group-hover:hidden">{seat.number}</span>
                             //<Armchair className="w-5 h-5 opacity-80" /> // Alternative icon view
                        )}
                         {/* {seat.number} */}
                    </button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{tooltipContent}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};


const SeatSelectionMap: React.FC<SeatSelectionMapProps> = ({
    eventId,
    seats,
    selectedSeats: initialSelectedSeats,
    onSeatsSelected,
    maxSelectableSeats = 10,
}) => {
    const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedSeats);
    const groupedSeats = useMemo(() => groupSeats(seats), [seats]);

    // Update internal state if initial props change
    useEffect(() => {
        setSelectedIds(initialSelectedSeats);
    }, [initialSelectedSeats]);


    const handleSeatClick = (id: string) => {
        setSelectedIds(prevSelected => {
            if (prevSelected.includes(id)) {
                return prevSelected.filter(seatId => seatId !== id); // Deselect
            } else {
                if (prevSelected.length >= maxSelectableSeats) {
                     // Optionally show a toast message here
                    console.warn(`Maximum selectable seats (${maxSelectableSeats}) reached.`);
                    return prevSelected; // Limit selection
                }
                return [...prevSelected, id]; // Select
            }
        });
         // Note: We call onSeatsSelected only when the user confirms, not on every click.
    };

    const handleConfirmSelection = () => {
        onSeatsSelected(selectedIds);
    };

    const selectedSeatDetails = useMemo(() => {
      return selectedIds.map(id => seats.find(s => s.id === id)).filter(Boolean) as Seat[];
     }, [selectedIds, seats]);

    const totalPrice = useMemo(() => {
        // Assuming price is on the seat model. Adjust if price comes from category/section.
        return selectedSeatDetails.reduce((sum, seat) => sum + (seat.price || 0), 0);
     }, [selectedSeatDetails]);


    return (
        <div className="border rounded-lg p-4 bg-background shadow-inner">
            <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                 <h3 className="text-lg font-semibold text-primary">Seat Map</h3>
                 {/* Legend */}
                 <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm border border-primary/30"/> Available</div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-accent border border-accent"/> Selected</div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-orange-500/10 border border-orange-500/50"/> Reserved</div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-500/10 border border-red-500/50"/> Booked</div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm border border-muted/30 bg-muted/10"/> Unavailable</div>
                </div>
            </div>

            {/* Stage/Screen Indicator */}
             <div className="text-center text-sm text-muted-foreground py-2 mb-4 border-b-2 border-dashed border-primary/50">
                 ▼ SCREEN / STAGE ▼
             </div>


            <div className="overflow-x-auto pb-4">
                {Object.entries(groupedSeats).map(([section, rows]) => (
                    <div key={section} className="mb-6 last:mb-0">
                        {section !== 'Default' && (
                            <h4 className="font-semibold text-center text-primary mb-2 sticky left-0">{section}</h4>
                        )}
                        {Object.entries(rows).map(([row, seatsInRow]) => (
                            <div key={row} className="flex items-center whitespace-nowrap">
                                <div className="w-8 text-right text-sm font-medium text-muted-foreground pr-2">{row}</div>
                                <div className="flex flex-nowrap">
                                    {seatsInRow.map(seat => (
                                        <SeatComponent
                                            key={seat.id}
                                            seat={seat}
                                            isSelected={selectedIds.includes(seat.id)}
                                            onClick={handleSeatClick}
                                        />
                                    ))}
                                </div>
                                <div className="w-8 text-left text-sm font-medium text-muted-foreground pl-2">{row}</div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Selection Summary */}
             {selectedIds.length > 0 && (
                 <div className="mt-4 pt-4 border-t">
                    <h4 className="font-semibold text-primary mb-2">Your Selection ({selectedIds.length} seats)</h4>
                     <div className="flex flex-wrap gap-1.5 mb-3">
                         {selectedSeatDetails.map(seat => (
                             <Badge key={seat.id} variant="secondary" className="font-mono text-xs">
                                 {seat.section ? `${seat.section}-` : ''}{seat.row}{seat.number}
                             </Badge>
                         ))}
                     </div>
                     <p className="font-semibold text-primary">Total Price: ₹{totalPrice.toLocaleString('en-IN')}</p>
                     <p className="text-xs text-muted-foreground">(Price calculation based on individual seat price, subject to verification)</p>
                 </div>
             )}

             {/* Confirmation handled by parent component button */}
             {/* Example button if confirmation happens within this component:
             <div className="mt-6 text-right">
                 <Button
                    onClick={handleConfirmSelection}
                    disabled={selectedIds.length === 0}
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                    Confirm Selection ({selectedIds.length})
                 </Button>
            </div>
            */}
        </div>
    );
};

export default SeatSelectionMap;

// Helper type definition if Prisma types aren't directly available
// type Seat = {
//     id: string;
//     row: string;
//     number: number;
//     section?: string | null;
//     status: 'AVAILABLE' | 'RESERVED' | 'BOOKED' | 'UNAVAILABLE';
//     eventId: string;
//     bookingId?: string | null;
//     reservedAt?: Date | null;
//     price?: number | null; // Assuming price might be associated with seat
// };
