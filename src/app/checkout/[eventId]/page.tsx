// CheckoutPage component remains largely the same, only modifying the payment step section

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation'; // Import useParams
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Ticket, Tag, CreditCard, ShoppingCart, ArrowLeft, QrCode, Upload, CheckCircle, Loader2, XCircle, User, Mail, Phone, Armchair, ExternalLink } from 'lucide-react'; // Added Armchair, ExternalLink icons
import Image from 'next/image';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast'; // Import useToast
import { Badge } from '@/components/ui/badge'; // Import Badge
import SeatSelectionMap from '@/components/SeatSelectionMap'; // Import the Seat Map component
import { useQuery, useMutation } from '@tanstack/react-query'; // Import useMutation
import { getEventById } from '@/services/eventService'; // Import service
import { getSeatMapForEvent, reserveSeats } from '@/services/seatEditorService'; // Import seat services
import { createBooking, submitUtr } from '@/services/bookingService'; // Import booking services
import { getActiveUpiId } from '@/services/paymentService'; // Import payment service
import type { Event as EventType, Seat as SeatType, TicketCategory as TicketCategoryType, Booking as BookingType } from '@prisma/client';
import { useAuth } from '@/hooks/useAuth'; // Import useAuth
import QRCode from 'qrcode'; // Import qrcode library

// Mock data - Replace with actual fetching
// MOCK_QR_CODE_URL removed, will generate dynamically
// MOCK_UPI_ID removed, will fetch dynamically

type CheckoutStep = 'selection' | 'details' | 'payment' | 'verification' | 'confirmation';

const stepsConfig: { id: CheckoutStep; name: string; icon: React.ElementType }[] = [
    { id: 'selection', name: 'Select', icon: Armchair },
    { id: 'details', name: 'Details', icon: User },
    { id: 'payment', name: 'Payment', icon: CreditCard },
    { id: 'verification', name: 'Verify', icon: Upload },
    { id: 'confirmation', name: 'Confirm', icon: CheckCircle },
];

interface EventResponse extends EventType {
    ticketCategories: TicketCategoryType[];
    organizer: { id: string; name: string | null; email: string };
    hasSeatMap: boolean; // Ensure this is included
    team: any; // Add team details if needed by checkout summary
    venue: any; // Add venue details if needed
}

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams(); // Use useParams to get eventId
  const { toast } = useToast(); // Initialize toast
  const { user: authUser, getAccessToken } = useAuth(); // Get token function and user

  const eventId = params.eventId as string;
  const categoryId = searchParams.get('category'); // For quantity-based booking
  const initialSeatIds = searchParams.get('seats')?.split(',') || []; // For seat-based booking

  const [step, setStep] = useState<CheckoutStep>('selection'); // Start at selection
  const [quantity, setQuantity] = useState(1);
  const [selectedSeats, setSelectedSeats] = useState<string[]>(initialSeatIds); // Track selected seat IDs
  const [discountCode, setDiscountCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED' | null>(null);
  const [deliveryDetails, setDeliveryDetails] = useState({ name: authUser?.name || '', email: authUser?.email || '', phone: '' });
  const [utrNumber, setUtrNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false); // For loading states
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({}); // For form validation
  const [booking, setBooking] = useState<BookingType | null>(null); // Store created booking
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null); // State for QR code image data
  const [upiUri, setUpiUri] = useState<string | null>(null); // State for UPI intent URI


  // Fetch event details using React Query
   const { data: event, isLoading: isLoadingEvent, isError: isErrorEvent, error: errorEvent } = useQuery<EventResponse, Error>({
       queryKey: ['event', eventId],
       queryFn: () => getEventById(eventId),
       enabled: !!eventId,
       staleTime: 10 * 60 * 1000, // Cache event data for 10 mins
   });

   // Fetch seat map data (only if it's a seat map event)
    const { data: seatsData, isLoading: isLoadingSeats, refetch: refetchSeats } = useQuery<SeatType[]>({
       queryKey: ['seatMap', eventId, 'checkout'], // Unique key for checkout context
       queryFn: () => getSeatMapForEvent(eventId, getAccessToken() ?? '', { showAll: false }), // Fetch only available for selection
       enabled: !!eventId && !!event?.hasSeatMap, // Fetch only if event exists and has seat map
       staleTime: 1 * 60 * 1000, // Shorter cache time for seat availability
   });

    // Fetch active UPI ID (runs when step becomes 'payment')
    const { data: activeUpiId, isLoading: isLoadingUpiId } = useQuery<string>({
        queryKey: ['activeUpiId'],
        queryFn: getActiveUpiId, // Call service function (no token needed for public read)
        enabled: step === 'payment', // Only fetch when payment step is active
        staleTime: 30 * 60 * 1000, // Cache UPI ID for 30 minutes
    });

   // Calculate finalTotalPrice memoized
   const finalTotalPrice = useMemo(() => {
        let basePricePerItem = 0;
        let quantityOrSeats = 0;
        let totalPrice = 0;

        if (isSeatMapEvent) {
             // Price calculation for seat-based booking
             const selectedSeatDetails = selectedSeats.map(id => seatsData?.find(s => s.id === id)).filter(Boolean) as SeatType[];
             basePricePerItem = selectedSeatDetails[0]?.price || event?.ticketCategories[0]?.price || 0;
             totalPrice = selectedSeatDetails.reduce((sum, seat) => {
                const categoryPrice = event?.ticketCategories?.find(cat => cat.id === seat.ticketCategoryId)?.price; // Match seat to category if possible
                const price = seat.price ?? categoryPrice ?? event?.ticketCategories[0]?.price ?? 0; // Fallback logic
                return sum + price;
             }, 0);
             quantityOrSeats = selectedSeats.length;
         } else {
             // Price calculation for quantity-based booking
             const category = event?.ticketCategories?.find(cat => cat.id === categoryId);
             if (category) {
                 basePricePerItem = category.price;
                 quantityOrSeats = quantity;
                 totalPrice = basePricePerItem * quantityOrSeats;
             }
         }
        const subtotal = totalPrice;
        let calculatedDiscount = 0;
         if (discountApplied && discountType) {
             calculatedDiscount = discountType === 'PERCENTAGE' ? subtotal * discountValue : discountValue;
             calculatedDiscount = Math.min(calculatedDiscount, subtotal);
         }
        return subtotal - calculatedDiscount;
    }, [isSeatMapEvent, selectedSeats, seatsData, event, categoryId, quantity, discountApplied, discountType, discountValue]);


    // Generate QR Code and UPI URI when UPI ID and price are available
    useEffect(() => {
        if (step === 'payment' && activeUpiId && finalTotalPrice > 0) {
            // Format according to UPI intent spec (adjust fields as needed)
            const generatedUpiUri = `upi://pay?pa=${activeUpiId}&pn=TicketFlow&am=${finalTotalPrice.toFixed(2)}&cu=INR&tn=Booking for ${event?.title || 'Event'}`;
            setUpiUri(generatedUpiUri); // Store the URI for the deep link button

            QRCode.toDataURL(generatedUpiUri, { errorCorrectionLevel: 'M', width: 250 }) // Generate Data URL
                .then(url => {
                    setQrCodeDataUrl(url);
                })
                .catch(err => {
                    console.error('QR code generation failed:', err);
                    toast({ title: "QR Code Error", description: "Could not generate payment QR code.", variant: "destructive" });
                    setQrCodeDataUrl(null); // Clear on error
                    setUpiUri(null);
                });
        } else {
            setQrCodeDataUrl(null); // Clear QR code if not on payment step or data missing
            setUpiUri(null); // Clear UPI URI
        }
    }, [step, activeUpiId, finalTotalPrice, event?.title, toast]);


  const isSeatMapEvent = useMemo(() => event?.hasSeatMap === true, [event]); // Derive from fetched event data

  // Determine booking type based on context
  const bookingType = isSeatMapEvent ? 'seat' : 'quantity';

  // Selected category/price info
   const category = useMemo(() => {
      if (!isSeatMapEvent && categoryId && event?.ticketCategories) {
          return event.ticketCategories.find(cat => cat.id === categoryId);
      }
      // If seat-based, find the category associated with the first selected seat (or use event default)
      if (isSeatMapEvent && selectedSeats.length > 0 && seatsData && event?.ticketCategories) {
            const firstSeat = seatsData.find(s => s.id === selectedSeats[0]);
            // TODO: Need a way to link seat section/type to a TicketCategory ID or price
            // For now, just returning the first category of the event as a placeholder
             const categoryForSeat = event.ticketCategories.find(cat => cat.id === firstSeat?.ticketCategoryId); // Match via linked category ID
            return categoryForSeat || event.ticketCategories[0]; // Fallback to first event category
      }
      return null;
  }, [isSeatMapEvent, categoryId, event, selectedSeats, seatsData]);

  const selectedSeatDetails = useMemo(() => {
      return selectedSeats.map(id => seatsData?.find(s => s.id === id)).filter(Boolean) as SeatType[];
  }, [selectedSeats, seatsData]);

  // Calculate totals (moved calculation to finalTotalPrice useMemo)
  const quantityOrSeats = bookingType === 'seat' ? selectedSeats.length : quantity;
  const subtotal = useMemo(() => {
      if (bookingType === 'seat') {
         return selectedSeatDetails.reduce((sum, seat) => {
            const categoryPrice = event?.ticketCategories?.find(cat => cat.id === seat.ticketCategoryId)?.price;
            const price = seat.price ?? categoryPrice ?? event?.ticketCategories[0]?.price ?? 0;
            return sum + price;
         }, 0);
      } else if (category) {
         return category.price * quantity;
      }
      return 0;
  }, [bookingType, selectedSeatDetails, category, quantity, event]);

  const calculatedDiscount = useMemo(() => {
      if (discountApplied && discountType) {
         let discount = discountType === 'PERCENTAGE' ? subtotal * discountValue : discountValue;
         return Math.min(discount, subtotal);
      }
      return 0;
  }, [subtotal, discountApplied, discountType, discountValue]);



  // Initial setup and validation effect
   useEffect(() => {
        if (isLoadingEvent) return; // Wait for event data

        if (!event) {
            // If event loading failed or event not found, stay/redirect (handled below)
            return;
        }

        // Pre-fill details if user is logged in
        if (authUser && step === 'details') {
            setDeliveryDetails(prev => ({
                ...prev,
                name: prev.name || authUser.name || '',
                email: prev.email || authUser.email || '',
            }));
        }


        if (isSeatMapEvent) {
             // Seat map event logic
             // No initial seats from query param? Stay on selection.
             if (initialSeatIds.length === 0 && step === 'selection') {
                 // Okay to stay on selection
             }
             // If we have initial seats AND event data is loaded, verify them
             else if (initialSeatIds.length > 0 && seatsData) {
                  const validInitialSeats = initialSeatIds.filter(id =>
                       seatsData.some(seat => seat.id === id && seat.status === 'AVAILABLE')
                  );
                  if (validInitialSeats.length !== initialSeatIds.length) {
                       toast({ title: "Warning", description: "Some pre-selected seats were unavailable.", variant: "destructive" });
                       setSelectedSeats(validInitialSeats); // Keep only valid ones
                  } else {
                       setSelectedSeats(initialSeatIds);
                  }
                  // If selection was valid (or partially valid), move to details
                  if (validInitialSeats.length > 0 && step === 'selection') {
                       setStep('details');
                  } else if (validInitialSeats.length === 0 && step !== 'selection') {
                       // If all pre-selected seats became invalid, force back to selection
                       setStep('selection');
                   }
              } else if (initialSeatIds.length > 0 && !seatsData && !isLoadingSeats) {
                   // If seats failed to load, can't verify, force back
                    toast({ title: "Error", description: "Could not load seat availability.", variant: "destructive" });
                    setStep('selection');
              }

        } else {
            // Quantity-based booking logic
            if (!categoryId || !category) {
                console.error("Invalid or missing category ID for quantity booking.");
                if (step !== 'selection') { // Avoid infinite loop if already trying to redirect
                     toast({
                        title: "Error",
                        description: "Invalid ticket category selected.",
                        variant: "destructive",
                     });
                    router.push(`/events/${eventId}`); // Redirect back to event page
                 }
            } else if (step === 'selection') { // Move from selection (default) to details if category is valid
                setStep('details');
            }
        }
    }, [event, isLoadingEvent, isSeatMapEvent, categoryId, category, initialSeatIds, toast, router, eventId, step, seatsData, isLoadingSeats, authUser]);


    const handleSeatsSelected = async (seatIds: string[]) => {
         setSelectedSeats(seatIds); // Update state immediately for visual feedback

         // Don't auto-proceed, wait for button click
         // The button itself will call a function to reserve and proceed
     }

      const handleConfirmSeatSelection = async () => {
          if (selectedSeats.length === 0) {
              toast({ title: "No Seats Selected", description: "Please select at least one seat.", variant: "destructive" });
              return;
          }
          console.log("Seats selected, attempting reservation:", selectedSeats);
          setIsProcessing(true);
          const token = getAccessToken();
          if (!token) {
              toast({ title: "Authentication Required", description: "Please log in to reserve seats.", variant: "destructive" });
              router.push('/login'); // Redirect to login
              setIsProcessing(false);
              return;
          }

          try {
             await reserveSeats(eventId, selectedSeats, token);
              toast({ title: "Seats Reserved", description: `Seats held for ${process.env.NEXT_PUBLIC_SEAT_RESERVATION_TIMEOUT_MINUTES || 15} minutes.` });
              setStep('details');
          } catch (error: any) {
              toast({ title: "Reservation Failed", description: error.message || "Some seats could not be reserved. Please try again.", variant: "destructive" });
              // Refetch seat map to show updated status
              refetchSeats();
              setSelectedSeats([]); // Clear selection on failure
          } finally {
              setIsProcessing(false);
          }
      }

  const validateDetails = () => {
     const errors: { [key: string]: string } = {};
     if (!deliveryDetails.name.trim()) errors.name = "Full name is required.";
     if (!deliveryDetails.email.trim()) {
         errors.email = "Email is required.";
     } else if (!/\S+@\S+\.\S+/.test(deliveryDetails.email)) { // Basic email format check
         errors.email = "Invalid email format.";
     }
     if (!deliveryDetails.phone.trim()) {
        errors.phone = "Phone number is required.";
     } else if (!/^\d{10,}$/.test(deliveryDetails.phone.replace(/\s+/g, ''))) { // Basic phone format check (at least 10 digits)
         errors.phone = "Invalid phone number format (min 10 digits).";
     }
     setValidationErrors(errors);
     return Object.keys(errors).length === 0;
  }

   const handleApplyDiscount = () => {
        // TODO: Implement actual discount API call
        console.log("Applying discount code:", discountCode);
        setIsProcessing(true);
        setDiscountApplied(false); // Reset first
        setDiscountValue(0);
        setDiscountType(null);

        setTimeout(() => {
            let success = false;
            if (discountCode.toUpperCase() === 'IPL10') {
                setDiscountApplied(true);
                setDiscountValue(0.10); // 10%
                setDiscountType('PERCENTAGE');
                success = true;
            } else if (discountCode.toUpperCase() === 'FLAT100') {
                 setDiscountApplied(true);
                 setDiscountValue(100); // Flat 100
                 setDiscountType('FIXED');
                 success = true;
            }

             toast({
                title: success ? "Discount Applied!" : "Invalid Code",
                description: success ? `Successfully applied discount code "${discountCode}".` : `The code "${discountCode}" is not valid or has expired.`,
                variant: success ? "default" : "destructive",
             });

            setIsProcessing(false);
        }, 1000);
    };

    // Mutation hook for creating a booking
     const createBookingMutation = useMutation({
        mutationFn: (data: any) => createBooking(data, getAccessToken()),
        onSuccess: (createdBooking) => {
             setBooking(createdBooking); // Store the full booking object
             setStep('payment');
             toast({ title: "Details Saved", description: "Proceed with payment." });
        },
        onError: (error: any) => {
            toast({
                title: "Booking Creation Failed",
                description: error.message || "Could not initiate the booking.",
                variant: "destructive",
            });
            // If seat-based and failure might be due to reservation loss, consider action
             if (isSeatMapEvent && error.message.includes('seat status change')) {
                refetchSeats(); // Update seat map visuals
                 setStep('selection'); // Force user back to selection
                 setSelectedSeats([]); // Clear selection
            }
        },
         onSettled: () => {
            setIsProcessing(false);
        }
     });


    const handleProceedToPayment = async () => {
         if (!validateDetails()) {
             toast({
                 title: "Missing Information",
                 description: "Please fill in all required delivery details correctly.",
                 variant: "destructive",
             });
             return;
         }
         setIsProcessing(true);
         // Create booking payload
         const bookingData: any = {
             eventId: eventId,
             deliveryName: deliveryDetails.name,
             deliveryEmail: deliveryDetails.email,
             deliveryPhone: deliveryDetails.phone,
             // Include other relevant data like discount info if needed by backend
         };
         if (isSeatMapEvent) {
             bookingData.seatIds = selectedSeats;
         } else {
             bookingData.quantity = quantity;
         }

         console.log("Creating pending booking with data:", bookingData);
         createBookingMutation.mutate(bookingData); // Use mutation
     };


   const handlePaymentMade = () => {
        // This step purely transitions the UI after user claims payment is done
        setStep('verification');
         toast({ title: "Payment Step", description: "Enter your UTR to verify the transaction." });
    };

    // Mutation hook for submitting UTR
     const submitUtrMutation = useMutation({
        mutationFn: (utrData: { bookingId: string; utr: string }) => submitUtr(utrData.bookingId, utrData.utr, getAccessToken()),
        onSuccess: (updatedBooking) => {
             setBooking(updatedBooking); // Update booking state
             setStep('confirmation');
             toast({ title: "UTR Submitted", description: "Your booking is now processing for verification." });
        },
        onError: (error: any) => {
             toast({
                 title: "UTR Submission Failed",
                 description: error.message || "Could not submit UTR.",
                 variant: "destructive",
             });
        },
        onSettled: () => {
             setIsProcessing(false);
        }
     });


  const handleSubmitUtr = async () => {
    if (!utrNumber || utrNumber.length < 10) { // Basic validation
        toast({
             title: "Invalid UTR",
             description: "Please enter a valid UTR/Transaction ID (usually 10 digits or more).",
             variant: "destructive",
         });
        return;
    }
     if (!booking?.id) {
         toast({ title: "Error", description: "Booking ID not found. Cannot submit UTR.", variant: "destructive" });
         return;
     }
    setIsProcessing(true);
    console.log(`Submitting UTR ${utrNumber} for booking ${booking.id}`);
    submitUtrMutation.mutate({ bookingId: booking.id, utr: utrNumber }); // Use mutation
  };

  // Combined Loading state
   if (isLoadingEvent || (isSeatMapEvent && isLoadingSeats)) {
       return (
           <div className="container mx-auto py-16 px-4 text-center">
               <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
               <p className="text-muted-foreground">Loading booking details...</p>
           </div>
       );
   }

    // Error state for event loading
    if (isErrorEvent || !event) {
        return (
            <div className="container mx-auto py-16 px-4 text-center">
                <XCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-destructive">Error Loading Event</h2>
                <p className="text-muted-foreground mb-4">{errorEvent?.message || "Could not load event details."}</p>
                <Link href="/events">
                    <Button variant="outline">Back to Events</Button>
                </Link>
            </div>
        );
    }


  const currentStepIndex = stepsConfig.findIndex(s => s.id === step);
   // Filter out selection step for quantity-based booking in the indicator
   const visibleSteps = isSeatMapEvent ? stepsConfig : stepsConfig.filter(s => s.id !== 'selection');
   const currentVisibleStepIndex = visibleSteps.findIndex(s => s.id === step);


  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 max-w-4xl">
       <Link href={`/events/${eventId}`} className="inline-flex items-center text-sm text-primary hover:text-accent mb-6 transition-colors">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Event Details
       </Link>

      <h1 className="text-3xl font-bold text-primary mb-8">Checkout</h1>

      {/* Step Indicator */}
       <div className="flex items-start justify-between mb-10 p-4 bg-muted/50 rounded-lg border border-border">
           {visibleSteps.map((s, index) => (
                <React.Fragment key={s.id}>
                     <div className={`flex flex-col items-center text-center px-1 w-1/${visibleSteps.length} ${index <= currentVisibleStepIndex ? 'text-accent font-semibold' : 'text-muted-foreground'}`}>
                        <div className={`h-10 w-10 rounded-full border-2 ${index <= currentVisibleStepIndex ? 'border-accent bg-accent text-accent-foreground' : 'border-muted bg-background'} flex items-center justify-center mb-1.5 text-xl`}>
                            {index < currentVisibleStepIndex ? <CheckCircle className="h-6 w-6" /> : <s.icon className="h-5 w-5" />}
                         </div>
                        <span className="text-xs sm:text-sm">{s.name}</span>
                    </div>
                     {index < visibleSteps.length - 1 && (
                        <Separator orientation="horizontal" className={`flex-grow mx-1 mt-5 h-0.5 ${index < currentVisibleStepIndex ? 'bg-accent' : 'bg-border'}`} />
                     )}
                </React.Fragment>
           ))}
       </div>


      {/* Step Content */}
      <Card className="bg-card shadow-lg border border-border">

         {step === 'selection' && isSeatMapEvent && (
             <>
                 <CardHeader>
                     <CardTitle className="flex items-center gap-2"><Armchair className="h-6 w-6 text-primary"/> Select Your Seats</CardTitle>
                     <CardDescription>Choose your desired seats from the interactive map below. <span className="text-orange-600 font-medium">Orange seats are temporarily reserved by others.</span></CardDescription>
                 </CardHeader>
                 <CardContent>
                     {isLoadingSeats ? (
                        <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground"/> Loading Seat Map...</div>
                     ) : seatsData && seatsData.length > 0 ? (
                         <SeatSelectionMap
                             eventId={eventId}
                             seats={seatsData}
                             selectedSeats={selectedSeats}
                             onSeatsSelected={handleSeatsSelected} // Update selection state on click
                         />
                    ) : (
                         <p className="text-center text-muted-foreground py-8">Seat map is currently unavailable.</p>
                    )}
                 </CardContent>
                 <CardFooter className="border-t pt-4">
                      <Button
                         onClick={handleConfirmSeatSelection} // Confirm button now triggers reservation
                         disabled={selectedSeats.length === 0 || isProcessing || isLoadingSeats}
                         className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                     >
                         {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4" />}
                         {isProcessing ? 'Reserving Seats...' : `Confirm ${selectedSeats.length} Seat(s) & Proceed`}
                     </Button>
                 </CardFooter>
             </>
         )}

        {(step === 'details') && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Ticket className="h-6 w-6 text-primary"/> Booking Summary & Details</CardTitle>
              <CardDescription>Review your selection and provide information for ticket delivery.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Event & Selection Summary */}
              <div className="p-4 border rounded-md bg-secondary/50 border-border">
                <h3 className="font-semibold text-primary">{event.title}</h3>
                <p className="text-sm text-muted-foreground">{event.location} | {new Date(event.date).toLocaleDateString()}</p>
                <Separator className="my-3" />
                {bookingType === 'seat' ? (
                     <div>
                        <p className="font-medium mb-1">Selected Seats ({selectedSeats.length}):</p>
                         <div className="flex flex-wrap gap-1.5">
                            {selectedSeatDetails.map(seat => seat && (
                                <Badge key={seat.id} variant="secondary" className="font-mono text-xs">
                                    {seat.section ? `${seat.section}-` : ''}{seat.row}{seat.number}
                                 </Badge>
                            ))}
                        </div>
                    </div>
                ) : category ? (
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-accent"/>
                            <span className="font-medium">{category.name}</span>
                        </div>
                         {/* Display base price per item only for quantity type */}
                         {bookingType === 'quantity' && (
                           <span className="font-semibold text-primary">₹{(category?.price || 0).toLocaleString('en-IN')} / ticket</span>
                         )}
                    </div>
                ) : null}
              </div>

              {/* Quantity (Only for quantity-based booking) */}
               {bookingType === 'quantity' && category && (
                  <div className="flex items-center space-x-4">
                    <Label htmlFor="quantity" className="min-w-[80px] shrink-0">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      max="10" // Set a reasonable max limit
                      value={quantity}
                      onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                           // Basic check, ideally check against available category.totalQty - category.bookedQty
                          if (val >= 1 && val <= 10) setQuantity(val);
                      }}
                      className="w-24 bg-background border-input"
                    />
                  </div>
                )}

              {/* Discount Code */}
               <div className="flex items-center space-x-2">
                  <Label htmlFor="discount" className="min-w-[80px] shrink-0">Discount</Label>
                  <Input
                    id="discount"
                    placeholder="Enter code (e.g., IPL10)"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    disabled={discountApplied || isProcessing}
                    className="flex-grow bg-background border-input"
                  />
                  <Button
                    onClick={handleApplyDiscount}
                    disabled={!discountCode || isProcessing}
                    variant={discountApplied ? "outline" : "secondary"}
                    size="sm"
                    className="w-[100px] shrink-0" // Fixed width for button
                  >
                    {isProcessing && discountCode ? <Loader2 className="animate-spin h-4 w-4"/> : discountApplied ? 'Applied' : 'Apply'}
                  </Button>
               </div>
                {discountApplied && (
                  <div className="pl-[96px] flex items-center text-sm text-green-600">
                      <CheckCircle className="h-4 w-4 mr-1.5"/>
                     Discount ({discountType === 'PERCENTAGE' ? `${discountValue * 100}%` : `₹${discountValue}`}) applied!
                   </div>
               )}


              {/* Delivery Details Form */}
              <Separator />
              <h3 className="text-lg font-semibold text-primary">Ticket Delivery Information</h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="Enter your full name" value={deliveryDetails.name} onChange={(e) => setDeliveryDetails({...deliveryDetails, name: e.target.value})} className={`bg-background border-${validationErrors.name ? 'destructive' : 'input'}`} />
                   {validationErrors.name && <p className="text-xs text-destructive">{validationErrors.name}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" type="email" placeholder="Enter your email" value={deliveryDetails.email} onChange={(e) => setDeliveryDetails({...deliveryDetails, email: e.target.value})} className={`bg-background border-${validationErrors.email ? 'destructive' : 'input'}`}/>
                         {validationErrors.email && <p className="text-xs text-destructive">{validationErrors.email}</p>}
                    </div>
                     <div className="space-y-1.5">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" type="tel" placeholder="Enter your phone number" value={deliveryDetails.phone} onChange={(e) => setDeliveryDetails({...deliveryDetails, phone: e.target.value})} className={`bg-background border-${validationErrors.phone ? 'destructive' : 'input'}`}/>
                         {validationErrors.phone && <p className="text-xs text-destructive">{validationErrors.phone}</p>}
                    </div>
                 </div>
                <p className="text-xs text-muted-foreground">Your e-tickets will be sent to this email address upon payment confirmation.</p>
              </div>

              {/* Price Summary */}
              <Separator />
              <div className="space-y-2 text-right bg-secondary/30 p-4 rounded-md border border-border">
                <p className="text-muted-foreground flex justify-between">Subtotal ({quantityOrSeats} {bookingType === 'seat' ? 'seat' : 'ticket'}{quantityOrSeats > 1 ? 's' : ''}): <span className="font-medium text-primary">₹{subtotal.toLocaleString('en-IN')}</span></p>
                {discountApplied && (
                  <p className="text-green-600 flex justify-between">Discount: <span className="font-medium">- ₹{calculatedDiscount.toLocaleString('en-IN')}</span></p>
                )}
                 <Separator className="my-1"/>
                <p className="text-xl font-bold text-primary flex justify-between">Total Amount: <span>₹{finalTotalPrice.toLocaleString('en-IN')}</span></p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-4 border-t pt-4">
                {/* Back button goes to selection only if it's a seat map event */}
                 {isSeatMapEvent && (
                      <Button onClick={() => setStep('selection')} variant="outline" className="w-full sm:w-auto">
                         <ArrowLeft className="mr-2 h-4 w-4"/> Back to Seat Selection
                     </Button>
                 )}
              <Button onClick={handleProceedToPayment} disabled={isProcessing || createBookingMutation.isLoading} className={`w-full ${isSeatMapEvent ? 'sm:w-auto flex-grow' : ''} bg-accent text-accent-foreground hover:bg-accent/90 text-base py-3`}>
                {isProcessing || createBookingMutation.isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CreditCard className="mr-2 h-5 w-5" />}
                {isProcessing || createBookingMutation.isLoading ? 'Saving Details...' : `Proceed to Pay ₹${finalTotalPrice.toLocaleString('en-IN')}`}
              </Button>
            </CardFooter>
          </>
        )}

         {step === 'payment' && (
             <>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><QrCode className="h-6 w-6 text-primary"/> Complete Payment via UPI</CardTitle>
                     <CardDescription>
                         {isLoadingUpiId ? 'Loading payment details...' :
                         activeUpiId ? <>Scan the QR code or use the button below to pay <strong className="text-primary">₹{finalTotalPrice.toLocaleString('en-IN')}</strong>.</>
                         : <span className="text-destructive">UPI Payment is currently unavailable. Please contact support.</span>}
                     </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-6">
                     {isLoadingUpiId && <Loader2 className="h-8 w-8 animate-spin text-muted-foreground my-10" />}

                     {!isLoadingUpiId && activeUpiId && (
                        <>
                             <div className="p-4 border rounded-lg bg-background shadow-inner border-border text-center">
                                <p className="text-muted-foreground mb-2 text-sm">Scan to Pay</p>
                                 <div className="relative w-56 h-56 mx-auto bg-white p-2 rounded-md shadow-md">
                                     {qrCodeDataUrl ? (
                                        <Image src={qrCodeDataUrl} alt="UPI QR Code" layout="fill" objectFit="contain" data-ai-hint="qr code payment" />
                                     ) : (
                                        <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/> Generating QR...</div>
                                     )}
                                 </div>
                            </div>
                            <p className="text-muted-foreground">or</p>
                            {/* UPI Deep Link Button */}
                            <Button asChild variant="outline" size="lg" className="border-accent text-accent hover:bg-accent/10" disabled={!upiUri}>
                                <a href={upiUri ?? '#'} target="_blank" rel="noopener noreferrer">
                                    Pay via UPI App <ExternalLink className="ml-2 h-4 w-4"/>
                                </a>
                            </Button>
                             {/* Copy UPI ID */}
                             <p className="text-xs text-muted-foreground">Manual ID: <Badge variant="outline" className="font-mono text-xs text-primary bg-secondary/50 px-1.5 py-0.5 rounded cursor-pointer border-border hover:border-accent" onClick={() => { navigator.clipboard.writeText(activeUpiId); toast({ title: "Copied!", description: "UPI ID copied to clipboard." }); }} title="Click to copy">{activeUpiId}</Badge></p>

                             <Separator className="w-full my-4" />

                             <p className="text-sm text-center text-muted-foreground max-w-md">
                                <strong className="text-primary">Important:</strong> After completing the payment in your UPI app, click the button below and enter the <strong>UTR / Transaction ID</strong> shown in your app.
                            </p>
                        </>
                     )}
                      {!isLoadingUpiId && !activeUpiId && (
                           <p className="text-destructive font-medium my-10">Payment processing is unavailable.</p>
                      )}
                </CardContent>
                <CardFooter className="flex-col sm:flex-row gap-4 border-t pt-4">
                    <Button onClick={() => setStep('details')} variant="outline" className="w-full sm:w-auto">
                         <ArrowLeft className="mr-2 h-4 w-4"/> Back to Details
                     </Button>
                    <Button onClick={handlePaymentMade} disabled={!activeUpiId || isLoadingUpiId} className="w-full sm:w-auto flex-grow bg-accent text-accent-foreground hover:bg-accent/90 text-base py-3">
                        I Have Paid, Verify Payment <Upload className="ml-2 h-5 w-5" />
                    </Button>
                </CardFooter>
             </>
         )}

        {step === 'verification' && (
             <>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Upload className="h-6 w-6 text-primary"/> Verify Your Payment</CardTitle>
                    <CardDescription>Please enter the <strong>UTR / UPI Transaction ID</strong> from your payment app to confirm your booking for ₹{finalTotalPrice.toLocaleString('en-IN')}.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-secondary/50 border border-border rounded-md p-4 text-sm">
                         <p className="text-muted-foreground mb-1">You are booking:</p>
                         {bookingType === 'seat' ? (
                              <p className="font-medium text-primary">{selectedSeats.length} seat(s) for {event.title}</p>
                         ) : category ? (
                             <p className="font-medium text-primary">{quantity} x {category.name} for {event.title}</p>
                         ) : null}
                        <p className="font-bold text-primary mt-1">Total Amount Paid: ₹{finalTotalPrice.toLocaleString('en-IN')}</p>
                         {booking?.id && <p className="text-xs text-muted-foreground mt-1">Booking ID: <span className="font-mono">{booking.id}</span></p>}
                    </div>
                    <div className="space-y-1.5">
                         <Label htmlFor="utr" className="text-base">UTR / UPI Transaction ID</Label>
                         <Input
                            id="utr"
                            placeholder="Enter the 10-30 digit ID from your app"
                            value={utrNumber}
                            onChange={(e) => setUtrNumber(e.target.value.replace(/\s+/g, ''))} // Remove spaces
                            maxLength={30} // Allow slightly longer UTR
                            className="bg-background border-input text-lg py-2.5" // Larger input
                         />
                         <p className="text-xs text-muted-foreground">Find this unique ID in your UPI app's transaction history (e.g., PhonePe, GPay, Paytm).</p>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row gap-4 border-t pt-4">
                     <Button onClick={() => setStep('payment')} variant="outline" className="w-full sm:w-auto">
                         <ArrowLeft className="mr-2 h-4 w-4"/> Back to Payment Info
                     </Button>
                    <Button onClick={handleSubmitUtr} disabled={isProcessing || !utrNumber || utrNumber.length < 10 || submitUtrMutation.isLoading} className="w-full sm:w-auto flex-grow bg-accent text-accent-foreground hover:bg-accent/90 text-base py-3">
                         {isProcessing || submitUtrMutation.isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <CheckCircle className="mr-2 h-5 w-5" />}
                         {isProcessing || submitUtrMutation.isLoading ? 'Submitting...' : 'Submit for Verification'}
                    </Button>
                </CardFooter>
             </>
         )}

        {step === 'confirmation' && (
             <>
                <CardHeader className="items-center text-center">
                    <div className="bg-green-100 p-4 rounded-full w-fit mx-auto border-4 border-green-200">
                        <ShoppingCart className="h-12 w-12 text-green-600" />
                    </div>
                    <CardTitle className="mt-5 text-2xl text-primary">Booking Submitted!</CardTitle>
                    <CardDescription>Your payment is under verification. You'll receive your e-tickets via email once confirmed.</CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-5">
                     <Separator />
                     <div className="bg-secondary/50 border border-border rounded-md p-4 text-sm space-y-2">
                         {bookingType === 'seat' ? (
                            <p className="text-muted-foreground">Seats: <strong className="text-primary">{selectedSeats.length} seat(s)</strong></p>
                         ) : category ? (
                            <p className="text-muted-foreground">Tickets: <strong className="text-primary">{quantity} x {category.name}</strong></p>
                         ) : null}
                        <p className="text-muted-foreground">Event: <strong className="text-primary">{event.title}</strong></p>
                        <p className="text-muted-foreground">Total Paid: <strong className="text-primary">₹{finalTotalPrice.toLocaleString('en-IN')}</strong></p>
                        <p className="text-muted-foreground">Booking ID: <Badge variant="outline" className="font-mono">{booking?.id || 'Pending...'}</Badge></p>
                         {selectedSeats.length > 0 && (
                             <div className="flex flex-wrap gap-1.5 justify-center pt-1">
                                 <span className="text-xs text-muted-foreground mr-1">Seats:</span>
                                {selectedSeatDetails.map(seat => seat && (
                                    <Badge key={seat.id} variant="secondary" className="font-mono text-xs">
                                        {seat.section ? `${seat.section}-` : ''}{seat.row}{seat.number}
                                    </Badge>
                                ))}
                             </div>
                         )}
                     </div>
                     <p className="text-muted-foreground">
                         Verification usually takes <strong>a few minutes to a few hours</strong>, depending on banking systems.
                         Please keep the UTR <code className="bg-muted px-1 py-0.5 rounded text-xs">{utrNumber}</code> handy for reference.
                    </p>
                     <Separator/>
                     <p className="text-xs text-muted-foreground">If you don't receive confirmation within 24 hours, or have questions, please contact our support team.</p>

                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row gap-4 border-t pt-4">
                     <Button asChild variant="outline" className="w-full sm:w-auto">
                        <Link href="/my-bookings">View My Bookings</Link> {/* Link to user's bookings page */}
                    </Button>
                    <Button asChild className="w-full sm:w-auto flex-grow bg-primary text-primary-foreground hover:bg-primary/90">
                        <Link href="/events">Discover More Events</Link>
                    </Button>
                </CardFooter>
             </>
         )}

      </Card>
    </div>
  );
}
