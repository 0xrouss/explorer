# Intent Monitor System

A production-ready monitoring system that tracks Arcana network intents across all three networks (CORAL, FOLLY, CERISE) and stores them in a normalized PostgreSQL database with proper relationships and indexes.

## Features

- **Multi-Network Monitoring**: Simultaneously tracks CORAL (testnet), FOLLY (dev), and CERISE (mainnet)
- **Real-time Polling**: Configurable polling intervals with efficient deduplication
- **Normalized Database**: PostgreSQL schema with proper relationships and indexes
- **Gap Detection & Sync**: Automatic detection and backfill of missing intents
- **Historical Sync**: Optional full historical synchronization on startup
- **Comprehensive Logging**: Structured logging with network and intent context
- **CLI Interface**: Full command-line interface with multiple operational modes
- **Health Monitoring**: Built-in health checks and status reporting
- **Graceful Shutdown**: Proper cleanup and resource management

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│           Arcana Networks (CORAL, FOLLY, CERISE)             │
│                    gRPC + Cosmos RPC                          │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   │ Polling (configurable interval)
                   │
┌──────────────────▼───────────────────────────────────────────┐
│                   Multi-Network Monitor                       │
│  - NetworkMonitor instances (one per network)                 │
│  - Tracks intents, fills, deposits                            │
│  - Handles state management & deduplication                   │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   │ Transform & validate
                   │
┌──────────────────▼───────────────────────────────────────────┐
│                    Database Layer (Neon)                      │
│  - Normalized schema with relationships                       │
│  - Intents, sources, destinations, signatures                 │
│  - Fill transactions, deposit transactions                    │
│  - Indexes for fast queries                                   │
└───────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Installation

```bash
# Install dependencies (already done if you followed the setup)
npm install

# Copy environment template
cp explorer/monitor/env.example .env

# Edit .env with your database URLs for each network
DATABASE_URL_CORAL=postgresql://username:password@your-neon-host/coral_database
DATABASE_URL_FOLLY=postgresql://username:password@your-neon-host/folly_database
DATABASE_URL_CERISE=postgresql://username:password@your-neon-host/cerise_database
```

### 2. Configuration

Edit your `.env` file:

```bash
# Database Configuration - Separate databases for each network
DATABASE_URL_CORAL=postgresql://username:password@your-neon-host/coral_database
DATABASE_URL_FOLLY=postgresql://username:password@your-neon-host/folly_database
DATABASE_URL_CERISE=postgresql://username:password@your-neon-host/cerise_database

# Monitor Configuration
MONITOR_CORAL_ENABLED=true
MONITOR_FOLLY_ENABLED=true
MONITOR_CERISE_ENABLED=true
MONITOR_INTERVAL_MS=5000

# Rate Limiting Configuration
MONITOR_BATCH_SIZE=20
MONITOR_SYNC_DELAY_MS=500

# Logging
LOG_LEVEL=info

# Optional: Historical sync on first run
MONITOR_FULL_SYNC=false
```

### 3. Run the Monitor

```bash
# Start monitoring all enabled networks
npm run monitor

# Monitor only CORAL network
npm run monitor -- --network CORAL

# Poll every 10 seconds
npm run monitor -- --interval 10000

# Full historical sync on startup
npm run monitor -- --full-sync
```

## Usage

### Basic Monitoring

```bash
# Start monitoring (runs continuously)
npm run monitor

# Monitor specific network
npm run monitor -- --network FOLLY

# Custom polling interval
npm run monitor -- --interval 3000
```

### One-time Operations

```bash
# Sync all networks once and exit
npm run monitor -- --sync

# Sync specific range of intents
npm run monitor -- --sync-range 100-200

# Show current status
npm run monitor -- --status

# Show statistics
npm run monitor -- --stats

# Health check
npm run monitor -- --health

# Restart specific network
npm run monitor -- --restart CORAL
```

### Help

```bash
npm run monitor -- --help
```

## Database Schema

The system uses a normalized PostgreSQL schema with the following main tables:

### Core Tables

- **`intents`**: Main intent records with status and metadata
- **`intent_sources`**: Source token information (1:N relationship)
- **`intent_destinations`**: Destination token information (1:N relationship)
- **`intent_signatures`**: Signature data (1:N relationship)
- **`fill_transactions`**: Fill transaction records
- **`deposit_transactions`**: Deposit transaction records

### Key Features

- **Indexes**: Optimized indexes on frequently queried columns
- **Foreign Keys**: Proper referential integrity
- **Triggers**: Automatic `updated_at` timestamp management
- **Views**: `intent_summary` view for aggregated data

## Configuration

### Environment Variables

| Variable                 | Description                             | Default  |
| ------------------------ | --------------------------------------- | -------- |
| `DATABASE_URL_CORAL`     | PostgreSQL connection string for CORAL  | Required |
| `DATABASE_URL_FOLLY`     | PostgreSQL connection string for FOLLY  | Required |
| `DATABASE_URL_CERISE`    | PostgreSQL connection string for CERISE | Required |
| `DATABASE_URL`           | Fallback single database (optional)     | Optional |
| `MONITOR_CORAL_ENABLED`  | Enable CORAL network monitoring         | `true`   |
| `MONITOR_FOLLY_ENABLED`  | Enable FOLLY network monitoring         | `true`   |
| `MONITOR_CERISE_ENABLED` | Enable CERISE network monitoring        | `true`   |
| `MONITOR_INTERVAL_MS`    | Polling interval in milliseconds        | `5000`   |
| `MONITOR_BATCH_SIZE`     | Batch size for API requests             | `20`     |
| `MONITOR_SYNC_DELAY_MS`  | Delay between batches (rate limiting)   | `500`    |
| `LOG_LEVEL`              | Log level (error, warn, info, debug)    | `info`   |
| `MONITOR_FULL_SYNC`      | Full sync on startup                    | `false`  |

### CLI Options

| Option                 | Description                                     |
| ---------------------- | ----------------------------------------------- |
| `--network <NETWORK>`  | Monitor specific network (CORAL, FOLLY, CERISE) |
| `--interval <MS>`      | Polling interval in milliseconds                |
| `--full-sync`          | Perform full historical sync on startup         |
| `--sync`               | Sync all networks once and exit                 |
| `--sync-range <RANGE>` | Sync specific range (format: startId-endId)     |
| `--status`             | Show monitor status and exit                    |
| `--stats`              | Show statistics and exit                        |
| `--health`             | Show health check and exit                      |
| `--restart <NETWORK>`  | Restart specific network monitor                |

## Monitoring & Operations

### Status Monitoring

```bash
# Check overall status
npm run monitor -- --status

# Health check
npm run monitor -- --health

# View statistics
npm run monitor -- --stats
```

### Gap Detection & Recovery

The system automatically:

1. **Detects Missing Intents**: Compares local database with network state
2. **Backfills Gaps**: Fetches and processes missing intent data
3. **Handles Restarts**: Resumes from last known intent ID
4. **Syncs Transactions**: Ensures fills and deposits are captured

### Manual Gap Sync

```bash
# Sync specific range
npm run monitor -- --sync-range 1000-2000

# Full network sync
npm run monitor -- --sync
```

## Development

### Project Structure

```
monitor/
├── index.ts                    # Main entry point
├── monitor.ts                  # MonitorService orchestrator
├── network-monitor.ts          # NetworkMonitor class
├── database/
│   ├── client.ts              # Neon PostgreSQL client
│   ├── schema.sql             # Database schema
│   └── repositories/
│       ├── intent-repository.ts
│       ├── fill-repository.ts
│       └── deposit-repository.ts
├── types/
│   └── database.ts            # Database type definitions
├── utils/
│   ├── logger.ts              # Structured logging
│   └── config.ts              # Configuration management
└── README.md                   # This file
```

### Adding New Features

1. **Database Changes**: Update `schema.sql` and run migrations
2. **Repository Updates**: Extend repository classes for new queries
3. **Monitor Logic**: Add new monitoring capabilities to `NetworkMonitor`
4. **CLI Options**: Extend argument parsing in `index.ts`

## Troubleshooting

### Common Issues

1. **Database Connection Failed**

   ```
   Error: Failed to connect to database
   ```

   - Check `DATABASE_URL` in `.env`
   - Verify network connectivity to Neon
   - Check database credentials

2. **No Intents Found**

   ```
   No new intents found for CORAL
   ```

   - Normal if network is quiet
   - Check network configuration
   - Verify gRPC endpoints are accessible

3. **Sync Failures**
   ```
   Failed to sync intent 12345
   ```
   - Check network connectivity
   - Verify intent ID exists on network
   - Review logs for specific error details

### Logs

The system provides structured logging with context:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "INFO",
  "message": "Intent processed",
  "network": "CORAL",
  "intentId": 12345,
  "status": "fulfilled"
}
```

### Performance Tuning

1. **Polling Interval**: Adjust `MONITOR_INTERVAL_MS` based on network activity
2. **Batch Size**: Modify `batchSize` in `NetworkMonitor` for API efficiency
3. **Database Indexes**: Add custom indexes for your query patterns
4. **Connection Pooling**: Tune PostgreSQL connection pool settings

## Production Deployment

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["npm", "run", "monitor"]
```

### Process Management

```bash
# Using PM2
pm2 start npm --name "intent-monitor" -- run monitor

# Using systemd
systemctl start intent-monitor
systemctl enable intent-monitor
```

### Monitoring

- **Health Checks**: Use `--health` flag for monitoring
- **Logs**: Centralize logs for analysis
- **Metrics**: Monitor database size and query performance
- **Alerts**: Set up alerts for sync failures or high latency

## License

MIT License - see project root for details.
