# Car Crash Lawyer AI

## Overview

Car Crash Lawyer AI is a comprehensive web application designed to help users document and manage car accident incidents. The platform provides tools for incident reporting, location tracking, voice transcription, image processing, and automated document generation. The system integrates with multiple third-party services to provide a complete solution for accident documentation and legal preparation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture
The application is built on Node.js with Express.js as the web framework. The server implements a modular architecture with separate services for different functionalities:

- **Express.js Server**: Main application server with middleware for CORS, body parsing, cookie handling, and request logging
- **Modular Services**: Separated concerns into distinct service modules for user authentication, incident reporting, permissions, and email handling
- **API Design**: RESTful endpoints with shared key authentication for webhook integrations

### Authentication & Authorization
The system uses Supabase for authentication and implements a tiered access control system:

- **Supabase Auth**: Server-side authentication using service role keys for admin operations
- **Session Management**: Cookie-based session handling with token verification
- **Access Tiers**: Three-tier system (admin, premium, standard) with configurable enforcement
- **Shared Key Auth**: API key-based authentication for external integrations (Zapier/webhooks)

### Database Layer
Supabase serves as the primary database solution:

- **User Management**: User signup and profile data stored in configurable tables
- **Incident Reports**: Structured storage for accident reports with links to external media
- **Permissions System**: User access levels and subscription tracking
- **Real-time Features**: Supabase real-time subscriptions for live data updates

### Frontend Architecture
The frontend consists of multiple HTML pages with embedded JavaScript:

- **Static Pages**: HTML pages served from the public directory
- **Interactive Features**: Client-side JavaScript for location services, mapping, and form handling
- **Progressive Enhancement**: Core functionality works without JavaScript, enhanced features require it
- **Responsive Design**: CSS-based responsive layouts with gradient backgrounds and glass effects

### Location Services
Comprehensive location tracking and mapping capabilities:

- **HTML5 Geolocation**: Browser-based GPS positioning with accuracy reporting
- **Leaflet Maps**: Interactive mapping with markers and accuracy circles
- **What3Words Integration**: Precise location addressing using three-word combinations
- **Multiple Location Formats**: Support for coordinates, addresses, and What3Words

## External Dependencies

### Core Infrastructure
- **Supabase**: Database, authentication, and real-time subscriptions
- **Node.js Packages**: Express.js, axios for HTTP requests, cors, body-parser, cookie-parser, dotenv for environment variables

### AI & Communication Services
- **OpenAI**: GPT-4 integration for generating personalized thank-you notes and content processing
- **Whisper API**: Voice transcription capabilities for incident reporting
- **Nodemailer**: Email service integration for document delivery (configured but not fully implemented)

### Payment & Subscription Management
- **Stripe**: Payment processing with embedded buy buttons for subscription plans
- **Webhook Handling**: Stripe webhook processing for subscription status updates

### Form & Data Collection
- **Typeform**: Embedded forms for detailed incident reporting with dynamic URL parameters
- **Zapier Integration**: Webhook endpoints for automated workflow triggers

### Mapping & Location Services
- **Leaflet**: Open-source mapping library for interactive maps
- **What3Words API**: Location addressing service (requires API key configuration)
- **Browser Geolocation**: HTML5 geolocation for device positioning

### Development & Security
- **Semgrep**: Static code analysis with custom security rules
- **GDPR Compliance**: Placeholder service for image processing and data protection (not fully implemented)

### External Integrations
- **Firebase Tools**: Development tooling (legacy, being migrated to Supabase)
- **Replit Environment**: Hosting platform with environment variable management
- **QR Code Integration**: Static QR codes for mobile access points

The system is designed to be modular and scalable, with clear separation between core functionality and external service integrations. Most services have fallback behaviors when external dependencies are unavailable.