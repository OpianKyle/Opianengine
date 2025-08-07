# OpianRewards Full-Stack Application

## Overview
This is a full-stack JavaScript application for managing a rewards program with customer referrals, commissions, and analytics.

## Architecture
- **Frontend**: React with Vite, TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with local strategy
- **Analytics**: Google Analytics integration
- **File Storage**: Local file upload handling
- **UI Framework**: shadcn/ui with Radix UI components

## Key Features
- Customer management and registration
- Agent referral system with commissions
- Analytics dashboard
- Payment processing (Paystack integration)
- PDF generation for reports
- WhatsApp integration
- Email notifications

## Project Structure
```
├── client/          # React frontend
├── server/          # Express backend
├── db/             # Database schema and migrations
├── public/         # Static assets
├── scripts/        # Database scripts and utilities
└── migrations/     # Database migration files
```

## Recent Changes
- Migration from Replit Agent to standard Replit environment completed
- Successfully removed Key Icons Section from Terms and Conditions page
- Application now running properly on Replit with all dependencies installed

## User Preferences
- Use TypeScript for type safety
- Follow modern React patterns with hooks
- Maintain client/server separation
- Use shadcn/ui for consistent UI components

## Dependencies Status
- Node.js 20 required
- All npm packages listed in package.json need installation
- PostgreSQL database setup required