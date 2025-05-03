import { prisma } from '@/lib/prisma';
import { Booking, Ticket, BookingStatus, Seat } from '@prisma/client';
import QRCode from 'qrcode';
import { sendTicketEmail } from './email.service'; // Import email service
import crypto from 'crypto'; // For generating secure unique data

// Import a PDF generation library (choose one, e.g., pdfkit or puppeteer)
// Option 1: pdfkit (lighter weight, more manual layout)
import PDFDocument from 'pdfkit';
import streamBuffers from 'stream-buffers'; // To get PDF as buffer

// Option 2: Puppeteer (uses headless Chrome, more powerful, heavier)
// import puppeteer from 'puppeteer';

// --- Configuration ---
const QR_CODE_SECRET = process.env.QR_CODE_SECRET || 'a-very-secret-string-for-qr-validation'; // Secret for QR data validation
const TICKET_VALIDATION_BASE_URL = process.env.TICKET_VALIDATION_BASE_URL || 'http://localhost:9002/validate'; // Base URL for QR code links

/**
 * Generates unique, secure data for the QR code.
 * @param ticketId - The ID of the ticket.
 * @returns A string containing ticketId and a validation hash.
 */
const generateQrData = (ticketId: string): string => {
    // Create a simple hash/signature to prevent easy forgery
    const hash = crypto.createHmac('sha256', QR_CODE_SECRET)
                       .update(ticketId)
                       .digest('hex')
                       .substring(0, 16); // Use a portion of the hash
    // Combine ticket ID and hash
    return `${ticketId}:${hash}`;
    // Alternative: Could generate a unique random string and store it, then use that.
    // Alternative 2: Could return a URL like `${TICKET_VALIDATION_BASE_URL}?ticket=${ticketId}&sig=${hash}`
};

/**
 * Verifies the data from a scanned QR code.
 * @param qrData - The data scanned from the QR code.
 * @returns The ticket ID if the data is valid, otherwise null.
 */
export const verifyQrData = (qrData: string): string | null => {
    const parts = qrData.split(':');
    if (parts.length !== 2) {
        console.warn("QR Data verification failed: Invalid format");
        return null;
    }
    const [ticketId, receivedHash] = parts;

    // Regenerate the expected hash
    const expectedHash = crypto.createHmac('sha256', QR_CODE_SECRET)
                             .update(ticketId)
                             .digest('hex')
                             .substring(0, 16);

    if (crypto.timingSafeEqual(Buffer.from(receivedHash), Buffer.from(expectedHash))) {
        return ticketId; // Valid
    } else {
         console.warn(`QR Data verification failed: Hash mismatch for ticket ${ticketId}`);
        return null; // Invalid hash
    }
};


/**
 * Generates a PDF ticket using pdfkit.
 * @param ticket - The ticket data.
 * @param booking - The associated booking data.
 * @param qrCodeDataURL - The data URL of the QR code image.
 * @returns A Promise resolving with the PDF content as a Buffer.
 */
const generatePdfTicketPdfkit = async (
    ticket: Ticket & { booking: Booking & { event: { title: string, date: Date, location: string }, user: { name: string | null } | null } },
    qrCodeDataURL: string
): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A6', margin: 30 }); // Smaller size like A6
        const bufferStream = new streamBuffers.WritableStreamBuffer({
            initialSize: (100 * 1024),   // start with 100 kilobytes
            incrementAmount: (10 * 1024) // grow by 10 kilobytes
        });

        doc.pipe(bufferStream);

        // --- Ticket Content ---
        doc.fontSize(16).font('Helvetica-Bold').text('TicketFlow E-Ticket', { align: 'center' });
        doc.moveDown(1.5);

        doc.fontSize(12).font('Helvetica-Bold').text(ticket.booking.event.title, { align: 'center' });
        doc.fontSize(10).font('Helvetica').text(new Date(ticket.booking.event.date).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' }), { align: 'center' });
        doc.text(`Venue: ${ticket.booking.event.location}`, { align: 'center' });
        doc.moveDown(1);

        doc.font('Helvetica-Bold').text('Attendee:').font('Helvetica').text(ticket.booking.deliveryName || ticket.booking.user?.name || 'Guest');
        doc.moveDown(0.5);

        // Seat Info (if applicable)
        if (ticket.seat) {
             doc.font('Helvetica-Bold').text('Seat:').font('Helvetica')
                .text(`Section: ${ticket.seat.section || 'N/A'}, Row: ${ticket.seat.row}, Number: ${ticket.seat.number}`);
             doc.moveDown(0.5);
        } else {
             // Maybe show quantity/category if not seat-based
        }

        doc.font('Helvetica-Bold').text('Booking ID:').font('Helvetica').text(ticket.bookingId);
        doc.font('Helvetica-Bold').text('Ticket ID:').font('Helvetica').text(ticket.id);
        doc.moveDown(1.5);

        // QR Code
        if (qrCodeDataURL) {
            // Embed the QR code image (assuming it's a PNG data URL)
            const qrImageBuffer = Buffer.from(qrCodeDataURL.split(',')[1], 'base64');
             // Calculate position to center QR code (approximate)
             const qrSize = 100; // Adjust size as needed
             const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
             const xPos = (pageWidth - qrSize) / 2 + doc.page.margins.left;
            doc.image(qrImageBuffer, xPos, doc.y, { fit: [qrSize, qrSize] });
            doc.moveDown(0.5);
            doc.fontSize(8).text('Scan for Entry Validation', { align: 'center' });
        } else {
            doc.fontSize(10).text('[QR Code Error]', { align: 'center' });
        }

        doc.moveDown(1.5);
        doc.fontSize(8).text('Terms: This ticket is non-transferable. Valid for one entry.', { align: 'center' });
        // --- End Ticket Content ---

        doc.end();

        bufferStream.on('finish', () => {
            resolve(bufferStream.getContents() as Buffer);
        });
        bufferStream.on('error', (err) => {
            reject(err);
        });
    });
};


/**
 * Generates tickets for a confirmed booking, saves them, generates PDFs, and sends email.
 * @param bookingId - The ID of the confirmed booking.
 * @returns Promise resolving when tickets are generated and email is attempted.
 * @throws Error if booking not found, not confirmed, or ticket generation fails.
 */
export const generateAndSendTickets = async (bookingId: string): Promise<void> => {
    console.log(`Generating tickets for booking ${bookingId}...`);

    // 1. Fetch confirmed booking with details needed for tickets
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            event: { select: { id: true, title: true, date: true, location: true } },
            user: { select: { email: true, name: true } }, // Include user email and name
            seats: true, // Include booked seats
        },
    });

    if (!booking) {
        throw new Error(`Booking not found: ${bookingId}`);
    }
    if (booking.status !== BookingStatus.CONFIRMED) {
        throw new Error(`Booking status is ${booking.status}, cannot generate tickets.`);
    }
    if (!booking.event) {
         throw new Error(`Event data missing for booking ${bookingId}.`);
    }
    // Determine recipient email
     const recipientEmail = booking.deliveryEmail || booking.user?.email;
     if (!recipientEmail) {
         console.error(`No recipient email found for booking ${bookingId}. Cannot send tickets.`);
         // Decide how to handle this: maybe update booking status? For now, just log and exit.
         // throw new Error(`Recipient email missing for booking ${bookingId}.`);
         return;
     }


    // 2. Check if tickets already exist for this booking
    const existingTickets = await prisma.ticket.count({ where: { bookingId: booking.id } });
    if (existingTickets > 0) {
        console.log(`Tickets already generated for booking ${bookingId}. Resending email (if needed).`);
        // TODO: Implement logic to resend email if necessary, or just return.
        // For now, we'll just proceed to generate/send again if needed, or skip if already emailed.
        const firstTicket = await prisma.ticket.findFirst({ where: { bookingId: booking.id }});
        if (firstTicket?.emailedAt) {
            console.log(`Tickets for booking ${bookingId} already emailed at ${firstTicket.emailedAt}. Skipping regeneration/resend.`);
            return;
        }
         // If not emailed, proceed to generate/send.
    }

    // 3. Generate Ticket Records in DB
    const ticketsToCreate: Prisma.TicketCreateManyInput[] = [];
    const generatedTickets: Ticket[] = []; // To hold created tickets for PDF generation

    if (booking.seats.length > 0) {
        // Seat-based booking: 1 ticket per seat
        for (const seat of booking.seats) {
            const ticketData = {
                bookingId: booking.id,
                eventId: booking.eventId,
                eventTitle: booking.event.title,
                eventDate: booking.event.date,
                seatId: seat.id,
                qrData: '', // Placeholder, will be generated below
            };
            ticketsToCreate.push(ticketData);
        }
    } else {
        // Quantity-based booking: Create 'quantity' number of tickets
        for (let i = 0; i < booking.quantity; i++) {
            const ticketData = {
                bookingId: booking.id,
                eventId: booking.eventId,
                eventTitle: booking.event.title,
                eventDate: booking.event.date,
                seatId: null, // No specific seat
                qrData: '', // Placeholder
            };
            ticketsToCreate.push(ticketData);
        }
    }

    if (ticketsToCreate.length === 0) {
        console.warn(`No tickets to create for booking ${bookingId}. Seats/Quantity might be zero.`);
        return;
    }

    // Create tickets in a transaction and get their IDs
     const createdTicketsResult = await prisma.$transaction(
        ticketsToCreate.map((data) => prisma.ticket.create({ data }))
    );
    generatedTickets.push(...createdTicketsResult);

    // Update tickets with unique QR data
    const ticketUpdatePromises = generatedTickets.map(ticket => {
        const qrData = generateQrData(ticket.id);
        return prisma.ticket.update({
            where: { id: ticket.id },
            data: { qrData },
        });
    });
    const updatedTickets = await Promise.all(ticketUpdatePromises);
    console.log(`Created and updated ${updatedTickets.length} ticket records for booking ${bookingId}.`);


    // 4. Generate PDF(s)
    // Option A: Single PDF with all tickets
    // Option B: Individual PDF per ticket (might be better for emailing/download)
    // Let's go with Option B: Generate individual PDFs

    const pdfGenerationPromises = updatedTickets.map(async (ticket) => {
        try {
            // Fetch full ticket details needed for PDF
             const fullTicket = await prisma.ticket.findUnique({
                where: { id: ticket.id },
                include: {
                     booking: { include: { event: true, user: { select: { name: true } } } },
                     seat: true
                }
             });
             if (!fullTicket) throw new Error(`Ticket ${ticket.id} not found after creation.`);

            // Generate QR code image data URL
            const qrCodeDataURL = await QRCode.toDataURL(ticket.qrData, { errorCorrectionLevel: 'M', width: 150 });

            // Generate PDF using pdfkit
            const pdfBuffer = await generatePdfTicketPdfkit(fullTicket, qrCodeDataURL);
            console.log(`Generated PDF for ticket ${ticket.id}`);
            return {
                ticketId: ticket.id,
                pdfBuffer,
                filename: `Ticket_${booking.event.title.replace(/\s+/g, '_')}_${ticket.id.slice(-6)}.pdf`, // Example filename
                recipientEmail: recipientEmail!, // Safe to use ! because we checked earlier
                attendeeName: booking.deliveryName || booking.user?.name || 'Guest',
                eventTitle: booking.event.title,
            };
        } catch (pdfError) {
             console.error(`Error generating PDF for ticket ${ticket.id}:`, pdfError);
             // Decide how to handle: fail entire process, or skip this ticket?
             // For now, log and skip.
            return null;
        }
    });

    const pdfResults = (await Promise.all(pdfGenerationPromises)).filter(Boolean) as {
        ticketId: string;
        pdfBuffer: Buffer;
        filename: string;
        recipientEmail: string;
        attendeeName: string;
        eventTitle: string;
    }[];


    // 5. Send Email(s)
    if (pdfResults.length === 0) {
        console.error(`No PDFs generated for booking ${bookingId}. Cannot send email.`);
        // Maybe update booking status to indicate an issue?
        return;
    }

    // Option A: Single email with multiple attachments (if few tickets)
    // Option B: One email per ticket (could be spammy)
    // Option C: Single email summarizing, link to download page (Good approach)
    // Option D: Single email with first ticket attached, link to download others

    // Let's implement Option C/D: Single summary email with first PDF attached and info.
    const firstPdf = pdfResults[0];
    const subject = `Your E-Tickets for ${firstPdf.eventTitle}`;
    const htmlBody = `
        <h1>Your Booking Confirmation</h1>
        <p>Dear ${firstPdf.attendeeName},</p>
        <p>Thank you for booking with TicketFlow! Your payment for <strong>${firstPdf.eventTitle}</strong> has been confirmed.</p>
        <p><strong>Booking ID:</strong> ${booking.id}</p>
        ${booking.seats.length > 0 ? `<p><strong>Seats:</strong> ${booking.seats.map(s => `${s.section ? s.section + '-' : ''}${s.row}${s.number}`).join(', ')}</p>` : `<p><strong>Quantity:</strong> ${booking.quantity}</p>`}
        <p>Please find your e-ticket${pdfResults.length > 1 ? 's' : ''} attached.</p>
        ${pdfResults.length > 1 ? `<p>You booked ${pdfResults.length} tickets. The first ticket is attached. You can view and download all your tickets from your account:</p><p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/my-bookings/${booking.id}">View My Booking</a></p>` : ''}
        <p>Present the QR code on the ticket${pdfResults.length > 1 ? '(s)' : ''} at the venue for entry.</p>
        <p>We look forward to seeing you at the event!</p>
        <br/>
        <p>Thanks,<br/>The TicketFlow Team</p>
    `;

    try {
        await sendTicketEmail(firstPdf.recipientEmail, subject, htmlBody, {
            filename: firstPdf.filename,
            content: firstPdf.pdfBuffer,
        });
        console.log(`Sent ticket email to ${firstPdf.recipientEmail} for booking ${bookingId}`);

        // Update tickets to mark as emailed
         await prisma.ticket.updateMany({
            where: { id: { in: pdfResults.map(p => p.ticketId) } },
            data: { emailedAt: new Date() },
        });

    } catch (emailError) {
        console.error(`Failed to send ticket email for booking ${bookingId} to ${firstPdf.recipientEmail}:`, emailError);
        // Consider retrying or marking booking status with error
    }
};

// TODO: Implement ticket validation function (called potentially by a separate API endpoint)
/**
 * Validates a ticket based on its ID and marks it as used.
 * @param ticketId - The ID of the ticket to validate.
 * @param validationUserId - ID of the staff/admin performing validation.
 * @returns The updated ticket object if validation is successful.
 * @throws Error if ticket not found, already used, or validation fails.
 */
export const validateTicket = async (ticketId: string, validationUserId: string): Promise<Ticket> => {
     const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: { event: true } // Include event details if needed for display/confirmation
    });

    if (!ticket) {
        throw new Error(`Ticket not found: ${ticketId}`);
    }
    if (ticket.isUsed) {
        throw new Error(`Ticket already used at ${ticket.usedAt?.toLocaleString()}`);
    }
    // Optional: Add check if event date is in the past/future

    // Mark ticket as used
    const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
            isUsed: true,
            usedAt: new Date(),
            // Optionally store who validated: validatedByUserId: validationUserId
        },
    });

     // Log validation action
     await prisma.auditLog.create({
         data: {
             action: 'Ticket Validated',
             entity: 'Ticket',
             entityId: ticketId,
             userId: validationUserId,
             details: `Ticket ${ticketId} for event ${ticket.event?.title || ticket.eventId} validated by user ${validationUserId}.`,
             newValue: JSON.stringify({ isUsed: true, usedAt: updatedTicket.usedAt }),
         },
     });


    console.log(`Ticket ${ticketId} successfully validated by user ${validationUserId}.`);
    return updatedTicket;
};

// Function to be called potentially by a scheduled job or after payment confirmation
export const processConfirmedBooking = async (bookingId: string) => {
    try {
        await generateAndSendTickets(bookingId);
    } catch (error) {
        console.error(`Error processing confirmed booking ${bookingId} for ticket generation/sending:`, error);
        // Update booking status to indicate error?
        // await prisma.booking.update({ where: { id: bookingId }, data: { status: BookingStatus.ERROR } }); // Add ERROR status if needed
    }
};
