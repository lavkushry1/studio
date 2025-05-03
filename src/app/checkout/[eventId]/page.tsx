'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Ticket, Tag, CreditCard, ShoppingCart, ArrowLeft, QrCode, Upload, CheckCircle, Loader2, XCircle, User, Mail, Phone, Armchair } from 'lucide-react'; // Added Armchair icon
import Image from 'next/image';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast'; // Import useToast
import { Badge } from '@/components/ui/badge'; // Import Badge
import SeatSelectionMap from '@/components/SeatSelectionMap'; // Import the Seat Map component

// Mock data - Replace with actual fetching
const mockEvent = {
  id: '1',
  name: 'IPL Finals 2024',
  date: new Date(2024, 10, 26, 19, 30),
  location: 'Wankhede Stadium, Mumbai',
  hasSeatMap: true, // Indicate if the event uses a seat map
};

// Assume categories might apply even with seat maps (e.g., pricing tiers based on section)
const mockCategories: { [key: string]: { name: string; price: number } } = {
  'cat1': { name: 'General Admission (Upper Tier)', price: 1500 },
  'cat2': { name: 'Lower Stand - East Wing', price: 3000 },
  'cat3': { name: 'Sachin Tendulkar Stand Box', price: 10000 },
  'cat4': { name: 'Corporate Box (Min. 10 seats)', price: 25000 },
};

// Mock seat data - replace with actual fetched data
const mockSeats = [
    { id: 's1', row: 'A', number: 1, section: 'North', status: 'AVAILABLE', price: 3000 },
    { id: 's2', row: 'A', number: 2, section: 'North', status: 'AVAILABLE', price: 3000 },
    { id: 's3', row: 'A', number: 3, section: 'North', status: 'BOOKED', price: 3000 },
    { id: 's4', row: 'B', number: 1, section: 'North', status: 'AVAILABLE', price: 3000 },
    { id: 's5', row: 'B', number: 2, section: 'North', status: 'RESERVED', price: 3000 },
    { id: 's10', row: 'C', number: 10, section: 'East', status: 'AVAILABLE', price: 1500 },
    { id: 's11', row: 'C', number: 11, section: 'East', status: 'AVAILABLE', price: 1500 },
];

const MOCK_QR_CODE_URL = 'https://picsum.photos/250/250?random=qr'; // Placeholder QR code
const MOCK_UPI_ID = 'eventia-ipl@axisbank'; // Placeholder UPI ID

type CheckoutStep = 'selection' | 'details' | 'payment' | 'verification' | 'confirmation';

const stepsConfig: { id: CheckoutStep; name: string }[] = [
    { id: 'selection', name: 'Select Seats/Tickets' },
    { id: 'details', name: 'Booking Details' },
    { id: 'payment', name: 'Make Payment' },
    { id: 'verification', name: 'Verify Payment' },
    { id: 'confirmation', name: 'Confirmation' },
];

export default function CheckoutPage({ params }: { params: { eventId: string } }) {
  const searchParams = useSearchParams();
  const { toast } = useToast(); // Initialize toast
  const categoryId = searchParams.get('category'); // For quantity-based booking
  const initialSeatIds = searchParams.get('seats')?.split(',') || []; // For seat-based booking
  const { eventId } = params;

  const [step, setStep] = useState<CheckoutStep>('selection'); // Start at selection
  const [quantity, setQuantity] = useState(1);
  const [selectedSeats, setSelectedSeats] = useState<string[]>(initialSeatIds); // Track selected seat IDs
  const [discountCode, setDiscountCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED' | null>(null);
  const [deliveryDetails, setDeliveryDetails] = useState({ name: '', email: '', phone: '' });
  const [utrNumber, setUtrNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false); // For loading states
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({}); // For form validation

  // Fetch event details (replace mock)
  const event = mockEvent;
  const isSeatMapEvent = event.hasSeatMap;

  // Determine booking type based on context
  const bookingType = isSeatMapEvent ? 'seat' : 'quantity';

  // Selected category/price info
  const category = categoryId && !isSeatMapEvent ? mockCategories[categoryId] : null; // Use category only for quantity booking
  const selectedSeatDetails = useMemo(() => {
      return selectedSeats.map(id => mockSeats.find(s => s.id === id)).filter(Boolean);
  }, [selectedSeats]);

  // Calculate totals
  let basePricePerItem = 0;
  let quantityOrSeats = 0;

  if (bookingType === 'seat') {
      // Price calculation for seat-based booking (sum of selected seats' prices)
      // Needs refinement if prices vary significantly or based on categories linked to sections
      basePricePerItem = selectedSeatDetails[0]?.price || 3000; // Example: use first seat's price or average
      quantityOrSeats = selectedSeats.length;
  } else if (category) {
      // Price calculation for quantity-based booking
      basePricePerItem = category.price;
      quantityOrSeats = quantity;
  }

  const subtotal = basePricePerItem * quantityOrSeats;
  let calculatedDiscount = 0;
  if (discountApplied && discountType) {
    calculatedDiscount = discountType === 'PERCENTAGE' ? subtotal * discountValue : discountValue;
    calculatedDiscount = Math.min(calculatedDiscount, subtotal);
  }
  const totalPrice = subtotal - calculatedDiscount;

  // Initial setup and validation
  useEffect(() => {
    if (isSeatMapEvent) {
        // If seat map event, but no seats selected initially, stay on selection step
        if (initialSeatIds.length === 0) {
            setStep('selection');
        } else {
            setSelectedSeats(initialSeatIds);
             // TODO: Verify these seats are valid/available via API call
             // If seats valid, move to details, otherwise back to selection
            setStep('details'); // Assume valid for now
        }
    } else {
        // Quantity-based booking
        if (!categoryId || !mockCategories[categoryId]) {
            console.error("Invalid category ID for quantity booking");
            toast({
                title: "Error",
                description: "Invalid ticket category selected.",
                variant: "destructive",
            });
            // Redirect or show error
        } else {
             setStep('details'); // Proceed directly to details if category is valid
        }
    }
  }, [categoryId, eventId, toast, isSeatMapEvent, initialSeatIds]);


  const handleSeatsSelected = (seatIds: string[]) => {
     setSelectedSeats(seatIds);
     // TODO: Call API to reserve these seats immediately
     console.log("Seats selected, attempting reservation:", seatIds);
     setIsProcessing(true);
     // Simulate reservation API call
     setTimeout(() => {
         // On success:
          toast({ title: "Seats Reserved", description: `Seats held for ${process.env.SEAT_RESERVATION_TIMEOUT_MINUTES || 15} minutes.` });
          setStep('details');
          setIsProcessing(false);
         // On failure:
         // toast({ title: "Reservation Failed", description: "Some seats could not be reserved.", variant: "destructive" });
         // setSelectedSeats(previouslySelectedSeats); // Revert selection
          //setIsProcessing(false);
     }, 1000);
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
        // Simulate API call
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

  const handleProceedToPayment = () => {
     if (!validateDetails()) {
         toast({
             title: "Missing Information",
             description: "Please fill in all required delivery details correctly.",
             variant: "destructive",
         });
         return;
     }
    setIsProcessing(true);
    // Simulate API call to create pending booking
    console.log("Creating pending booking with details:", deliveryDetails, "Qty/Seats:", quantityOrSeats, "Seat IDs:", selectedSeats, "Total:", totalPrice);
    setTimeout(() => {
      setStep('payment');
      setIsProcessing(false);
       toast({ title: "Details Saved", description: "Proceed with payment." });
    }, 800);
  };

   const handlePaymentMade = () => {
        setStep('verification');
         toast({ title: "Payment Step", description: "Enter your UTR to verify the transaction." });
    };

  const handleSubmitUtr = () => {
    if (!utrNumber || utrNumber.length < 10) { // Basic validation
        toast({
             title: "Invalid UTR",
             description: "Please enter a valid UTR/Transaction ID (usually 12 digits or more).",
             variant: "destructive",
         });
        return;
    }
    setIsProcessing(true);
    console.log("Submitting UTR:", utrNumber);
    // Simulate API call
    setTimeout(() => {
      setStep('confirmation');
      setIsProcessing(false);
      toast({ title: "UTR Submitted", description: "Your booking is now processing for verification." });
      // Trigger backend process for admin verification
    }, 1500);
  };

  // Loading state while determining initial setup
  if ((!isSeatMapEvent && !category) || !event) {
    return (
         <div className="container mx-auto py-16 px-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Loading booking details...</p>
            <Link href="/events" className="mt-4 inline-block">
                <Button variant="outline">Back to Events</Button>
            </Link>
        </div>
    );
  }

  const currentStepIndex = stepsConfig.findIndex(s => s.id === step);

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 max-w-4xl">
       <Link href={`/events/${eventId}`} className="inline-flex items-center text-sm text-primary hover:text-accent mb-6 transition-colors">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Event Details
       </Link>

      <h1 className="text-3xl font-bold text-primary mb-8">Checkout</h1>

      {/* Step Indicator */}
       <div className="flex items-center justify-between mb-10 p-4 bg-muted/50 rounded-lg border border-border">
           {stepsConfig.map((s, index) => (
                <React.Fragment key={s.id}>
                     <div className={`flex flex-col items-center text-center ${index <= currentStepIndex ? 'text-accent' : 'text-muted-foreground'} ${s.id === 'selection' && !isSeatMapEvent ? 'hidden' : ''}`}>
                        <div className={`h-8 w-8 rounded-full border-2 ${index <= currentStepIndex ? 'border-accent bg-accent text-accent-foreground' : 'border-muted'} flex items-center justify-center mb-1 font-medium text-sm`}>
                            {index < currentStepIndex ? <CheckCircle className="h-5 w-5" /> : index + 1}
                         </div>
                        <span className="text-xs sm:text-sm font-medium">{s.name}</span>
                    </div>
                    {index < stepsConfig.length - 1 && !(!isSeatMapEvent && (s.id === 'selection' || stepsConfig[index+1].id === 'selection')) && (
                        <Separator orientation="horizontal" className={`flex-grow mx-2 h-0.5 ${index < currentStepIndex ? 'bg-accent' : 'bg-border'}`} />
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
                     <CardDescription>Choose your desired seats from the interactive map below.</CardDescription>
                 </CardHeader>
                 <CardContent>
                     {/* Interactive Seat Map Component */}
                     <SeatSelectionMap
                        eventId={eventId}
                        seats={mockSeats} // Pass fetched seat data
                        selectedSeats={selectedSeats}
                        onSeatsSelected={handleSeatsSelected} // Callback when selection confirmed
                     />
                     {/* Display Summary of selected seats */}
                      {selectedSeats.length > 0 && (
                         <div className="mt-6 p-4 border rounded-md bg-secondary/30">
                            <h4 className="font-semibold mb-2">Selected Seats ({selectedSeats.length}):</h4>
                             <div className="flex flex-wrap gap-2">
                                {selectedSeatDetails.map(seat => seat && (
                                    <Badge key={seat.id} variant="outline" className="font-mono text-sm">
                                        {seat.section ? `${seat.section}-` : ''}{seat.row}{seat.number}
                                     </Badge>
                                ))}
                            </div>
                         </div>
                     )}
                 </CardContent>
                 <CardFooter>
                     <Button
                         onClick={() => handleSeatsSelected(selectedSeats)} // Confirm selection
                         disabled={selectedSeats.length === 0 || isProcessing}
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
                <h3 className="font-semibold text-primary">{event.name}</h3>
                <p className="text-sm text-muted-foreground">{event.location} | {event.date.toLocaleDateString()}</p>
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
                        <span className="font-semibold text-primary">₹{basePricePerItem.toLocaleString('en-IN')} / ticket</span>
                    </div>
                ) : null}
              </div>

              {/* Quantity (Only for quantity-based booking) */}
               {bookingType === 'quantity' && (
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
                <p className="text-xl font-bold text-primary flex justify-between">Total Amount: <span>₹{totalPrice.toLocaleString('en-IN')}</span></p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-4">
                {/* Back button goes to selection only if it's a seat map event */}
                 {isSeatMapEvent && (
                      <Button onClick={() => setStep('selection')} variant="outline" className="w-full sm:w-auto">
                         <ArrowLeft className="mr-2 h-4 w-4"/> Back to Seat Selection
                     </Button>
                 )}
              <Button onClick={handleProceedToPayment} disabled={isProcessing} className={`w-full ${isSeatMapEvent ? 'sm:w-auto flex-grow' : ''} bg-accent text-accent-foreground hover:bg-accent/90 text-base py-3`}>
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CreditCard className="mr-2 h-5 w-5" />}
                {isProcessing ? 'Saving Details...' : `Proceed to Pay ₹${totalPrice.toLocaleString('en-IN')}`}
              </Button>
            </CardFooter>
          </>
        )}

         {step === 'payment' && (
             <>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><QrCode className="h-6 w-6 text-primary"/> Complete Payment via UPI</CardTitle>
                    <CardDescription>Scan the QR code using your UPI app or use the UPI ID below to pay <strong className="text-primary">₹{totalPrice.toLocaleString('en-IN')}</strong>.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-6">
                     <div className="p-4 border rounded-lg bg-background shadow-inner border-border text-center">
                        <p className="text-muted-foreground mb-2 text-sm">Scan to Pay</p>
                         <div className="relative w-56 h-56 mx-auto bg-white p-2 rounded-md shadow-md">
                             <Image src={MOCK_QR_CODE_URL} alt="UPI QR Code" layout="fill" objectFit="contain" data-ai-hint="qr code payment" />
                         </div>
                    </div>
                    <p className="text-muted-foreground">or pay using UPI ID:</p>
                    <Badge variant="outline" className="font-mono text-base text-primary bg-secondary/50 px-4 py-1.5 rounded-md cursor-pointer border-border hover:border-accent" onClick={() => {
                        navigator.clipboard.writeText(MOCK_UPI_ID);
                        toast({ title: "Copied!", description: "UPI ID copied to clipboard." });
                     }} title="Click to copy">
                        {MOCK_UPI_ID}
                    </Badge>

                     <Separator className="w-full my-4" />

                     <p className="text-sm text-center text-muted-foreground max-w-md">
                        <strong className="text-primary">Important:</strong> After completing the payment in your UPI app, click the button below and enter the <strong>UTR / Transaction ID</strong> shown in your app.
                    </p>
                </CardContent>
                <CardFooter className="flex-col sm:flex-row gap-4">
                    <Button onClick={() => setStep('details')} variant="outline" className="w-full sm:w-auto">
                         <ArrowLeft className="mr-2 h-4 w-4"/> Back to Details
                     </Button>
                    <Button onClick={handlePaymentMade} className="w-full sm:w-auto flex-grow bg-accent text-accent-foreground hover:bg-accent/90 text-base py-3">
                        I Have Paid, Verify Payment <Upload className="ml-2 h-5 w-5" />
                    </Button>
                </CardFooter>
             </>
         )}

        {step === 'verification' && (
             <>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Upload className="h-6 w-6 text-primary"/> Verify Your Payment</CardTitle>
                    <CardDescription>Please enter the <strong>UTR / UPI Transaction ID</strong> from your payment app to confirm your booking for ₹{totalPrice.toLocaleString('en-IN')}.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-secondary/50 border border-border rounded-md p-4 text-sm">
                         <p className="text-muted-foreground mb-1">You are booking:</p>
                         {bookingType === 'seat' ? (
                              <p className="font-medium text-primary">{selectedSeats.length} seat(s) for {event.name}</p>
                         ) : category ? (
                             <p className="font-medium text-primary">{quantity} x {category.name} for {event.name}</p>
                         ) : null}
                        <p className="font-bold text-primary mt-1">Total Amount Paid: ₹{totalPrice.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="space-y-1.5">
                         <Label htmlFor="utr" className="text-base">UTR / UPI Transaction ID</Label>
                         <Input
                            id="utr"
                            placeholder="Enter the 12-22 digit ID from your app"
                            value={utrNumber}
                            onChange={(e) => setUtrNumber(e.target.value.replace(/\s+/g, ''))} // Remove spaces
                            maxLength={22} // Common max length for UTR
                            className="bg-background border-input text-lg py-2.5" // Larger input
                         />
                         <p className="text-xs text-muted-foreground">Find this unique ID in your UPI app's transaction history (e.g., PhonePe, GPay, Paytm).</p>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row gap-4">
                     <Button onClick={() => setStep('payment')} variant="outline" className="w-full sm:w-auto">
                         <ArrowLeft className="mr-2 h-4 w-4"/> Back to Payment Info
                     </Button>
                    <Button onClick={handleSubmitUtr} disabled={isProcessing || !utrNumber || utrNumber.length < 10} className="w-full sm:w-auto flex-grow bg-accent text-accent-foreground hover:bg-accent/90 text-base py-3">
                         {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <CheckCircle className="mr-2 h-5 w-5" />}
                         {isProcessing ? 'Submitting...' : 'Submit for Verification'}
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
                        <p className="text-muted-foreground">Event: <strong className="text-primary">{event.name}</strong></p>
                        <p className="text-muted-foreground">Total Paid: <strong className="text-primary">₹{totalPrice.toLocaleString('en-IN')}</strong></p>
                        <p className="text-muted-foreground">Booking ID: <Badge variant="outline" className="font-mono">BKNG-{eventId.slice(-3)}-{Date.now().toString().slice(-5)}</Badge> (Example)</p>
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
                <CardFooter className="flex flex-col sm:flex-row gap-4">
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
