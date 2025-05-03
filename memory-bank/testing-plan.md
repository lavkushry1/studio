# Eventia - System Testing Plan

This document outlines the strategy and plan for testing the Eventia ticketing platform before final launch.

## 1. Objectives

- Ensure all functional requirements outlined in the PRD are met.
- Verify non-functional requirements (performance, security, usability, responsiveness).
- Identify and resolve critical bugs before launch.
- Validate the end-to-end user experience for key flows.
- Confirm the stability and reliability of the platform under expected load.

## 2. Scope

### In Scope:
- All core features (Event Discovery, Ticket Selection, Booking, Payment, User Authentication, Admin Management).
- IPL-specific features (Team Integration, Stadium Layouts).
- User roles and permissions (User, Organizer, Admin).
- API functionality and integration between frontend and backend.
- Database interactions and data integrity.
- Responsive design across target devices.
- PWA functionality.
- Security vulnerabilities (based on checklist).
- Basic performance testing (load times, responsiveness).
- End-to-end payment flow (UPI).

### Out of Scope:
- Exhaustive performance/load testing simulating extreme scenarios (beyond expected launch traffic).
- Formal usability studies with large user groups (will rely on internal testing and feedback).
- Testing third-party integrations beyond basic success/failure (e.g., detailed bank-side UPI processing).
- Testing on obscure or very old browser/device versions.

## 3. Testing Types

- **Unit Testing:** Already implemented during development for individual functions/components (primarily backend services, frontend utils).
- **Integration Testing:** Verify interactions between components (e.g., frontend form submission calling backend API, API interacting with database). Focus on API routes and service layers.
- **End-to-End (E2E) Testing:** Simulate complete user journeys.
    - User Registration & Login
    - Event Browsing & Filtering/Search
    - Seat Selection (Seat Map Events)
    - Quantity Selection (General Admission Events)
    - Booking Flow (Details -> Payment -> Verification -> Confirmation/Ticket Access)
    - UPI Payment Flow (QR Scan -> UTR Submit -> Admin Verify -> Ticket Delivery)
    - Admin Event Creation & Management
    - Admin Payment Verification (Approve/Reject)
    - Admin UPI Settings Update
- **Security Testing:** Penetration testing basics, vulnerability scanning, review against security checklist (`security-checklist.md`).
- **Performance Testing:** Manual assessment of page load times (Core Web Vitals), API response times under moderate load, database query performance.
- **Responsive Testing:** Manual testing across different screen sizes (Mobile, Tablet, Desktop) and major browsers (Chrome, Firefox, Safari, Edge).
- **PWA Testing:** Installation, offline access (ticket viewing), basic functionality while offline.
- **Regression Testing:** Re-testing previously fixed bugs and core functionalities after major changes or bug fixes.

## 4. Testing Environments

- **Development:** Local developer machines (ongoing during development).
- **Staging:** A dedicated environment mirroring production as closely as possible. Used for integration, E2E, security, and performance testing before final deployment. `staging.eventia.com` (example URL). Connected to a staging database (e.g., separate MongoDB Atlas cluster or database).
- **Production:** Limited smoke testing immediately post-deployment to verify critical paths. `eventia.com` (example URL).

## 5. Test Cases (High-Level Examples)

*(Detailed test cases should be documented in a separate spreadsheet or test management tool)*

- **Authentication:**
    - Successful registration (User, Organizer roles).
    - Prevent duplicate email registration.
    - Successful login with valid credentials.
    - Failed login with invalid credentials.
    - JWT expiration and refresh token flow.
    - Role-based access control (e.g., User cannot access /admin).
    - Password hashing verification.
- **Event Management (Admin/Organizer):**
    - Create event with all required fields (including team/venue).
    - Create event with seat map enabled.
    - Edit event details.
    - Publish/Unpublish/Cancel event.
    - Add/Remove ticket categories.
    - (Seat Editor) Add/Remove/Modify seats.
    - Prevent event deletion if bookings exist (or handle appropriately).
- **Event Discovery (User):**
    - View list of published events.
    - Filter events by date, category, location, team.
    - Search events by keyword.
    - View event details page.
    - Verify unpublished/cancelled events are hidden from regular users.
- **Booking Flow (User):**
    - Select seats successfully (seat map).
    - Select quantity successfully (general admission).
    - Receive error if selecting unavailable/reserved seats.
    - Proceed through delivery details form (validation).
    - Apply valid/invalid discount codes.
    - Reach payment step.
- **UPI Payment Flow (User & Admin):**
    - QR code generates correctly with admin-set VPA.
    - Submit valid UTR.
    - Submit invalid/duplicate UTR (expect error).
    - (Admin) View pending payment in verification list.
    - (Admin) Approve payment -> Booking status becomes CONFIRMED.
    - (Admin) Reject payment -> Booking status becomes FAILED.
    - (User) Receive ticket (email/download) after admin approval.
    - Booking expiration (PENDING booking cancelled after timeout).
    - Seat reservation expiration (RESERVED seats become AVAILABLE after timeout).
- **Mobile/PWA:**
    - Install PWA on supported devices.
    - Access downloaded tickets offline.
    - Test layout and usability on various screen sizes.
    - Test UPI deep linking.

## 6. Responsibilities

- **Development Team:** Unit testing, integration testing support, fixing bugs identified during testing.
- **QA/Testing Team (or designated testers):** E2E testing, security testing (initial scan/audit), performance testing (manual), responsive testing, PWA testing, regression testing, test case creation and execution, bug reporting.
- **Admin/Product Owner:** User Acceptance Testing (UAT), verifying business logic and requirements.

## 7. Tools

- **Bug Tracking:** GitHub Issues / Jira / Trello (or similar).
- **Test Case Management:** TestRail / Zephyr / Google Sheets (or similar).
- **API Testing:** Postman / Insomnia.
- **Browser DevTools:** Performance profiling, network analysis, responsiveness testing.
- **Security Scanning:** OWASP ZAP, Snyk/Dependabot (dependency scanning), manual review against checklist.
- **Mobile Emulators/Simulators & Real Devices:** For responsive and PWA testing.

## 8. Schedule (Example)

- **Week X:** Finalize Test Plan, Create Detailed Test Cases.
- **Week X+1:** Integration Testing, Security Audit Setup.
- **Week X+2:** E2E Testing Cycle 1, Responsive Testing, PWA Testing.
- **Week X+3:** Bug Fixing, Regression Testing, Performance Testing.
- **Week X+4:** E2E Testing Cycle 2 (focus on fixes), Final Security Review, UAT.
- **Week X+5:** Final Bug Fixing, Deployment Preparation.