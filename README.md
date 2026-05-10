# Registration and Survey Management System

A professional multi-tenant registration portal and survey management system designed for event organizers. This platform enables the dynamic creation of registration forms, lanyard/certificate generation, and real-time attendee analytics.

## Core Features

- **Dynamic Form Builder**: Create customized registration or survey forms with various input types including grids, ratings, and sliders.
- **Badge & Certificate Generation**: Automated server-side generation of high-quality event lanyards and certificates of participation.
- **Real-time Analytics**: Consolidated dashboard for tracking participant counts and calculating average survey scores.
- **Registration Management**: Full administrative control with soft-delete and restoration capabilities for attendee records.
- **Bilingual Support**: Native support for English and Japanese translations across all forms and administrative interfaces.
- **Asset Management**: Integrated signature and logo management for personalized branding.

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Database & Storage**: Supabase (PostgreSQL & S3 Storage)
- **Styling**: Vanilla CSS / Tailwind CSS
- **Graphics**: Next/OG (Satori) for dynamic badge rendering
- **Authentication**: Supabase Auth

## Getting Started

### Prerequisites

- Node.js 18.x or later
- A Supabase project

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd registration
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env.local` file with the following:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_public_key
   ```

4. Database Setup:
   Execute the SQL script located in `migrations/final_schema_sync.sql` within your Supabase SQL Editor to initialize the required tables, indexes, and RLS policies.

5. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment

The application is optimized for deployment on Vercel. Ensure all environment variables are configured in the Vercel project settings.

## License

MIT
