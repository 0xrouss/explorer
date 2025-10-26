# Nexus Intent Explorer Frontend

A modern, responsive web application built with Next.js for exploring intent data across the Nexus ecosystem. The frontend provides an intuitive interface for users to browse, search, and analyze intents across CORAL (Testnet), FOLLY (Dev), and CERISE (Mainnet) networks.

## ✨ Features

### 🌐 Multi-Network Support

- **Network Switching**: Seamlessly toggle between CORAL, FOLLY, and CERISE networks
- **Network-Specific Data**: Each network maintains its own database and data isolation
- **Visual Network Indicators**: Clear visual cues for current network selection

### 🔍 Intent Exploration

- **Advanced Search**: Search by Intent ID, signature address, or user address
- **Smart Filtering**: Filter by status (pending, deposited, fulfilled, refunded)
- **Pagination**: Efficient handling of large datasets with pagination
- **Sorting**: Sort by creation time, status, or other relevant fields

### 📊 Detailed Analytics

- **Intent Details**: Comprehensive view of intent information including sources, destinations, and signatures
- **Transaction History**: Complete fill and deposit transaction records
- **User Profiles**: View all intents signed by specific signature addresses
- **Network Statistics**: Real-time network statistics and metrics

### 🎨 User Experience

- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Dark/Light Theme**: Modern UI with theme support
- **Real-time Updates**: Live data from PostgreSQL databases
- **Copy-to-Clipboard**: Easy copying of addresses, hashes, and other data
- **Error Handling**: Graceful error states and loading indicators

## 🛠️ Tech Stack

- **Next.js 16** - React framework with App Router and Server Components
- **TypeScript** - Type-safe development with comprehensive type definitions
- **Tailwind CSS** - Utility-first CSS framework for responsive design
- **PostgreSQL** - Database with connection pooling for optimal performance
- **React Server Components** - Optimized rendering and data fetching
- **Wagmi** - Ethereum wallet connection and interaction
- **Reown AppKit** - Wallet connection and management
- **Nexus Widgets** - Cross-chain transaction widgets

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) runtime (latest version)
- PostgreSQL databases for each network (CORAL, FOLLY, CERISE)
- Node.js 18+ (for compatibility)

### Installation

1. **Clone and Navigate**

   ```bash
   git clone <repository-url>
   cd nexus-explorer/explorer/frontend
   ```

2. **Install Dependencies**

   ```bash
   bun install
   ```

3. **Environment Configuration**

   Create a `.env.local` file in the frontend directory:

   ```env
   # Database connections for each network
   DATABASE_URL_CORAL=postgresql://user:password@localhost:5432/coral_db
   DATABASE_URL_FOLLY=postgresql://user:password@localhost:5432/folly_db
   DATABASE_URL_CERISE=postgresql://user:password@localhost:5432/cerise_db

   # Optional: Wallet connection (for Nexus widgets)
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
   ```

4. **Development Server**

   ```bash
   bun dev
   ```

   The application will be available at `http://localhost:3000`

### Production Build

```bash
# Build the application
bun build

# Start production server
bun start
```

### Docker Deployment

```dockerfile
# Dockerfile example
FROM oven/bun:1 as base
WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN bun build

# Expose port
EXPOSE 3000

# Start application
CMD ["bun", "start"]
```

## 📁 Project Structure

```
frontend/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   └── [network]/            # Network-scoped endpoints
│   │       ├── intents/          # Intent-related endpoints
│   │       ├── transactions/     # Transaction endpoints
│   │       ├── users/            # User-related endpoints
│   │       └── stats/            # Statistics endpoints
│   ├── intent/                    # Intent detail pages
│   │   └── [id]/                 # Dynamic intent pages
│   ├── user/                     # User profile pages
│   │   └── [address]/            # Dynamic user pages
│   ├── nexus/                    # Nexus widgets page
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout component
│   └── page.tsx                  # Homepage
├── components/                    # Reusable UI components
│   ├── ui/                       # Base UI components
│   ├── Header.tsx                # Navigation header
│   ├── ErrorBoundary.tsx         # Error handling
│   └── NetworkSelector.tsx       # Network switching
├── lib/                          # Utilities and business logic
│   ├── db/                       # Database layer
│   │   ├── init.ts               # Database initialization
│   │   ├── repositories/         # Data access layer
│   │   └── types.ts              # Database types
│   ├── config/                   # Configuration files
│   │   ├── chains.ts             # Chain configurations
│   │   ├── tokens.ts             # Token configurations
│   │   └── README.md             # Config documentation
│   ├── constants.ts              # Application constants
│   ├── formatters.ts             # Data formatting utilities
│   └── api-client.ts             # Frontend API client
├── types/                        # TypeScript type definitions
│   ├── api.ts                    # API response types
│   ├── database.ts               # Database schema types
│   └── network.ts                # Network-related types
├── context/                      # React context providers
│   └── index.tsx                 # Wallet and app context
├── config/                       # App configuration
│   └── index.tsx                 # Wagmi and wallet config
├── package.json                  # Dependencies and scripts
├── tailwind.config.js            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # This file
```

## 🔌 API Reference

### Intent Endpoints

#### List Intents

```http
GET /api/[network]/intents?page=1&limit=20&search=123&status=fulfilled
```

**Query Parameters:**

- `page` (number): Page number for pagination
- `limit` (number): Number of items per page (max 100)
- `search` (string): Search by Intent ID or signature address
- `status` (string): Filter by status (pending, deposited, fulfilled, refunded)
- `sortBy` (string): Sort field (created_at, status, etc.)
- `sortOrder` (string): Sort direction (asc, desc)

**Response:**

```json
{
  "intents": [
    {
      "id": 123,
      "user": "0x...",
      "status": "fulfilled",
      "created_at": "2024-01-01T00:00:00Z",
      "sources": [...],
      "destinations": [...]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1500,
    "totalPages": 75
  }
}
```

#### Get Intent Details

```http
GET /api/[network]/intents/[id]
```

**Response:**

```json
{
  "intent": {
    "id": 123,
    "user": "0x...",
    "expiry": 1234567890,
    "status": "fulfilled",
    "sources": [...],
    "destinations": [...],
    "signatures": [...],
    "transactions": [...]
  }
}
```

### Transaction Endpoints

#### Get Intent Transactions

```http
GET /api/[network]/transactions/[intentId]
```

**Response:**

```json
{
  "fills": [...],
  "deposits": [...]
}
```

### User Endpoints

#### Get User Profile

```http
GET /api/[network]/users/[address]
```

**Response:**

```json
{
  "user": {
    "address": "0x...",
    "intentCount": 15,
    "totalVolume": "1000.50",
    "intents": [...]
  }
}
```

### Statistics Endpoints

#### Get Network Statistics

```http
GET /api/[network]/stats
```

**Response:**

```json
{
  "totalIntents": 15000,
  "totalVolume": "5000000.00",
  "statusBreakdown": {
    "pending": 100,
    "deposited": 200,
    "fulfilled": 14000,
    "refunded": 700
  },
  "lastUpdate": "2024-01-01T00:00:00Z"
}
```

## 🗄️ Database Schema

The frontend connects to three separate PostgreSQL databases (one per network) with the following main tables:

### Core Tables

- **`intents`** - Main intent records with status and metadata
- **`intent_sources`** - Source token information for each intent
- **`intent_destinations`** - Destination token information for each intent
- **`intent_signatures`** - Signature data and validation information

### Transaction Tables

- **`fill_transactions`** - Fill transaction records from Cosmos
- **`deposit_transactions`** - Deposit transaction records from Cosmos
- **`evm_fill_events`** - EVM fill events from various chains
- **`evm_deposit_events`** - EVM deposit events from various chains

### Relationships

- Intents have many sources, destinations, and signatures
- Intents can have multiple fill and deposit transactions
- EVM events are linked to intents through reconciliation

## 🎯 Key Features Deep Dive

### Homepage Dashboard

- **Network Selector**: Visual network switching with status indicators
- **Recent Intents Table**: Paginated list with sorting and filtering
- **Search Functionality**: Real-time search by Intent ID or signature address
- **Status Filtering**: Quick filters for pending, deposited, fulfilled, refunded
- **Network Statistics**: Live metrics including total intents, volume, and status breakdown

### Intent Detail Pages

- **Complete Intent Information**: All intent metadata and status
- **Sources & Destinations**: Detailed token information with formatting
- **Signature Data**: Signature validation and signer information
- **Transaction History**: Chronological list of fills and deposits
- **Copy-to-Clipboard**: Easy copying of addresses, hashes, and IDs
- **Navigation Links**: Quick access to user profiles and related intents

### User Profile Pages

- **User Statistics**: Total intents, volume, and activity summary
- **Intent History**: Paginated list of all intents signed by the user
- **Performance Metrics**: Success rates and transaction patterns
- **Quick Actions**: Links to create new intents or view transactions

### Nexus Widgets Integration

- **Cross-Chain Bridge**: Interactive bridge widget for asset transfers
- **Wallet Connection**: Seamless wallet integration with multiple providers
- **Transaction Management**: Real-time transaction status and history
- **Multi-Chain Support**: Support for various EVM and Cosmos chains

## 🛠️ Development

### Code Organization

- **React Server Components**: Optimal performance with server-side rendering
- **Connection Pooling**: Efficient database access with connection management
- **Error Boundaries**: Graceful error handling and user feedback
- **TypeScript**: Comprehensive type safety throughout the application
- **Tailwind CSS**: Responsive design with utility-first approach

### Performance Optimizations

- **Server-Side Rendering**: Fast initial page loads
- **Database Indexing**: Optimized queries for large datasets
- **Caching**: Strategic caching of frequently accessed data
- **Lazy Loading**: On-demand loading of components and data
- **Image Optimization**: Next.js automatic image optimization

### Testing Strategy

- **Component Testing**: Unit tests for React components
- **API Testing**: Integration tests for API endpoints
- **E2E Testing**: End-to-end tests for critical user flows
- **Database Testing**: Tests for data integrity and queries

## 🚀 Deployment

### Environment Variables

```env
# Required: Database connections
DATABASE_URL_CORAL=postgresql://user:password@host:port/coral_db
DATABASE_URL_FOLLY=postgresql://user:password@host:port/folly_db
DATABASE_URL_CERISE=postgresql://user:password@host:port/cerise_db

# Optional: Wallet integration
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Optional: Analytics
NEXT_PUBLIC_GA_ID=your_google_analytics_id
```

### Production Checklist

- [ ] Database connections configured and tested
- [ ] Environment variables set correctly
- [ ] SSL certificates configured
- [ ] CDN setup for static assets
- [ ] Monitoring and logging configured
- [ ] Error tracking setup (Sentry, etc.)
- [ ] Performance monitoring enabled

### Scaling Considerations

- **Database**: Consider read replicas for high traffic
- **Caching**: Implement Redis for session and query caching
- **CDN**: Use CDN for static assets and API responses
- **Load Balancing**: Multiple instances behind load balancer
- **Monitoring**: Comprehensive monitoring and alerting

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Install dependencies: `bun install`
4. Make your changes
5. Test your changes: `bun test`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Code Standards

- Follow TypeScript best practices
- Use meaningful variable and function names
- Add proper error handling
- Include JSDoc comments for complex functions
- Ensure responsive design works on all devices
- Test across all three networks (CORAL, FOLLY, CERISE)

### Pull Request Guidelines

- Provide a clear description of changes
- Include screenshots for UI changes
- Add tests for new functionality
- Ensure all tests pass
- Update documentation as needed

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Wagmi Documentation](https://wagmi.sh/)
- [Nexus Protocol Documentation](https://docs.nexus.arcana.network)

## 🆘 Troubleshooting

### Common Issues

**Database Connection Errors**

- Verify database URLs are correct
- Check network connectivity
- Ensure database is running and accessible

**Build Errors**

- Clear `.next` folder and rebuild
- Check TypeScript errors: `bun run type-check`
- Verify all dependencies are installed

**Runtime Errors**

- Check browser console for client-side errors
- Review server logs for API errors
- Verify environment variables are set correctly

### Getting Help

- Check existing issues in the repository
- Create a new issue with detailed information
- Include error messages and steps to reproduce
- Provide environment details (OS, Node version, etc.)

---

**Note**: This frontend is designed to work with the Nexus ecosystem monitoring service. Ensure the monitor service is running and databases are properly configured before deploying the frontend.
