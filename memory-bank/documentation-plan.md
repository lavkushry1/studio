# Eventia - Documentation Plan

This document outlines the types of documentation to be created for the Eventia platform.

## 1. Target Audiences

-   **End Users:** People browsing events, booking tickets, and managing their accounts.
-   **Event Organizers:** Users creating and managing events (potentially overlapping with Admins).
-   **Administrators:** Users responsible for platform management, payment verification, and settings.
-   **Developers:** Current and future developers working on the platform.

## 2. Documentation Types

### 2.1. User Documentation

-   **Goal:** Help users understand how to use the platform effectively and troubleshoot common issues.
-   **Format:** Online Help Center / FAQ section integrated into the frontend application. Possibly short video tutorials for key flows.
-   **Content Outline:**
    -   **Getting Started:**
        -   Browsing and Searching for Events
        -   Understanding Event Details (Dates, Location, Categories, Seat Maps)
    -   **Booking Tickets:**
        -   Selecting Seats vs. Quantity
        -   Checkout Process Steps (Details, Payment, Verification)
        -   Understanding UPI Payment Flow (Scanning QR, Finding & Entering UTR)
        -   Applying Discount Codes
    -   **Managing Your Account:**
        -   Creating an Account / Logging In
        -   Viewing "My Bookings"
        -   Downloading/Accessing E-Tickets (including offline access)
        -   Updating Profile Information (if applicable)
    -   **Troubleshooting & FAQ:**
        -   What if my payment is pending verification?
        -   How long does verification take?
        -   I haven't received my tickets, what do I do?
        -   How do I find my UTR number?
        -   Is my booking confirmed?
        -   Contacting Support

### 2.2. Organizer Documentation

-   **Goal:** Guide organizers on how to create, manage, and monitor their events.
-   **Format:** Dedicated section within the Admin/Organizer panel or a separate knowledge base.
-   **Content Outline:**
    -   **Getting Started:**
        -   Accessing the Organizer Panel
        -   Dashboard Overview
    -   **Creating & Managing Events:**
        -   Filling out Event Details (Title, Description, Date, Location, Category)
        -   Uploading Event Images
        -   Setting up Ticket Categories (Pricing, Quantity)
        -   Enabling and Using the Seat Map Editor
        -   Associating Events with Teams and Venues (IPL focus)
        -   Publishing, Unpublishing, and Cancelling Events
    -   **Monitoring Events:**
        -   Viewing Booking Reports (linked from Admin dashboard)
        -   Understanding Sales Analytics (linked from Admin dashboard)
        -   (If applicable) Viewing Attendee Lists

### 2.3. Administrator Documentation

-   **Goal:** Provide detailed instructions for platform administrators on management and maintenance tasks.
-   **Format:** Secure internal knowledge base or documentation site.
-   **Content Outline:**
    -   **Platform Overview:**
        -   System Architecture Basics (brief)
        -   User Roles and Permissions
    -   **Core Management Tasks:**
        -   Admin Dashboard Navigation and Analytics Interpretation
        -   **Payment Verification Workflow (Detailed):**
            -   Accessing the Verification Panel
            -   Identifying Pending Payments
            -   How to Verify UTRs against Bank Statements (process guide)
            -   Approving and Rejecting Payments
            -   Understanding Status Changes and Effects
        -   **UPI Settings Management:**
            -   Updating the Active UPI VPA
            -   Consequences of Changing the VPA
        -   **User Management:**
            -   Viewing User List
            -   Editing User Roles (if applicable)
            -   Disabling/Deleting Users (process and implications)
        -   **Event Oversight:**
            -   Viewing All Events (including drafts)
            -   (If needed) Overriding Event Status or Details
        -   Managing Discount Codes (if applicable)
        -   Managing Teams and Venues (CRUD operations)
    -   **System Maintenance (If applicable):**
        -   Monitoring System Status
        -   Troubleshooting Common Issues
        -   Backup Procedures (if managed internally)

### 2.4. Developer Documentation

-   **Goal:** Enable efficient onboarding for new developers and serve as a reference for the existing team.
-   **Format:** Resides within the codebase (`README.md`, `memory-bank/` files, code comments) and potentially a dedicated internal wiki/documentation site.
-   **Content Outline:**
    -   **Project Setup:** (Covered in `README.md`)
        -   Prerequisites
        -   Installation Steps
        -   Environment Variable Setup (`.env.development.example`)
        -   Running Development Servers (Frontend & Backend)
        -   Database Setup & Migrations
    -   **Architecture:** (`memory-bank/architecture.md`)
        -   Monorepo Structure Overview
        -   Frontend Architecture (Next.js App Router, Components, State Management)
        -   Backend Architecture (Express, Services, Controllers, Middleware, Mongoose)
        -   Authentication Flow (JWT, Refresh Tokens)
        -   Booking & Payment Flow Diagram
        -   Data Models (Prisma Schema is primary source, add explanations if needed)
    -   **Tech Stack & Best Practices:** (`memory-bank/tech-stack.md`, `memory-bank/project-best-practices.md`)
    -   **API Documentation:** (`swagger.yaml`) - Auto-generated and manually annotated OpenAPI spec.
    -   **Code Conventions:** ESLint/Prettier configs, naming conventions.
    -   **Key Libraries & Services:** Explanations for choices (React Query, Zod, Prisma, Mongoose, etc.).
    -   **Deployment Process:** (`README.md`, `docker-compose.yml`, `Dockerfile.*`, `.github/workflows/deploy.yml`)
    -   **Testing Strategy:** (`memory-bank/testing-plan.md`)
    -   **Code Comments:** Clear explanations for complex logic, algorithms, or non-obvious code sections.

## 3. Tools & Platform

-   **User/Organizer/Admin Docs:** Integrated Help Section (using a simple component rendering Markdown or a dedicated tool like Intercom/Zendesk Guide).
-   **Developer Docs:** GitHub Repository (`README.md`, `/memory-bank`), Swagger UI (via backend), Internal Wiki (Confluence, Notion, etc. - optional).
-   **Diagrams:** Tools like Mermaid (for Markdown), Draw.io, Lucidchart for flowcharts and architecture diagrams.

## 4. Maintenance

-   Documentation should be updated alongside code changes, especially for API changes, new features, or significant architectural shifts.
-   Regular reviews (e.g., quarterly) to ensure accuracy and completeness.
-   Assign ownership for different documentation sections if possible.