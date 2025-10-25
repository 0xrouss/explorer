# Nexus Intent Explorer Frontend

A Next.js-based blockchain explorer for viewing intent data across the Nexus ecosystem (CORAL, FOLLY, and CERISE networks).

## Features

- **Network Switching**: Toggle between CORAL, FOLLY, and CERISE networks
- **Intent Exploration**: Browse intents with pagination and filtering
- **Search Functionality**: Search by Intent ID or signature address
- **Detailed Views**: Comprehensive intent details with sources, destinations, signatures, and transactions
- **Signature Address Pages**: View all intents signed by a specific signature address
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS
- **Real-time Data**: Live data from PostgreSQL databases

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **PostgreSQL** - Database with connection pooling
- **React Server Components** - Optimized rendering

## Setup

1. **Install Dependencies**

   ```bash
   cd frontend
   bun install
   ```

2. **Environment Configuration**
   Create a `.env.local` file with your database connection strings:

   ```env
   DATABASE_URL_CORAL=postgresql://user:password@localhost:5432/coral_db
   DATABASE_URL_FOLLY=postgresql://user:password@localhost:5432/folly_db
   DATABASE_URL_CERISE=postgresql://user:password@localhost:5432/cerise_db
   ```

3. **Run Development Server**

   ```bash
   bun dev
   ```

4. **Build for Production**
   ```bash
   bun build
   bun start
   ```

## Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   └── [network]/     # Network-scoped API endpoints
│   ├── intent/            # Intent detail pages
│   ├── user/              # User profile pages
│   └── layout.tsx         # Root layout
├── components/            # Reusable UI components
├── lib/                   # Utilities and database layer
│   ├── db/               # Database connection and repositories
│   ├── constants.ts      # Application constants
│   ├── formatters.ts     # Data formatting utilities
│   └── api-client.ts     # Frontend API client
├── types/                 # TypeScript type definitions
└── README.md
```

## API Endpoints

- `GET /api/[network]/intents` - List intents with pagination and search
- `GET /api/[network]/intents/[id]` - Get intent details with relations
- `GET /api/[network]/transactions/[intentId]` - Get transactions for an intent
- `GET /api/[network]/users/[address]` - Get user data and intents
- `GET /api/[network]/stats` - Get network statistics

## Database Schema

The explorer connects to three separate PostgreSQL databases (one per network) with the following main tables:

- `intents` - Main intent records
- `intent_sources` - Source tokens for intents
- `intent_destinations` - Destination tokens for intents
- `intent_signatures` - Signature data for intents
- `fill_transactions` - Fill transaction records
- `deposit_transactions` - Deposit transaction records

## Features

### Homepage

- Network selector with visual indicators
- Recent intents table with sorting and pagination
- Search by Intent ID or signature address
- Status filtering (pending, deposited, fulfilled, refunded)
- Network statistics dashboard

### Intent Detail Page

- Complete intent information
- Sources, destinations, and signatures tables
- Fill and deposit transaction history
- Copy-to-clipboard functionality for addresses and hashes
- Links to user profiles

### User Page

- User statistics and activity summary
- List of all intents signed by the user
- Pagination for large result sets

## Development

The project uses:

- **React Server Components** for optimal performance
- **Connection pooling** for efficient database access
- **Error boundaries** for graceful error handling
- **TypeScript** for type safety
- **Tailwind CSS** for responsive styling

## Deployment

1. Set up your database connections in environment variables
2. Run `bun build` to create the production build
3. Deploy the `.next` folder to your hosting platform
4. Ensure your database servers are accessible from your deployment environment

## Contributing

1. Follow the existing code structure and patterns
2. Add proper TypeScript types for new features
3. Include error handling and loading states
4. Test with all three networks (CORAL, FOLLY, CERISE)
5. Ensure responsive design works on mobile devices
