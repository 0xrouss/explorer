# Nexus Intent Explorer

A comprehensive blockchain explorer and monitoring system for the Nexus ecosystem, supporting CORAL (Testnet), FOLLY (Dev), and CERISE (Mainnet) networks. This project provides both a web-based explorer interface and a robust monitoring service for tracking intents and transactions across multiple blockchain networks.

## 🚀 Overview

The Nexus Intent Explorer consists of two main components:

- **Frontend**: A Next.js-based web application for exploring intent data across Nexus networks
- **Monitor**: A background service that continuously syncs intent and transaction data from blockchain networks to PostgreSQL databases

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CORAL Network │    │   FOLLY Network  │    │  CERISE Network │
│    (Testnet)    │    │     (Dev)       │    │   (Mainnet)     │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │     Monitor Service       │
                    │   (new-monitor/)          │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │   PostgreSQL Databases   │
                    │  (coral_db, folly_db,    │
                    │   cerise_db)             │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │    Frontend Explorer     │
                    │     (frontend/)          │
                    └───────────────────────────┘
```

## 📁 Project Structure

```
nexus-explorer/
├── README.md                 # This file
├── client.ts                 # Shared client utilities
├── query.ts                  # Query utilities
├── contracts.txt             # Contract addresses
├── frontend/                 # Next.js web application
│   ├── app/                 # App Router pages
│   ├── components/          # React components
│   ├── lib/                 # Utilities and database layer
│   ├── types/               # TypeScript definitions
│   └── README.md            # Frontend documentation
├── new-monitor/              # Monitoring service
│   ├── index.ts             # Main entry point
│   ├── monitor.ts           # Core monitoring logic
│   ├── client/              # Network clients
│   ├── database/            # Database layer
│   ├── evm/                 # EVM chain integration
│   └── README.md            # Monitor documentation
└── proto/                   # Protocol buffer definitions
```

## 🛠️ Quick Start

### Prerequisites

- [Bun](https://bun.sh) runtime
- PostgreSQL databases for each network
- Access to Nexus network endpoints

### 1. Clone and Setup

```bash
git clone <repository-url>
cd nexus-explorer/explorer
```

### 2. Configure Monitor Service

```bash
cd new-monitor
bun install

# Set environment variables
export NETWORK=CORAL  # or FOLLY, CERISE
export DATABASE_URL=postgresql://user:password@localhost:5432/coral_db

# Run the monitor
bun run index.ts
```

### 3. Configure Frontend

```bash
cd frontend
bun install

# Create environment file
cat > .env.local << EOF
DATABASE_URL_CORAL=postgresql://user:password@localhost:5432/coral_db
DATABASE_URL_FOLLY=postgresql://user:password@localhost:5432/folly_db
DATABASE_URL_CERISE=postgresql://user:password@localhost:5432/cerise_db
EOF

# Start development server
bun dev
```

## 🌐 Networks

| Network    | Type    | Description             | GRPC Endpoint                              |
| ---------- | ------- | ----------------------- | ------------------------------------------ |
| **CORAL**  | Testnet | Testing environment     | `https://grpcproxy-testnet.arcana.network` |
| **FOLLY**  | Dev     | Development environment | `https://grpc-folly.arcana.network`        |
| **CERISE** | Mainnet | Production environment  | `https://mimosa-dash-grpc.arcana.network`  |

## 🔧 Features

### Monitor Service (`new-monitor/`)

- **Intent Synchronization**: Continuously syncs intents from Nexus networks
- **Transaction Tracking**: Monitors fill and deposit transactions from Cosmos and EVM chains
- **EVM Integration**: Supports multiple EVM chains with configurable RPC endpoints
- **Database Management**: Automatic schema migrations and data integrity checks
- **Real-time Monitoring**: Polls networks for updates and maintains data freshness
- **Error Handling**: Robust error recovery and logging

### Frontend Explorer (`frontend/`)

- **Multi-Network Support**: Switch between CORAL, FOLLY, and CERISE networks
- **Intent Exploration**: Browse, search, and filter intents with pagination
- **Detailed Views**: Comprehensive intent details with sources, destinations, and signatures
- **Transaction History**: View fill and deposit transaction records
- **User Profiles**: Explore intents by signature address
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS
- **Real-time Data**: Live data from PostgreSQL databases

## 📊 Database Schema

The system uses separate PostgreSQL databases for each network with the following key tables:

- `intents` - Main intent records
- `intent_sources` - Source token information
- `intent_destinations` - Destination token information
- `intent_signatures` - Signature data
- `fill_transactions` - Fill transaction records
- `deposit_transactions` - Deposit transaction records
- `evm_fill_events` - EVM fill events
- `evm_deposit_events` - EVM deposit events

## 🚀 Deployment

### Monitor Service

```bash
# Production deployment
cd new-monitor
bun build
bun start
```

### Frontend

```bash
# Production build
cd frontend
bun build
bun start
```

## 🔍 API Endpoints

The frontend exposes the following API endpoints:

- `GET /api/[network]/intents` - List intents with pagination and search
- `GET /api/[network]/intents/[id]` - Get intent details with relations
- `GET /api/[network]/transactions/[intentId]` - Get transactions for an intent
- `GET /api/[network]/users/[address]` - Get user data and intents
- `GET /api/[network]/stats` - Get network statistics

## 🛡️ Security

- Environment variables for sensitive configuration
- Database connection pooling for efficient resource usage
- Input validation and sanitization
- Error boundaries for graceful failure handling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Development Guidelines

- Follow TypeScript best practices
- Use Bun as the runtime
- Maintain database schema consistency
- Test across all three networks
- Ensure responsive design

## 📝 License

[Add your license information here]

## 🆘 Support

For questions and support:

- Create an issue in the repository
- Check the individual component READMEs for detailed documentation
- Review the API documentation for integration details

## 🔗 Related Projects

- [Nexus Protocol Documentation](https://docs.nexus.arcana.network)
- [Arcana Network](https://arcana.network)

---

**Note**: This project is designed to work with the Nexus ecosystem. Ensure you have proper access to network endpoints and database configurations before deployment.
