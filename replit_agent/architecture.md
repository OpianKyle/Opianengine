# Architecture Overview

## 1. Overview

The Opian Rewards platform is a full-stack web application that manages user rewards, referrals, agent commissions, and subscription services. It follows a client-server architecture with React on the frontend and Node.js/Express on the backend. The application uses a MySQL/MariaDB database for data persistence and includes features for user management, reward point tracking, and agent commission calculations.

## 2. System Architecture

The system follows a modern web application architecture with distinct frontend and backend components:

### 2.1 Frontend Architecture

- **Framework:** React with TypeScript
- **UI Components:** Uses Shadcn UI component library (based on Radix UI primitives)
- **State Management:** React Query (TanStack Query) for server state
- **Routing:** Uses Wouter (lightweight alternative to React Router)
- **Build System:** Vite for fast development and optimized production builds
- **Styling:** Tailwind CSS for utility-first styling

The frontend is structured as a Single Page Application (SPA) with client-side routing and component-based architecture.

### 2.2 Backend Architecture

- **Framework:** Express.js with TypeScript
- **API Design:** RESTful API structure
- **Database Access:** Uses direct MariaDB/MySQL queries via mysql2
- **Authentication:** Combined JWT and session-based authentication
- **WebSockets:** Used for real-time notifications
- **Email Services:** SMTP integration for transactional emails

The backend follows a modular architecture with separate route files for different functional domains (admin, agent, subscription, etc.).

### 2.3 Database Architecture

- **Database:** MySQL/MariaDB
- **ORM/Query Builder:** Combination of raw SQL queries and Drizzle ORM
- **Schema:** Relational database schema with tables for users, rewards, subscriptions, agent commissions, etc.
- **Connection Management:** Connection pool for efficient database connections

## 3. Key Components

### 3.1 User Authentication System

The application uses a hybrid authentication system:

- Session-based authentication (with express-session, stored in MemoryStore)
- JWT-based authentication for API access and agent portals
- Custom password hashing using scrypt with salt
- Role-based access control with distinct roles: regular users, agents, admins, and super admins

Authentication logic is primarily managed in `server/auth.ts`.

### 3.2 Reward and Points System

The application implements a points-based reward system for users:

- Points awarded for activities like referrals (2000 points per referral)
- Transaction history for point allocations and usage
- Admin interface for managing and adjusting user points

### 3.3 Agent Commission System

Agents receive commissions for referrals and customer sign-ups:

- Commission calculation based on package type (30% for sign-ups, 10% for renewals)
- Agent dashboard for tracking commissions and referred customers
- `agent_commissions` table stores commission records

### 3.4 Subscription Management

Users can subscribe to different packages:

- Integration with Paystack payment gateway (currently disabled in the codebase)
- Support for various package types: OPPORTUNITY, MOMENTUM, PROSPER, PRESTIGE, PINNACLE
- Subscription renewal handling via cron jobs
- Package pricing managed in database with fallback to hard-coded values

### 3.5 Notification System

- WebSocket-based real-time notifications for users
- Notification persistence in database
- Email notifications for important events

### 3.6 Leads Management System

A lead tracking system for potential customers:

- Structured leads table with relevant customer information
- Assignment of leads to agents
- Status tracking for lead progression

## 4. Data Flow

### 4.1 Authentication Flow

1. User submits login credentials via web form
2. Server validates credentials against stored password hash
3. On success, session is created and/or JWT is issued
4. Frontend stores authentication state and includes token in subsequent requests
5. Protected routes/endpoints verify session or JWT before granting access

### 4.2 Referral and Commission Flow

1. User signs up with a referral code
2. System identifies the referrer (agent or regular user)
3. Referrer receives points (2000 points per referral)
4. If referrer is an agent, commission is calculated based on the package selected
5. Commission records are stored in `agent_commissions` table
6. Agents can view their commission data via the agent dashboard

### 4.3 Subscription Flow

1. User selects a package (OPPORTUNITY, MOMENTUM, etc.)
2. System calculates the appropriate price
3. Payment processing would normally occur via Paystack integration (currently disabled)
4. Subscription record is created in database
5. Monthly renewals are processed via scheduled tasks

## 5. External Dependencies

### 5.1 Email Service

- Primary: Native SMTP via nodemailer
  - Configured with SMTP host, port, credentials
  - Used for transactional emails like registration, notifications
- Alternative services (currently disabled):
  - SendGrid
  - SendInBlue

### 5.2 Payment Processing

- Paystack integration for subscription payments (code present but disabled)
- Infrastructure for tracking payment history and subscription status

### 5.3 PDF Generation

- Uses html-pdf for generating PDF documents
- Used for invoice and report generation

## 6. Deployment Strategy

The application supports multiple deployment approaches:

### 6.1 Production Deployment

- Environment-specific build process via `build.sh` and `npm run build`
- Server-side rendering or static file serving for frontend assets
- Environment variables for configuration
- Production mode optimizations

### 6.2 Development Environment

- Vite development server with hot module replacement
- Separate server process for backend API
- Development-specific middleware and error handling

### 6.3 Containerization Support

- Basic containerization support through Replit configuration
- Support for cloud deployment targets

### 6.4 Database Migrations

- Manual migration scripts for schema updates
- Support for running migrations during deployment
- Migration verification and rollback capabilities

## 7. Security Considerations

### 7.1 Authentication Security

- Secure password hashing with scrypt and salting
- HTTPS enforcement in production
- JWT with proper expiration and secret management
- Session security with secure, HTTP-only cookies

### 7.2 Data Protection

- Environment variable management for sensitive information
- Database credentials and secrets kept outside of version control
- Input validation with Zod schemas

### 7.3 API Security

- Authentication middleware for protected endpoints
- Role-based access control
- Input sanitization and validation