# Eventia - Security Audit Checklist

This checklist provides a starting point for auditing the security of the Eventia application. It should be reviewed and executed before final launch.

## 1. Authentication & Session Management

-   [ ] **Password Security:**
    -   [ ] Passwords hashed securely using bcrypt with appropriate salt rounds? (Backend)
    -   [ ] Minimum password length enforced? (Backend & Frontend Validation)
    -   [ ] Password reset mechanism is secure (e.g., secure token generation, expiration)?
-   [ ] **JWT Security:**
    -   [ ] Access tokens have short expiry times (e.g., 15 minutes)?
    -   [ ] Refresh tokens are used for persistent sessions and stored securely (e.g., HTTPOnly cookie preferable, or secure localStorage)?
    -   [ ] Refresh tokens are invalidated on logout and potentially on password change?
    -   [ ] JWT secrets (`ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`) are strong and stored securely as environment variables?
    -   [ ] `alg` (algorithm) is fixed (e.g., HS256) and not taken from token header ('alg': 'none' vulnerability)?
-   [ ] **Brute Force Protection:**
    -   [ ] Rate limiting implemented on login and registration endpoints?
    -   [ ] Account lockout mechanism considered after multiple failed login attempts?
-   [ ] **Session Fixation:** Ensure new session identifiers (tokens) are generated upon login.

## 2. Authorization & Access Control

-   [ ] **Role-Based Access Control (RBAC):**
    -   [ ] Middleware correctly enforces role requirements (User, Organizer, Admin) for relevant API endpoints?
    -   [ ] Users cannot access resources they don't own (e.g., view/cancel other users' bookings)?
    -   [ ] Organizers can only manage their own events (unless Admin)?
    -   [ ] Admin functions (payment verification, settings) are strictly limited to ADMIN role?
-   [ ] **IDOR (Insecure Direct Object References):**
    -   [ ] Are object IDs (e.g., `bookingId`, `eventId`) validated against the authenticated user's permissions before performing actions?

## 3. Input Validation

-   [ ] **Server-Side Validation:**
    -   [ ] All API inputs (body, params, query) are validated using Zod schemas (or similar)?
    -   [ ] Validation handles edge cases, unexpected types, and overly large inputs?
    -   [ ] Validation protects against NoSQL injection vectors in database queries? (Prisma generally helps, but review custom queries).
-   [ ] **Cross-Site Scripting (XSS):**
    -   [ ] User-generated content (event descriptions, user names, etc.) is properly sanitized/escaped before being rendered in the frontend? (React generally escapes, but review `dangerouslySetInnerHTML` usage).
    -   [ ] Content Security Policy (CSP) header implemented or considered?
-   [ ] **File Uploads (Event Images):**
    -   [ ] File type and size limits strictly enforced on the backend (multer)?
    -   [ ] Uploaded files stored securely (e.g., outside web root, using CDN/storage bucket)?
    -   [ ] Filenames sanitized to prevent path traversal?
    -   [ ] Content-Type validation performed?

## 4. Data Protection

-   [ ] **Sensitive Data Exposure:**
    -   [ ] Passwords are never logged or returned in API responses?
    -   [ ] Sensitive user information (e.g., full payment details - beyond UTR) is not stored unless necessary and is protected?
    -   [ ] API responses do not leak excessive information (e.g., internal IDs, stack traces in production)?
-   [ ] **Database Security:**
    -   [ ] MongoDB connection uses authentication?
    -   [ ] Database credentials stored securely as environment variables?
    -   [ ] Network access to MongoDB Atlas restricted to specific IP addresses?
-   [ ] **Transport Layer Security (TLS):**
    -   [ ] HTTPS enforced for all communication between client, frontend, and backend?
    -   [ ] SSL/TLS certificates are valid and properly configured?

## 5. API Security

-   [ ] **Rate Limiting:** Applied to sensitive or computationally expensive endpoints beyond just auth?
-   [ ] **CORS Configuration:** Properly configured to allow only expected origins (especially in production)?
-   [ ] **Security Headers:**
    -   [ ] `Strict-Transport-Security` (HSTS) implemented?
    -   [ ] `X-Content-Type-Options: nosniff` set?
    -   [ ] `X-Frame-Options: DENY` or `SAMEORIGIN` set?
    -   [ ] `Referrer-Policy` set appropriately?
    -   [ ] `Permissions-Policy` considered?
-   [ ] **Error Handling:** Generic error messages returned in production, detailed errors logged server-side?

## 6. Payment Specific (UPI + UTR)

-   [ ] **UTR Validation:** Backend validation checks UTR format and uniqueness?
-   [ ] **QR Code Generation:** Ensure QR code data doesn't contain overly sensitive info and uses the correct admin-set VPA?
-   [ ] **Payment Verification Logic:** Admin verification process is robust and prevents accidental approval? Audit logs capture verification actions?
-   [ ] **Admin Settings:** UPI settings endpoint protected by Admin role? Input validation prevents invalid VPA formats?

## 7. Dependency Management

-   [ ] **Vulnerability Scanning:** Regularly scan dependencies (npm/pnpm audit, Snyk, Dependabot) for known vulnerabilities?
-   [ ] **Update Strategy:** Keep dependencies reasonably up-to-date?

## 8. Deployment & Infrastructure

-   [ ] **Environment Variables:** Sensitive configuration (secrets, API keys, DB URLs) managed securely via environment variables, not hardcoded?
-   [ ] **CI/CD Security:** Secrets (e.g., `DOCKERHUB_TOKEN`, `PROD_SERVER_SSH_KEY`) managed securely in GitHub Actions secrets?
-   [ ] **Docker Security:** Base images kept updated? Minimize privileges within containers?
-   [ ] **Server Security:** If using VMs/servers, ensure OS is patched, firewall configured, SSH access secured?

## 9. Logging & Monitoring

-   [ ] **Sufficient Logging:** Key security events (logins, failed logins, admin actions, payment verifications) logged?
-   [ ] **Error Monitoring:** Tools like Sentry configured to capture and alert on production errors?
-   [ ] **Log Security:** Prevent logging of sensitive data (passwords, full tokens)? Access to logs restricted?