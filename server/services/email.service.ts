import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';

// Configure the email transporter using environment variables
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.example.com', // e.g., smtp.gmail.com, smtp.sendgrid.net
    port: parseInt(process.env.EMAIL_PORT || '587', 10), // 587 for TLS, 465 for SSL
    secure: (process.env.EMAIL_PORT || '587') === '465', // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER || 'your-email@example.com', // Your email address
        pass: process.env.EMAIL_PASS || 'your-email-password', // Your email password or app-specific password
    },
    // Optional: Add TLS configuration if needed
    // tls: {
    //     rejectUnauthorized: false // Use only for development/testing if using self-signed certs
    // }
});

/**
 * Sends an email.
 * @param mailOptions - Options for the email (to, subject, text, html, attachments).
 * @returns Promise resolving when the email is sent or rejecting on error.
 */
export const sendEmail = async (mailOptions: Mail.Options): Promise<void> => {
    // Add a default sender if not specified in mailOptions
    const optionsWithDefaults: Mail.Options = {
        from: process.env.EMAIL_FROM || `"TicketFlow" <${process.env.EMAIL_USER || 'noreply@example.com'}>`,
        ...mailOptions,
    };

    try {
        console.log(`Attempting to send email to ${optionsWithDefaults.to}...`);
        const info = await transporter.sendMail(optionsWithDefaults);
        console.log('Email sent successfully: %s', info.messageId);
        // Optional: Log info.response for detailed SMTP response
    } catch (error) {
        console.error('Error sending email:', error);
        // Rethrow the error so the calling function knows it failed
        throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

/**
 * Sends an e-ticket email with PDF attachment.
 * @param to - Recipient email address.
 * @param subject - Email subject.
 * @param htmlBody - HTML content for the email body.
 * @param pdfAttachment - Object containing filename and content (Buffer or stream) for the PDF.
 */
export const sendTicketEmail = async (
    to: string,
    subject: string,
    htmlBody: string,
    pdfAttachment: { filename: string; content: Buffer | NodeJS.ReadableStream }
): Promise<void> => {
    const mailOptions: Mail.Options = {
        to,
        subject,
        html: htmlBody,
        attachments: [
            {
                filename: pdfAttachment.filename,
                content: pdfAttachment.content,
                contentType: 'application/pdf',
            },
        ],
    };

    await sendEmail(mailOptions);
};

// Example usage (will be called from ticketService)
/*
const exampleSend = async () => {
    try {
        await sendEmail({
            to: 'recipient@example.com',
            subject: 'Test Email from TicketFlow',
            text: 'This is a plain text test email.',
            html: '<p>This is an <b>HTML</b> test email.</p>'
        });
    } catch (error) {
        console.error("Failed to send example email.");
    }
};
*/
