# Nexus Monitor Service

A robust, production-ready monitoring service for the Nexus ecosystem that continuously syncs intent and transaction data from CORAL (Testnet), FOLLY (Dev), and CERISE (Mainnet) networks to PostgreSQL databases. The monitor ensures data consistency, handles multiple blockchain networks, and provides real-time synchronization capabilities.

## 🎯 Overview

The Nexus Monitor Service is the backbone of the Nexus Intent Explorer, responsible for:

- **Real-time Intent Synchronization**: Continuously monitors and syncs intents from Nexus networks
- **Multi-Chain Transaction Tracking**: Tracks fill and deposit transactions across Cosmos and EVM chains
- **EVM Event Monitoring**: Monitors EVM chains for fill and deposit events using eth_getLogs
- **Data Reconciliation**: Links EVM events to intents for complete transaction history
- **Database Management**: Maintains data integrity with automatic migrations and cleanup

## ✨ Key Features

### 🔄 Continuous Monitoring

- **Real-time Sync**: Polls networks every 10 seconds for new intents and transactions
- **Gap Detection**: Automatically detects and fills data gaps between database and network
- **Error Recovery**: Robust error handling with automatic retry mechanisms
- **Graceful Shutdown**: Clean shutdown handling with SIGINT/SIGTERM signals

### 🌐 Multi-Network Support

- **CORAL (Testnet)**: Testing environment with full monitoring capabilities
- **FOLLY (Dev)**: Development environment for testing new features
- **CERISE (Mainnet)**: Production environment with enhanced monitoring

### 🔗 Multi-Chain Integration

- **Cosmos Chains**: Direct integration with Cosmos SDK chains
- **EVM Chains**: Support for multiple EVM-compatible chains
- **Configurable Chains**: Easy addition of new chains through configuration

### 📊 Comprehensive Data Coverage

- **Intent Data**: Complete intent information with sources, destinations, and signatures
- **Transaction History**: Fill and deposit transactions from all supported chains
- **EVM Events**: Raw EVM events with full transaction details
- **Reconciliation**: Automatic linking of EVM events to intents

## 🛠️ Tech Stack

- **Bun Runtime**: Fast JavaScript runtime for optimal performance
- **TypeScript**: Type-safe development with comprehensive type definitions
- **PostgreSQL**: Robust database with ACID compliance and advanced features
- **Viem**: Type-safe Ethereum library for EVM chain interactions
- **Cosmos SDK**: Integration with Cosmos-based networks
- **Protocol Buffers**: Efficient data serialization for network communication

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) runtime (latest version)
- PostgreSQL database (version 13+)
- Access to Nexus network endpoints
- Node.js 18+ (for compatibility)

### Installation

1. **Clone and Navigate**

   ```bash
   git clone <repository-url>
   cd nexus-explorer/explorer/new-monitor
   ```

2. **Install Dependencies**

```bash
bun install
```

3. **Database Setup**

   Create a PostgreSQL database for your target network:

   ```sql
   CREATE DATABASE coral_db;
   CREATE DATABASE folly_db;
   CREATE DATABASE cerise_db;
   ```

4. **Environment Configuration**

   Set up environment variables:

   ```bash
   # Required: Network and database configuration
   export NETWORK=CORAL  # or FOLLY, CERISE
   export DATABASE_URL=postgresql://user:password@localhost:5432/coral_db

   # Optional: Custom polling interval (default: 10000ms)
   export POLL_INTERVAL_MS=10000

   # Optional: EVM RPC endpoints (if using custom endpoints)
   export ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your-key
   export POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/your-key
   ```

5. **Run the Monitor**
   ```bash
   bun run index.ts
   ```

### First Run

On the first run, the monitor will:

1. **Initialize Database**: Create tables and indexes
2. **Sync All Intents**: Fetch and store all existing intents
3. **Sync Transactions**: Sync all fill and deposit transactions
4. **Sync EVM Events**: Monitor EVM chains for events
5. **Link Events**: Reconcile EVM events with intents
6. **Start Monitoring**: Begin continuous monitoring loop

## 📁 Project Structure

```
new-monitor/
├── index.ts                    # Main entry point
├── monitor.ts                  # Core monitoring logic
├── migrate.ts                  # Database migration utilities
├── client/                     # Network clients
│   └── client.ts               # Arcana network client
├── database/                   # Database layer
│   ├── client.ts               # Database connection management
│   ├── index.ts                # Repository exports
│   ├── types.ts                # Database type definitions
│   ├── schema.sql              # Database schema
│   └── repositories/           # Data access layer
│       ├── IntentRepository.ts
│       ├── FillRepository.ts
│       ├── DepositRepository.ts
│       ├── EvmFillRepository.ts
│       └── EvmDepositRepository.ts
├── evm/                        # EVM chain integration
│   ├── config.ts               # EVM chain configurations
│   ├── index.ts                # EVM syncer exports
│   ├── syncer.ts               # EVM event syncer
│   └── types.ts                # EVM type definitions
├── ABI/                        # Contract ABIs
│   └── ...                     # Various contract ABIs
├── proto/                      # Protocol buffer definitions
│   └── definition.ts           # Generated protobuf types
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
└── README.md                   # This file
```

## 🔧 Configuration

### Network Configuration

The monitor supports three networks with different endpoints:

| Network    | Type    | GRPC Endpoint                              | Cosmos Endpoint                                 |
| ---------- | ------- | ------------------------------------------ | ----------------------------------------------- |
| **CORAL**  | Testnet | `https://grpcproxy-testnet.arcana.network` | `https://cosmos01-testnet.arcana.network:26650` |
| **FOLLY**  | Dev     | `https://grpc-folly.arcana.network`        | `https://cosmos04-dev.arcana.network:26650`     |
| **CERISE** | Mainnet | `https://mimosa-dash-grpc.arcana.network`  | `https://cosmos01-dev.arcana.network:26650`     |

### EVM Chain Configuration

The monitor automatically configures EVM chains based on the network:

```typescript
// Example EVM chain configuration
const EVM_CHAINS = {
  CORAL: [
    {
      chainId: 1,
      name: "Ethereum",
      rpcUrl: "https://eth-mainnet.g.alchemy.com/v2/...",
    },
    {
      chainId: 137,
      name: "Polygon",
      rpcUrl: "https://polygon-mainnet.g.alchemy.com/v2/...",
    },
    // ... more chains
  ],
  FOLLY: [
    // Development chain configurations
  ],
  CERISE: [
    // Mainnet chain configurations
  ],
};
```

### Database Configuration

The monitor uses PostgreSQL with the following key features:

- **Connection Pooling**: Efficient connection management
- **ACID Compliance**: Data integrity and consistency
- **Indexing**: Optimized queries for large datasets
- **Cascading Deletes**: Automatic cleanup of related records

## 🔄 Monitoring Process

### Intent Synchronization

1. **Gap Detection**: Compare database intent IDs with network state
2. **Bulk Sync**: Fetch missing intents in batches
3. **Data Validation**: Validate intent data integrity
4. **Database Update**: Insert new intents with related data

### Transaction Monitoring

1. **Cosmos Transactions**: Monitor Cosmos chains for fill/deposit transactions
2. **EVM Events**: Use eth_getLogs to monitor EVM chains
3. **Event Processing**: Parse and validate transaction events
4. **Database Storage**: Store transaction data with proper relationships

### Reconciliation Process

1. **Event Linking**: Link EVM events to corresponding intents
2. **Status Updates**: Update intent status based on transaction events
3. **Cleanup**: Remove orphaned events and update statistics

## 📊 Database Schema

### Core Tables

- **`intents`** - Main intent records with status and metadata
- **`intent_sources`** - Source token information (1:N relationship)
- **`intent_destinations`** - Destination token information (1:N relationship)
- **`intent_signature_data`** - Signature data (1:N relationship)

### Transaction Tables

- **`fill_transactions`** - Fill transactions from Cosmos chains
- **`deposit_transactions`** - Deposit transactions from Cosmos chains
- **`evm_fill_events`** - EVM fill events from eth_getLogs
- **`evm_deposit_events`** - EVM deposit events from eth_getLogs

### Key Relationships

- Intents have many sources, destinations, and signatures
- Intents can have multiple fill and deposit transactions
- EVM events are linked to intents through reconciliation
- All tables include created_at/updated_at timestamps

## 🚀 Deployment

### Environment Variables

```bash
# Required
NETWORK=CORAL                    # Target network (CORAL/FOLLY/CERISE)
DATABASE_URL=postgresql://...    # PostgreSQL connection string

# Optional
POLL_INTERVAL_MS=10000           # Polling interval in milliseconds
LOG_LEVEL=info                   # Logging level (debug/info/warn/error)
MAX_RETRIES=3                    # Maximum retry attempts for failed operations
```

### Production Deployment

1. **Database Setup**

   ```bash
   # Create production database
   createdb nexus_monitor_prod

   # Run schema migration
   psql nexus_monitor_prod < database/schema.sql
   ```

2. **Service Configuration**

   ```bash
   # Set production environment
   export NETWORK=CERISE
   export DATABASE_URL=postgresql://user:pass@prod-db:5432/nexus_monitor_prod
   export POLL_INTERVAL_MS=5000
   ```

3. **Process Management**

   ```bash
   # Using PM2
   pm2 start "bun run index.ts" --name nexus-monitor

   # Using systemd
   sudo systemctl start nexus-monitor
   ```

### Docker Deployment

```dockerfile
FROM oven/bun:1 as base
WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Set environment
ENV NODE_ENV=production

# Expose port (if needed for health checks)
EXPOSE 3000

# Start monitor
CMD ["bun", "run", "index.ts"]
```

## 📈 Monitoring and Observability

### Health Checks

The monitor provides several health check endpoints:

- **Database Connectivity**: Verify database connection
- **Network Connectivity**: Check network endpoint availability
- **Sync Status**: Monitor synchronization progress
- **Error Rates**: Track error rates and retry attempts

### Logging

Comprehensive logging with different levels:

- **DEBUG**: Detailed operation information
- **INFO**: General operation status
- **WARN**: Warning conditions
- **ERROR**: Error conditions with stack traces

### Metrics

Key metrics to monitor:

- **Sync Rate**: Intents synced per minute
- **Error Rate**: Failed operations per minute
- **Database Size**: Database growth over time
- **Network Latency**: Response times from network endpoints

## 🔧 Advanced Configuration

### Custom EVM Chains

To add custom EVM chains:

1. **Update Configuration**

   ```typescript
   // evm/config.ts
   export const CUSTOM_CHAINS = [
     {
       chainId: 12345,
       name: "Custom Chain",
       rpcUrl: "https://custom-chain-rpc.com",
       contracts: {
         fillContract: "0x...",
         depositContract: "0x...",
       },
     },
   ];
   ```

2. **Add Contract ABIs**

   ```bash
   # Add ABI files to ABI/ directory
   cp custom-contract-abi.json ABI/
   ```

3. **Restart Monitor**
   ```bash
   bun run index.ts
   ```

### Performance Tuning

- **Connection Pooling**: Adjust database connection pool size
- **Batch Sizes**: Configure batch sizes for bulk operations
- **Polling Intervals**: Adjust polling frequency based on network activity
- **Memory Usage**: Monitor and optimize memory usage

## 🛠️ Development

### Running in Development

```bash
# Development mode with debug logging
export LOG_LEVEL=debug
export NETWORK=CORAL
export DATABASE_URL=postgresql://user:pass@localhost:5432/coral_dev

bun run index.ts
```

### Testing

```bash
# Run tests
bun test

# Run with coverage
bun test --coverage

# Run specific test file
bun test monitor.test.ts
```

### Database Migrations

```bash
# Run migrations
bun run migrate.ts

# Rollback migrations (if supported)
bun run migrate.ts --rollback
```

## 🆘 Troubleshooting

### Common Issues

**Database Connection Errors**

- Verify DATABASE_URL is correct
- Check database server is running
- Ensure network connectivity

**Network Sync Errors**

- Check network endpoint availability
- Verify authentication credentials
- Review network-specific configurations

**EVM Event Sync Issues**

- Verify RPC endpoint accessibility
- Check contract addresses are correct
- Ensure ABI files are up to date

**Memory Issues**

- Monitor memory usage with large datasets
- Adjust batch sizes for bulk operations
- Consider database connection pooling

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
export LOG_LEVEL=debug
bun run index.ts
```

### Performance Issues

- **Slow Sync**: Check network latency and database performance
- **High Memory Usage**: Optimize batch sizes and connection pooling
- **Database Growth**: Implement data retention policies

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
- Add proper error handling and logging
- Include JSDoc comments for complex functions
- Test with all three networks (CORAL, FOLLY, CERISE)

### Pull Request Guidelines

- Provide a clear description of changes
- Include tests for new functionality
- Update documentation as needed
- Ensure all tests pass
- Test with production-like data volumes

## 📚 Additional Resources

- [Bun Documentation](https://bun.sh/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Viem Documentation](https://viem.sh/)
- [Cosmos SDK Documentation](https://docs.cosmos.network/)
- [Nexus Protocol Documentation](https://docs.nexus.arcana.network)

## 📄 License

[Add your license information here]

---

**Note**: This monitor service is designed to work with the Nexus ecosystem. Ensure you have proper access to network endpoints and database configurations before deployment. The service is production-ready and handles large-scale data synchronization efficiently.
