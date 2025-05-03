# Eventia Implementation Plan

This document outlines a step-by-step implementation plan for building the Eventia ticketing platform with IPL specialization. Each step includes validation tests to ensure proper implementation.

## Phase 1: Project Setup and Foundation

### Step 1: Project Initialization
1. Set up a monorepo structure with folders for backend and frontend
2. Initialize Git repository
3. Create package.json files for both backend and frontend
4. Set up TypeScript configuration
5. Configure ESLint and Prettier
6. Create .gitignore file

**Validation Test:** 
- Verify all configuration files exist and are properly configured
- Run `npm install` in both directories without errors
- Ensure Git is tracking the project correctly

### Step 2: Backend Setup
1. Install Express.js and required dependencies
2. Create basic server.ts file with Express configuration
3. Set up MongoDB connection using Mongoose
4. Create folder structure (controllers, routes, models, middleware, services)
5. Implement basic health check endpoint

**Validation Test:**
- Server starts without errors
- Health check endpoint returns 200 OK
- MongoDB connection succeeds
- Project structure matches the plan

### Step 3: User Authentication API
1. Create User model with Mongoose
2. Implement JWT authentication with refresh tokens
3. Create register, login, and refresh token endpoints
4. Implement password hashing with bcrypt
5. Add basic user roles (User, Organizer, Admin)

**Validation Test:**
- Register endpoint creates a user in the database
- Login endpoint returns JWT token
- Protected routes reject requests without valid tokens
- Refresh token endpoint issues new access tokens

### Step 4: Frontend Setup
1. Create React app with TypeScript
2. Install dependencies (React Router, Tailwind CSS, React Query, Shadcn UI)
3. Set up project structure (components, pages, services, hooks, context)
4. Configure Tailwind CSS
5. Create basic layout components

**Validation Test:**
- Application builds without errors
- Tailwind styles are applied correctly
- Basic routing works
- Layout components render correctly

### Step 5: Authentication UI
1. Create login and registration forms
2. Implement client-side validation with Zod
3. Connect forms to authentication API
4. Create context for managing auth state
5. Implement protected routes

**Validation Test:**
- Forms render correctly with validation
- Successful login stores tokens and redirects
- Auth context provides user information
- Protected routes redirect unauthenticated users

## Phase 2: Core Features

### Step 6: Event Model and API
1. Create Event model with fields for title, description, date, time, location, images
2. Create Ticket Category model related to events
3. Implement CRUD endpoints for events
4. Add authorization middleware to protect event creation
5. Implement image upload with multer

**Validation Test:**
- Events can be created, read, updated, and deleted
- Events are associated with the correct organizer
- Image uploads work correctly
- Authorization properly restricts access

### Step 7: Event Creation UI
1. Create event form components with all required fields
2. Implement image upload UI
3. Create ticket category management section
4. Implement validation and error handling
5. Connect UI to event creation API

**Validation Test:**
- Form allows complete event creation with all fields
- Images can be uploaded and previewed
- Ticket categories can be added and removed
- Validation works as expected

### Step 8: Event Listing and Discovery
1. Create API endpoints for listing events with filtering and pagination
2. Implement search functionality with text indexing
3. Create event card and list components
4. Implement filter and search UI
5. Add event detail page

**Validation Test:**
- Events list displays correctly with pagination
- Filters work as expected
- Search returns relevant results
- Event details display correctly

### Step 9: Seat Mapping System
1. Create Seat model with row, column, section, and status
2. Implement API endpoints for seat management
3. Create stadium/venue layout editor for organizers
4. Implement interactive seat selection map
5. Add seat reservation system with timeouts

**Validation Test:**
- Seats can be created and associated with events
- Seat selection UI works correctly
- Reserved seats are visually distinct
- Seat reservations expire after the timeout period

### Step 10: Booking System
1. Create Booking model with relationships to User, Event, and Seats
2. Implement booking creation and management endpoints
3. Create booking flow UI with steps
4. Add delivery details collection form
5. Implement booking expiration mechanism

**Validation Test:**
- Booking process creates records in the database
- Seats are properly locked during booking
- Booking expires if payment not completed
- Delivery details are saved correctly

## Phase 3: Payment and Ticketing

### Step 11: UPI Payment Integration
1. Create Payment model with UTR tracking
2. Implement UPI settings for admins
3. Create QR code generation for UPI payments
4. Implement UTR input and submission
5. Add payment status tracking

**Validation Test:**
- Admin can set UPI VPA
- QR codes are generated correctly
- UTR can be submitted and tracked
- Payment status changes are reflected

### Step 12: Admin Payment Verification
1. Create admin dashboard layout
2. Implement payment listing with filters
3. Create verification UI with approve/reject actions
4. Add audit trail for payment verifications
5. Implement payment status webhooks

**Validation Test:**
- Admin can view pending payments
- Approve/reject actions change payment status
- Audit trail records all changes
- Status changes trigger appropriate actions

### Step 13: E-Ticket Generation
1. Create ticket template design
2. Implement PDF generation with unique QR codes
3. Add email delivery integration
4. Create ticket download page
5. Implement ticket validation mechanisms

**Validation Test:**
- Tickets generate with correct information
- QR codes contain valid and unique identifiers
- Emails are sent successfully
- Tickets can be downloaded from the account

## Phase 4: IPL Specific Features

### Step 14: IPL Team Integration
1. Create team data model with colors, logos, info
2. Implement team selection in event creation
3. Add team-based styling to event pages
4. Create team filtering on event listings
5. Implement team-specific promotional areas

**Validation Test:**
- Teams are properly represented in the database
- Event creation allows team selection
- Team styles apply correctly to event pages
- Team filtering works as expected

### Step 15: Stadium Layouts
1. Create predefined layouts for IPL stadiums
2. Implement stadium selection in event creation
3. Add stadium-specific seating categories
4. Create stadium info pages with details and amenities
5. Implement AR preview for stadium views

**Validation Test:**
- Stadium layouts load correctly
- Stadium selection changes available seating
- Stadium information displays correctly
- AR preview works on compatible devices

### Step 16: Mobile Optimization
1. Implement responsive designs for all pages
2. Add PWA support with service worker
3. Create mobile-specific UI components
4. Implement UPI deep linking
5. Add offline support for ticket access

**Validation Test:**
- All pages are fully responsive
- PWA can be installed on mobile devices
- UPI deep linking works on Android
- Tickets are accessible offline

## Phase 5: Performance and Deployment

### Step 17: Performance Optimization
1. Implement API response caching
2. Add image optimization and CDN integration
3. Optimize React components with memoization
4. Implement code splitting and lazy loading
5. Add performance monitoring

**Validation Test:**
- API responses are properly cached
- Images load quickly and efficiently
- Core Web Vitals meet performance targets
- Application load time is acceptable

### Step 18: Deployment Setup
1. Create Docker configurations
2. Set up CI/CD pipeline with GitHub Actions
3. Configure MongoDB Atlas connection
4. Set up production environments
5. Implement automated testing in the pipeline

**Validation Test:**
- Docker containers build successfully
- CI/CD pipeline deploys without errors
- Database connections work in production
- Tests run automatically on commits

### Step 19: Final Testing and Launch
1. Conduct comprehensive system testing
2. Perform security audit
3. Test payment flow end-to-end
4. Verify mobile experience across devices
5. Create documentation for users and admins

**Validation Test:**
- All core functions work correctly
- No security vulnerabilities are detected
- Payment flow completes successfully
- Application works on all target devices 




Here are the key features and functionalities described for the Admin Setting:

*   **Dashboard and Analytics:**
    *   Provides a **comprehensive dashboard** (AdminAnalytics component exists).
    *   Includes **basic analytics** with **interactive dashboard** visualizations (charts) for **revenue, user growth, and event statistics**.
    *   Allows viewing **sales data and analytics**.
    *   Features **event performance metrics**.
    *   Includes a **visual health status display** of system components.
    *   Supports **mobile-specific analytics**.
*   **Event Management:**
    *   Enables **creating, editing, and managing events**. This includes:
        *   Setting **rich event details** (title, description, location, dates, time).
        *   Handling **image upload for event promotion**.
        *   Configuring **ticket categories and pricing**.
        *   Setting up **dynamic pricing rules**.
        *   Controlling **event status** (draft, published, cancelled).
        *   Managing **categorization and tagging**.
        *   Implementation includes a dedicated AdminEventForm component.
    *   There is functionality (primarily for development/testing) allowing admins to **create, edit, and remove events through the admin panel and see them immediately on the public page**.
*   **Payment Verification:**
    *   Offers a **payment verification interface** (AdminPaymentVerification component exists).
    *   Specifically for **UPI payments**, it allows admins to **verify and approve payments**.
    *   The interface displays **pending payments** and allows **filtering by payment status** (pending, verified, rejected).
    *   Includes **search functionality** for finding payments by booking ID or UTR.
    *   Supports **payment verification and rejection workflows** with notifications.
    *   Only admins can verify/reject payments, and actions are logged for security.
*   **UPI Settings Management:**
    *   Allows **configuring UPI payment settings**.
    *   Admins can **change the UPI payment receiving ID**.
    *   Implementation includes the AdminUpiManagement component and protected API endpoints.
*   **User Management:**
    *   Provides a **user management interface** (UserManagement component exists).
    *   Enables **user listing and editing**. (Based on the user profile implementation, this likely includes viewing and potentially editing user profile details like name and address).
*   **Monitoring and Tracking:**
    *   The Product Requirements Document (PRD) lists the requirement to **monitor bookings and deliveries** and specifically **delivery tracking and management**.
    *   While the sources confirm that **delivery details (user contact and delivery information) are captured and saved** as a required step in the booking flow, the provided sources **do not explicitly detail a specific interface component or section within the Admin Portal designed for admins to view the saved delivery details associated with individual user bookings**. The User Management feature *does* include managing user profile address information, which might be related, but a dedicated view for booking-specific delivery addresses is not explicitly described as implemented in the Admin Portal documentation provided.
    *   Other tracking includes payment status tracking, transaction histories, price logging and tracking (visible in admin UI), and system health monitoring.
*   **Discount Management:**
    *   A `DiscountList.tsx` component for managing discount codes exists within the admin components.
*   **Security and Access Control:**
    *   The Admin Portal is accessed via **protected routes** requiring authentication.
    *   **Role-based access control** ensures only admins can access these features.
    *   Admin API endpoints are secured.
    *   Activity logging is implemented for audit purposes, particularly for settings updates.






Here's how the process appears to function for an unauthenticated user:

1.  **Event Discovery and Selection:** A user can browse available events and view event details. They can then select tickets or seats.
2.  **Delivery Details Collection:** Before proceeding to payment, the user encounters a dedicated "Delivery Details" step. This is a required intermediary step where the platform collects the user's contact and delivery information. This information is saved as part of the booking data model. This capture happens *during* the booking flow itself, not necessarily tied to a pre-existing user profile.
3.  **Payment Process (specifically UPI):** The user proceeds to the payment step. For UPI payments, the flow involves several steps that do not necessitate a logged-in state:
    *   **QR Code Generation:** The system generates a custom QR code using an admin-configured UPI VPA. Technical documentation explicitly states that the endpoints for retrieving active UPI settings and generating QR codes **bypass authentication and are public**. This means the QR code can be generated for any user reaching this step, logged in or not.
    *   **User Scans & Pays:** The user scans the QR code with their external UPI app and completes the transaction. This happens entirely outside the Eventia platform's authentication system.
    *   **UTR Submission:** The user finds the Unique Transaction Reference (UTR) from their UPI app and enters it into an input box on the Eventia payment screen. This UTR is then recorded by the backend.
4.  **Admin Verification and Ticket Delivery:** After the UTR is submitted, the process moves to the admin verification step. Once the admin approves the payment, the booking status is updated, and the PDF ticket is generated. The user is then provided a download or email link for the ticket. The simplified summary of the UPI flow explicitly omits any mention of logging in: "Scan custom QR → UPI se pay karo → slip ka UTR daalo → admin stamp approve karega → ticket PDF download karo".

While the platform has a complete authentication system for features like user management, protected admin routes, and persistent profile information, the core booking flow, particularly the UPI payment method, is designed to be accessible to users without requiring a login. The required "Delivery Details" step ensures that the necessary contact and delivery information for the booking is captured and saved, even if the user does not have a persistent account. The use of public API endpoints for critical parts of the payment flow directly supports this capability.




Here's how the custom payment VPA (Virtual Payment Address) works within this flow:

1.  **Admin Configuration of the VPA:** The process begins with an **admin setting up a custom UPI VPA** in their dashboard settings. This is the bank account address where payments for Eventia tickets will be received, for example, `eventia@bank`. This setting is stored in the `upi_settings` table in the database.
2.  **QR Code Generation using the Custom VPA:** When a user reaches the checkout page and selects "Pay via UPI", the frontend requests the backend to generate a QR code. The backend uses the **admin-defined UPI VPA** (retrieved from the active UPI setting in the database, with a fallback to a default ID like `9122036484@hdfc` if necessary) along with a library like PDFKit to **generate a custom QR code**. This QR code contains the payment details, including the admin's VPA and the transaction amount, allowing the user's UPI app to auto-fill the payment information. Importantly, the API endpoints for retrieving the active UPI settings and generating the QR code are specifically configured to **bypass authentication**, allowing this step to work even if the user is not logged in. The QR code is then sent to the frontend to be displayed to the user.
3.  **User Scans and Pays Externally:** The user uses their preferred UPI application (like PhonePe, GPay, etc.) on their mobile device to **scan the displayed QR code**. The amount is auto-filled, and the user completes the transaction directly through their banking app. This payment settles instantly between the banks, outside of the Eventia platform's direct control.
4.  **UTR Submission:** After completing the payment in their UPI app, the user must find the **Unique Transaction Reference (UTR)** number associated with that transaction. This UTR is typically a 12-16 digit number. The user then **enters this UTR into an input box** provided on the Eventia payment screen.
5.  **Admin Verification:** Upon the user submitting the UTR, the backend creates a record storing the `bookingId`, `utr`, and sets the `status` to 'pending'. This record is then visible in the **"Pending Payments" list within the Admin dashboard**. An administrator must then **manually verify the payment** by logging into their bank account statement or portal and matching the submitted UTR against the transactions received in the account associated with the custom VPA. Once they confirm the payment was received for the correct amount, the admin can **"Approve" or "Reject"** the payment through the admin interface. This is described as a two-step verification process. All verification actions are logged for security.
6.  **Ticket Generation and Delivery:** If the admin **approves** the payment, the backend updates the `Booking.status` to 'confirmed'. A PDF ticket with a unique entry QR code is generated, and a download or email link for the ticket is provided to the user.

This entire flow, particularly the steps involving QR code generation and UTR submission, is designed to **work without requiring a user to be logged in**. The necessary contact and delivery information for the booking is collected in a dedicated step before payment, ensuring the ticket can be delivered even to an unauthenticated user. The custom VPA is central to facilitating the manual verification process, linking the user's external payment to the specific booking record awaiting admin approval.




1.  **Admin Management of Codes:** Administrators can **manage discount codes** via the Admin Portal. The frontend has a component called `DiscountList.tsx` likely used for this purpose.
2.  **User Application during Checkout:** During the **multi-step checkout flow**, there is a specific point where a user can **apply a discount code**.
3.  **Discount Form:** The user interaction happens through a component named `DiscountForm.tsx`, where they enter the code into an input field.
4.  **Real-time Validation:** When the user submits the code via the `DiscountForm.tsx`, the frontend sends it to the backend using the `POST /api/v1/discounts/validate` API endpoint. The backend then performs **real-time validation** by evaluating predefined **discount rules**. This validation mechanism ensures proper rule evaluation.
5.  **Calculation and Application:** If the entered code is valid according to the rules, the system **calculates and applies the discount** to the booking total. The user interface provides **visual feedback**, such as updating the price, to show the discount has been applied. The UI also handles **error handling** for invalid codes.
6.  **Usage Tracking:** The platform **tracks the usage of discounts** in the database. This tracking is used to prevent codes from being reused beyond any specified limits.
7.  **Functionality and Development:** The core **discount functionality** was completed early in Phase 1 (Week 3). The **discount code application UI** was implemented in Phase 2 (Week 6). The **Discounts API module** has been fully implemented and documented as part of the API documentation cycle, including validating the end-to-end flow for applying a discount code.

The sources consistently describe this process as **"Discount code application"** and refer to managing **"Discount codes"**. The system uses **"Code-based discounts with validation"**.

Regarding your request for "auto Added Discount" (or auto-applied discount), the described discount system **does not automatically apply discounts without the user entering a code**. It requires the user to actively submit a code through the `DiscountForm.tsx` component.

However, the platform also has a separate system called the **Dynamic Pricing Engine**. This engine automatically adjusts ticket prices based on various factors defined by administrators, such as time until the event, current inventory levels, demand patterns, and specifically includes **"Bulk purchase discounts"** as a potential rule. Price adjustments from the Dynamic Pricing Engine are applied automatically based on these rules and **do not require a user to enter a discount code**. This is distinct from the code-based discount system.

So, while the documented "discount" feature requires user input of a code, automatic price adjustments (like those for bulk purchases) are handled by the **Dynamic Pricing Engine**, which might give the effect of an "auto-added discount" in certain scenarios, but it's part of the pricing system, not the code-based discount feature.