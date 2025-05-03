'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Ticket, Tag, CreditCard, ShoppingCart, ArrowLeft, QrCode, Upload } from 'lucide-react';
import Image from 'next/image'; // Assuming QR code will be an image
import Link from 'next/link';

// Mock data - Replace with actual fetching
const mockEvent = {
  id: '1',
  name: 'IPL Finals 2024',
  date: new Date(2024, 10, 26, 19, 30),
  location: 'Wankhede Stadium, Mumbai',
};

const mockCategories: { [key: string]: { name: string; price: number } } = {
  'cat1': { name: 'General Admission', price: 1500 },
  'cat2': { name: 'Lower Stand - East', price: 3000 },
  'cat3': { name: 'VIP Box', price: 10000 },
};

const MOCK_QR_CODE_URL = 'https://picsum.photos/200/200?random=qr'; // Placeholder QR code
const MOCK_UPI_ID = 'eventia-ipl@upi'; // Placeholder UPI ID

type CheckoutStep = 'details' | 'payment' | 'verification' | 'confirmation';

export default function CheckoutPage({ params }: { params: { eventId: string } }) {
  const searchParams = useSearchParams();
  const categoryId = searchParams.get('category');
  const { eventId } = params;

  const [step, setStep] = useState<CheckoutStep>('details');
  const [quantity, setQuantity] = useState(1);
  const [discountCode, setDiscountCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false); // Simulate discount application
  const [discountValue, setDiscountValue] = useState(0); // Simulate discount value (e.g., 10% = 0.1, ₹100 = 100)
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED' | null>(null); // Simulate discount type
  const [deliveryDetails, setDeliveryDetails] = useState({ name: '', email: '', phone: '' });
  const [utrNumber, setUtrNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false); // For loading states

  const category = categoryId ? mockCategories[categoryId] : null;
  const event = mockEvent; // Fetch event details based on eventId

  // Calculate totals
  const basePrice = category ? category.price : 0;
  const subtotal = basePrice * quantity;
  let calculatedDiscount = 0;
  if (discountApplied && discountType && category) {
    calculatedDiscount = discountType === 'PERCENTAGE' ? subtotal * discountValue : discountValue;
    // Ensure discount doesn't exceed subtotal
    calculatedDiscount = Math.min(calculatedDiscount, subtotal);
  }
  const totalPrice = subtotal - calculatedDiscount;

  useEffect(() => {
    // Reset step if category changes? Or handle invalid category?
    if (!categoryId || !mockCategories[categoryId]) {
      // Redirect or show error if category is invalid
      console.error("Invalid category ID");
      // router.push('/events'); // Example redirect
    }
  }, [categoryId]);

   const handleApplyDiscount = () => {
        // --- Simulate API call to validate discount code ---
        console.log("Applying discount code:", discountCode);
        setIsProcessing(true);
        setTimeout(() => {
            if (discountCode.toUpperCase() === 'IPL10') {
                setDiscountApplied(true);
                setDiscountValue(0.10); // 10%
                setDiscountType('PERCENTAGE');
                // Show success toast/message
            } else if (discountCode.toUpperCase() === 'FLAT100') {
                 setDiscountApplied(true);
                 setDiscountValue(100); // Flat 100
                 setDiscountType('FIXED');
                 // Show success toast/message
            }
            else {
                setDiscountApplied(false);
                setDiscountValue(0);
                setDiscountType(null);
                 // Show error toast/message
                console.log("Invalid discount code");
            }
            setIsProcessing(false);
        }, 1000);
        // --- End Simulation ---
    };

  const handleProceedToPayment = () => {
    // Validate delivery details here
    if (!deliveryDetails.name || !deliveryDetails.email || !deliveryDetails.phone) {
      console.error("Please fill in all delivery details");
      // Show error toast/message
      return;
    }
    setIsProcessing(true);
    // Simulate API call to create pending booking
    setTimeout(() => {
      setStep('payment');
      setIsProcessing(false);
    }, 500);
  };

   const handlePaymentMade = () => {
        setStep('verification');
    };

  const handleSubmitUtr = () => {
    if (!utrNumber || utrNumber.length < 10) { // Basic validation
        console.error("Please enter a valid UTR number");
        // Show error toast/message
        return;
    }
    setIsProcessing(true);
    console.log("Submitting UTR:", utrNumber);
    // --- Simulate API call to submit UTR ---
    setTimeout(() => {
      setStep('confirmation');
      setIsProcessing(false);
      // Trigger backend process for admin verification
    }, 1500);
    // --- End Simulation ---
  };

  if (!category || !event) {
    return <div className="container mx-auto py-8 text-center">Loading details or invalid selection...</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 max-w-4xl">
       <Link href={`/events/${eventId}`} className="inline-flex items-center text-sm text-primary hover:text-accent mb-4">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Event
       </Link>

      <h1 className="text-3xl font-bold text-primary mb-6">Checkout</h1>

      {/* Step Indicator (Optional) */}
       <div className="flex justify-center space-x-4 mb-8 text-sm">
            <span className={`${step === 'details' ? 'font-bold text-accent' : 'text-muted-foreground'}`}>1. Details</span>
            <span className="text-muted-foreground">{'>'}</span>
            <span className={`${step === 'payment' ? 'font-bold text-accent' : 'text-muted-foreground'}`}>2. Payment</span>
             <span className="text-muted-foreground">{'>'}</span>
            <span className={`${step === 'verification' ? 'font-bold text-accent' : 'text-muted-foreground'}`}>3. Verify</span>
            <span className="text-muted-foreground">{'>'}</span>
            <span className={`${step === 'confirmation' ? 'font-bold text-accent' : 'text-muted-foreground'}`}>4. Confirmation</span>
       </div>


      {/* Step Content */}
      <Card className="bg-card shadow-lg">
        {step === 'details' && (
          <>
            <CardHeader>
              <CardTitle>Booking Summary & Details</CardTitle>
              <CardDescription>Review your selection and provide delivery information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Event & Category Summary */}
              <div className="p-4 border rounded-md bg-secondary/30">
                <h3 className="font-semibold text-primary">{event.name}</h3>
                <p className="text-sm text-muted-foreground">{event.location} | {event.date.toLocaleDateString()}</p>
                <Separator className="my-2" />
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-accent"/>
                        <span className="font-medium">{category.name}</span>
                    </div>
                    <span className="font-semibold text-primary">₹{basePrice.toLocaleString('en-IN')} / ticket</span>
                </div>
              </div>

              {/* Quantity */}
              <div className="flex items-center space-x-4">
                <Label htmlFor="quantity" className="min-w-[80px]">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max="10" // Set a reasonable max limit
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                  className="w-20 bg-background"
                />
              </div>

              {/* Discount Code */}
               <div className="flex items-center space-x-2">
                  <Label htmlFor="discount" className="min-w-[80px]">Discount</Label>
                  <Input
                    id="discount"
                    placeholder="Enter code"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    disabled={discountApplied || isProcessing}
                    className="flex-grow bg-background"
                  />
                  <Button
                    onClick={handleApplyDiscount}
                    disabled={!discountCode || discountApplied || isProcessing}
                    variant="outline"
                    size="sm"
                  >
                    {isProcessing ? 'Applying...' : discountApplied ? 'Applied' : 'Apply'}
                  </Button>
               </div>
               {discountApplied && (
                  <p className="text-sm text-green-600 pl-[96px]">
                    Discount applied ({discountType === 'PERCENTAGE' ? `${discountValue * 100}%` : `₹${discountValue}`})!
                   </p>
               )}


              {/* Delivery Details Form */}
              <Separator />
              <h3 className="text-lg font-semibold text-primary">Delivery Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={deliveryDetails.name} onChange={(e) => setDeliveryDetails({...deliveryDetails, name: e.target.value})} className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" value={deliveryDetails.email} onChange={(e) => setDeliveryDetails({...deliveryDetails, email: e.target.value})} className="bg-background"/>
                </div>
                 <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" value={deliveryDetails.phone} onChange={(e) => setDeliveryDetails({...deliveryDetails, phone: e.target.value})} className="bg-background"/>
                </div>
                {/* Add address fields if physical delivery is needed */}
              </div>

              {/* Price Summary */}
              <Separator />
              <div className="space-y-2 text-right">
                <p className="text-muted-foreground">Subtotal ({quantity} tickets): <span className="font-medium text-primary">₹{subtotal.toLocaleString('en-IN')}</span></p>
                {discountApplied && (
                  <p className="text-green-600">Discount: <span className="font-medium">- ₹{calculatedDiscount.toLocaleString('en-IN')}</span></p>
                )}
                <p className="text-xl font-bold text-primary">Total: ₹{totalPrice.toLocaleString('en-IN')}</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleProceedToPayment} disabled={isProcessing} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                {isProcessing ? 'Processing...' : 'Proceed to Payment'}
                <CreditCard className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </>
        )}

         {step === 'payment' && (
             <>
                <CardHeader>
                    <CardTitle>Complete Payment via UPI</CardTitle>
                    <CardDescription>Scan the QR code or use the UPI ID to pay ₹{totalPrice.toLocaleString('en-IN')}.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-6">
                     <div className="p-4 border rounded-md bg-secondary/30 text-center">
                        <p className="text-muted-foreground mb-1">Scan to Pay</p>
                         <div className="relative w-48 h-48 mx-auto bg-white p-2 rounded">
                             <Image src={MOCK_QR_CODE_URL} alt="UPI QR Code" layout="fill" objectFit="contain" data-ai-hint="qr code" />
                         </div>
                    </div>
                    <p className="text-muted-foreground">or pay using UPI ID:</p>
                    <p className="font-mono text-primary bg-secondary/50 px-3 py-1 rounded-md cursor-pointer" onClick={() => navigator.clipboard.writeText(MOCK_UPI_ID)} title="Click to copy">
                        {MOCK_UPI_ID}
                    </p>

                     <Separator className="w-full" />

                     <p className="text-sm text-center text-muted-foreground max-w-md">
                        After completing the payment, click the button below to proceed to UTR number verification.
                        Your booking is pending until payment is confirmed by our team.
                    </p>
                </CardContent>
                <CardFooter className="flex-col sm:flex-row gap-4">
                    <Button onClick={() => setStep('details')} variant="outline" className="w-full sm:w-auto">
                         <ArrowLeft className="mr-2 h-4 w-4"/> Go Back
                     </Button>
                    <Button onClick={handlePaymentMade} className="w-full sm:w-auto flex-grow bg-accent text-accent-foreground hover:bg-accent/90">
                        I Have Paid, Enter UTR
                    </Button>
                </CardFooter>
             </>
         )}

        {step === 'verification' && (
             <>
                <CardHeader>
                    <CardTitle>Verify Payment</CardTitle>
                    <CardDescription>Please enter the UTR / UPI Transaction ID from your payment app.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        You paid <span className="font-bold text-primary">₹{totalPrice.toLocaleString('en-IN')}</span> for {quantity} x {category.name} tickets.
                    </p>
                    <div className="space-y-2">
                         <Label htmlFor="utr">UTR / UPI Transaction ID</Label>
                         <Input
                            id="utr"
                            placeholder="Enter your 12-digit UTR number"
                            value={utrNumber}
                            onChange={(e) => setUtrNumber(e.target.value)}
                            maxLength={22} // Common max length for UTR, adjust if needed
                            className="bg-background"
                         />
                         <p className="text-xs text-muted-foreground">Find this ID in your payment app's transaction history.</p>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSubmitUtr} disabled={isProcessing || !utrNumber} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                         {isProcessing ? 'Submitting...' : 'Submit UTR for Verification'}
                         <Upload className="ml-2 h-4 w-4" />
                    </Button>
                </CardFooter>
             </>
         )}

        {step === 'confirmation' && (
             <>
                <CardHeader className="items-center text-center">
                    <div className="bg-green-100 p-3 rounded-full w-fit mx-auto">
                        <ShoppingCart className="h-10 w-10 text-green-600" />
                    </div>
                    <CardTitle className="mt-4">Booking Submitted!</CardTitle>
                    <CardDescription>Your payment is being verified. You'll receive an email once confirmed.</CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                     <p className="text-muted-foreground">
                         Your booking for <span className="font-medium text-primary">{event.name}</span> is now processing.
                         Verification usually takes a few hours.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Booking ID: <span className="font-mono bg-secondary/50 px-2 py-0.5 rounded">BKNG-{eventId}-{Date.now().toString().slice(-4)}</span> (Example ID)
                    </p>
                     <Separator/>
                     <p className="text-xs text-muted-foreground">If you don't receive confirmation within 24 hours, please contact support.</p>

                </CardContent>
                <CardFooter>
                    <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                        <Link href="/events">Browse More Events</Link>
                    </Button>
                </CardFooter>
             </>
         )}

      </Card>
    </div>
  );
}
