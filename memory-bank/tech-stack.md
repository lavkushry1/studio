# Eventia Tech Stack

## Core Technologies

### Backend
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js with TypeScript
- **Database**: MongoDB (as specified by the client)
- **ODM**: Mongoose for MongoDB interaction
- **API**: RESTful API with OpenAPI/Swagger documentation

### Frontend
- **Framework**: React with TypeScript
- **UI Library**: Shadcn UI components
- **Styling**: Tailwind CSS
- **State Management**: React Query for server state, Context API for application state
- **Routing**: React Router v6
- **Form Handling**: React Hook Form with Zod validation

## Authentication & Security
- **Authentication**: JWT with refresh tokens
- **Password Hashing**: bcrypt
- **API Security**: Input validation, rate limiting, CORS
- **Frontend Security**: XSS protection, CSRF tokens

## Real-time Components
- **WebSockets**: Socket.io for real-time seat updates
- **Reservation System**: Redis for temporary seat locks

## Payment Processing
- **UPI Integration**: Custom UPI payment flow with QR code generation
- **UTR Verification**: Admin verification workflow

## Performance & Optimization
- **Caching**: Redis for API response caching
- **Image Optimization**: Sharp for image processing
- **CDN**: Cloudinary or AWS CloudFront for asset delivery
- **Compression**: gzip/brotli for API responses

## Mobile Optimization
- **PWA**: Service workers, web manifest
- **Offline Support**: IndexedDB for offline data
- **Touch Optimization**: Mobile-first design with proper touch targets
- **Deep Linking**: UPI deep linking

## Deployment & DevOps
- **Containerization**: Docker
- **CI/CD**: GitHub Actions
- **Hosting**: 
  - Backend: AWS Elastic Beanstalk or Digital Ocean
  - Frontend: Vercel or Netlify
  - Database: MongoDB Atlas

## Additional Tools
- **Logging**: Winston
- **Monitoring**: Sentry for error tracking
- **Analytics**: Google Analytics or Plausible
- **Email**: Nodemailer with SMTP provider (SendGrid/Mailgun)
- **Testing**: Jest and React Testing Library

## Simplification Recommendations

1. **Start with Monorepo**: Keep frontend and backend in a single repository initially for easier management
2. **Begin with Core Features**: Focus on event creation, booking, and basic payment first
3. **Implement UPI Payment**: Focus on the custom UPI+UTR flow as a priority
4. **Mobile-First Approach**: Design for mobile first, then enhance for desktop
5. **MongoDB Advantages**: Using MongoDB allows for flexible schema evolution during early development
6. **Local Storage First**: Start with browser localStorage for saving draft events, then move to database as features stabilize
7. **Incremental PWA**: Add PWA features progressively, starting with basic offline support 