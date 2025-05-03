# Eventia - Product Requirements Document (PRD)

## Project Overview

Eventia is a comprehensive event ticketing platform with a special focus on IPL matches. The platform allows Organizers to create and manage events, while Users can discover, book, and pay for tickets.

## User Roles

- **Organizers:** Users who create, manage, and configure events (including IPL matches)
- **Users:** Individuals who browse, discover, book, and pay for tickets
- **Admins:** Users responsible for platform management, including payment verification and UPI settings

## Key Features

### Event Management
- Event creation with rich details (title, description, location, date, time)
- Image upload for event promotion
- Ticket category configuration with different pricing tiers
- Seat mapping functionality for stadiums and venues
- Event status control (draft, published, cancelled)
- Event categorization and tagging
- **IPL special ticketing interface** with team-specific branding and layouts

### User Experience
- **Responsive design** for mobile and desktop
- Interactive seat selection map for stadiums
- **Seat reservation** with a time limit
- **AR (Augmented Reality) venue preview** capability
- Multilingual support (Internationalization/i18n)
- Real-time updates for seat availability using WebSockets
- Mobile-specific UI components
- Haptic feedback for key user actions
- Mobile touch gesture support

### Booking & Payment
- Shopping cart functionality
- Discount code application
- **Dynamic pricing** based on match popularity, time, inventory
- Secure **UPI payment processing**
- **Custom UPI + UTR workflow:**
  - Admin sets up a custom UPI VPA
  - Backend generates QR code using the VPA
  - User scans QR code and pays
  - User enters UTR number from their UPI app
  - System creates pending payment record
- **Payment verification workflow** by admins
- E-ticket generation with unique entry QR code
- Collection of delivery details during booking
- Mobile-optimized payment experience

### Admin Tools
- Comprehensive dashboard with sales analytics
- Payment verification interface
- UPI management settings
- User management functions
- Event management capabilities

## Technical Requirements

- MongoDB database for data storage
- Express.js backend with TypeScript
- React frontend with TypeScript
- JWT authentication
- Responsive design for all screen sizes
- WebSockets for real-time updates
- PWA capabilities for mobile users
- Performance optimization for high traffic during IPL season

## IPL-Specific Requirements

- Support for all IPL teams with team colors and branding
- Special pricing tiers for different match categories (group stage, playoffs, finals)
- Stadium-specific seat maps for all IPL venues
- Team-based filtering and search
- Match schedule integration
- Special ticket packages (season passes, multi-match bundles)
- VIP experience options 