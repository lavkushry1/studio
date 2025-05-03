'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle, XCircle, QrCode, Video, VideoOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsQR from 'jsqr'; // Library for QR code scanning

// Assume backend provides a validation endpoint `/api/tickets/validate`
// import { validateTicketApi } from '@/services/ticketService'; // Assuming this function exists

// Mock validation function - replace with actual API call
const validateTicketApi = async (qrData: string, token: string): Promise<any> => {
    console.log("Mock validating ticket with data:", qrData, "using token:", token);
    await new Promise(res => setTimeout(res, 1000)); // Simulate network delay

     // Simulate backend verification logic (e.g., checking hash, finding ticket)
     // Use ticketService.verifyQrData logic as a base
     const parts = qrData.split(':');
     let isValidQr = false;
     let ticketId = null;
     if (parts.length === 2) {
         ticketId = parts[0];
         // Mock hash check
         isValidQr = true; // Assume valid hash for demo
     }

    if (!isValidQr) {
        throw new Error("Invalid QR Code format.");
    }

    // Simulate database check
    const mockDb = {
        'ticket123': { isUsed: false, event: 'IPL Finals', attendee: 'John Doe' },
        'ticket456': { isUsed: true, usedAt: new Date(Date.now() - 3600000), event: 'Rock Legends', attendee: 'Jane Smith' },
    };

    const ticketInfo = (mockDb as any)[ticketId!];

    if (!ticketInfo) {
        throw new Error(`Ticket (${ticketId}) not found.`);
    }
    if (ticketInfo.isUsed) {
        throw new Error(`Ticket already used at ${new Date(ticketInfo.usedAt).toLocaleTimeString()}.`);
    }

    // Simulate marking as used
     (mockDb as any)[ticketId!].isUsed = true;
     (mockDb as any)[ticketId!].usedAt = new Date();

    return {
        message: "Validation Successful!",
        ticket: {
            id: ticketId,
            eventTitle: ticketInfo.event,
            attendeeName: ticketInfo.attendee, // Example extra info
            status: 'VALID',
        }
    };
};


export default function ValidateTicketPage() {
    const { user, getAccessToken, isLoading: authLoading } = useAuth();
    const { toast } = useToast();
    const [manualQrData, setManualQrData] = useState('');
    const [validationResult, setValidationResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false); // Control camera scanning state
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number>();


     // Check permissions and setup scanner stream when isScanning becomes true
     useEffect(() => {
         let stream: MediaStream | null = null;

         const setupScanner = async () => {
             if (isScanning && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                 setError(null); // Clear previous errors
                 setHasCameraPermission(null); // Reset permission state
                 try {
                     stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); // Prefer rear camera
                     setHasCameraPermission(true);
                     if (videoRef.current) {
                         videoRef.current.srcObject = stream;
                         videoRef.current.play();
                         // Start scanning loop
                         animationFrameRef.current = requestAnimationFrame(scanQrCode);
                     }
                 } catch (err) {
                     console.error("Camera access error:", err);
                     setHasCameraPermission(false);
                     setError("Camera access denied or camera not found. Please enable camera permissions.");
                     setIsScanning(false); // Stop scanning if permission denied
                 }
             }
         };

         setupScanner();

         // Cleanup function
         return () => {
             if (animationFrameRef.current) {
                 cancelAnimationFrame(animationFrameRef.current);
             }
             if (stream) {
                 stream.getTracks().forEach(track => track.stop());
                 console.log("Camera stream stopped.");
             }
             if (videoRef.current) {
                 videoRef.current.srcObject = null;
             }
         };
         // eslint-disable-next-line react-hooks/exhaustive-deps
     }, [isScanning]); // Dependency on isScanning state


     // QR Code scanning logic
     const scanQrCode = () => {
         if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
             const video = videoRef.current;
             const canvas = canvasRef.current;
             const context = canvas.getContext('2d');

             if (context) {
                 // Set canvas dimensions to match video
                 canvas.height = video.videoHeight;
                 canvas.width = video.videoWidth;

                 // Draw video frame onto canvas
                 context.drawImage(video, 0, 0, canvas.width, canvas.height);

                 // Get image data from canvas
                 const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

                 // Decode QR code
                 const code = jsQR(imageData.data, imageData.width, imageData.height, {
                     inversionAttempts: 'dontInvert', // Performance optimization
                 });

                 if (code) {
                     console.log("QR Code Detected:", code.data);
                     setManualQrData(code.data); // Populate input field
                     setIsScanning(false); // Stop scanning after detection
                      // Automatically trigger validation after scan
                     handleValidate(code.data);
                 }
             }
         }
         // Continue scanning if still active
         if (isScanning) {
             animationFrameRef.current = requestAnimationFrame(scanQrCode);
         }
     };


    const handleValidate = async (dataToValidate?: string) => {
        const qrData = dataToValidate || manualQrData;
        if (!qrData) {
            setError("Please enter or scan QR code data.");
            return;
        }
        const token = getAccessToken();
        if (!token) {
            setError("Authentication required. Please log in.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setValidationResult(null);

        try {
            const result = await validateTicketApi(qrData, token); // Call API
            setValidationResult(result);
            toast({
                title: "Validation Successful",
                description: `Ticket for ${result?.ticket?.eventTitle || 'event'} is valid.`,
                variant: "default", // Use default (often green)
            });
        } catch (err: any) {
            setError(err.message || "Validation failed.");
            toast({
                title: "Validation Failed",
                description: err.message || "An unexpected error occurred.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
             // Optionally clear manual input after validation attempt
             // setManualQrData('');
        }
    };

    const toggleScanning = () => {
         if (isScanning) {
             setIsScanning(false); // Stop scanning
         } else {
             setIsScanning(true); // Start scanning
         }
     };

    // Redirect if not admin or auth loading
    if (authLoading) return <div className="container py-10 text-center"><Loader2 className="h-8 w-8 animate-spin"/></div>;
    // Add check for specific role if needed (e.g., SCANNER role)
     if (!user || (user.role !== 'ADMIN' && user.role !== 'ORGANIZER')) { // Allowing Organizer too
         return (
            <div className="container py-10 text-center">
                <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2"/>
                 <p className="text-destructive">Access Denied. You need permission to validate tickets.</p>
                 <Button variant="link" asChild><Link href="/">Go Home</Link></Button>
             </div>
         );
     }

    return (
        <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 max-w-2xl">
            <h1 className="text-3xl font-bold text-primary mb-8 flex items-center gap-3">
                <QrCode className="h-8 w-8 text-accent" /> Ticket Validation
            </h1>

            <Card className="mb-6">
                 <CardHeader>
                     <CardTitle>Scan or Enter QR Code</CardTitle>
                     <CardDescription>Use your device camera to scan the ticket's QR code or enter the data manually.</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                     {/* Scanner Section */}
                     <div className="space-y-2">
                        <Button onClick={toggleScanning} variant="outline" className="w-full">
                            {isScanning ? <VideoOff className="mr-2 h-4 w-4" /> : <Video className="mr-2 h-4 w-4" />}
                            {isScanning ? 'Stop Camera Scan' : 'Scan with Camera'}
                         </Button>
                         {hasCameraPermission === false && !isScanning && (
                             <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Camera Access Denied</AlertTitle>
                                <AlertDescription>
                                    Please enable camera permissions in your browser settings to use the scanner.
                                </AlertDescription>
                             </Alert>
                         )}
                         {isScanning && (
                             <div className="border rounded-md overflow-hidden aspect-video bg-black flex items-center justify-center relative">
                                 <video ref={videoRef} playsInline className="w-full h-full object-cover" />
                                 <canvas ref={canvasRef} className="hidden" /> {/* Hidden canvas for processing */}
                                 {/* Optional: Add overlay for aiming */}
                                 <div className="absolute inset-0 border-4 border-red-500/50 pointer-events-none" style={{ clipPath: 'inset(25% 25% 25% 25%)' }}></div>
                                 <p className="absolute bottom-2 left-2 text-white bg-black/50 px-2 py-1 rounded text-xs">Align QR code within the box</p>
                                 {hasCameraPermission === null && <Loader2 className="absolute h-8 w-8 animate-spin text-white"/> }
                             </div>
                         )}
                     </div>

                     <div className="flex items-center gap-4">
                        <Separator className="flex-grow"/>
                         <span className="text-xs text-muted-foreground">OR</span>
                         <Separator className="flex-grow"/>
                     </div>

                     {/* Manual Input Section */}
                     <div className="space-y-1">
                         <Label htmlFor="qrData">Manual QR Data Entry</Label>
                         <Input
                            id="qrData"
                            placeholder="Enter data from QR code..."
                            value={manualQrData}
                            onChange={(e) => setManualQrData(e.target.value)}
                            disabled={isLoading || isScanning}
                         />
                     </div>
                     <Button onClick={() => handleValidate()} disabled={isLoading || isScanning || !manualQrData} className="w-full">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
                        Validate Manually
                     </Button>
                 </CardContent>
            </Card>

            {/* Validation Result Section */}
            {(isLoading || error || validationResult) && (
                <Card>
                    <CardHeader>
                        <CardTitle>Validation Result</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading && (
                             <div className="text-center p-4">
                                 <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                 <p className="mt-2 text-sm text-muted-foreground">Validating...</p>
                             </div>
                         )}
                        {error && (
                            <Alert variant="destructive">
                                <XCircle className="h-5 w-5" />
                                <AlertTitle>Validation Failed</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        {validationResult && validationResult.ticket?.status === 'VALID' && (
                             <Alert variant="default" className="bg-green-50 border-green-200 text-green-800 [&>svg]:text-green-600">
                                <CheckCircle className="h-5 w-5" />
                                <AlertTitle>Ticket Valid!</AlertTitle>
                                <AlertDescription className="space-y-1 mt-2">
                                     <p><strong>Ticket ID:</strong> {validationResult.ticket.id}</p>
                                     <p><strong>Event:</strong> {validationResult.ticket.eventTitle || 'N/A'}</p>
                                     <p><strong>Attendee:</strong> {validationResult.ticket.attendeeName || 'N/A'}</p>
                                     <p className="font-semibold mt-2">Grant Entry.</p>
                                </AlertDescription>
                             </Alert>
                         )}
                          {validationResult && validationResult.ticket?.status !== 'VALID' && ( // Catch other potential statuses
                             <Alert variant="destructive">
                                <XCircle className="h-5 w-5" />
                                <AlertTitle>Validation Issue</AlertTitle>
                                <AlertDescription>
                                    {validationResult.message || 'Ticket is not valid for entry.'}
                                </AlertDescription>
                             </Alert>
                         )}
                    </CardContent>
                     <CardFooter>
                        <Button variant="outline" onClick={() => { setManualQrData(''); setValidationResult(null); setError(null); }} disabled={isScanning}>
                             Clear / Scan Next
                         </Button>
                     </CardFooter>
                </Card>
            )}
        </div>
    );
}
