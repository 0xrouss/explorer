-- Network-Specific Monitor Database Schema
-- One database per network (CORAL, FOLLY, CERISE)
-- Simple structure that mirrors the API responses

-- ============================================================================
-- MAIN TABLES
-- ============================================================================

-- Intents table
CREATE TABLE IF NOT EXISTS intents (
    id BIGINT PRIMARY KEY,
    user_address VARCHAR(255) NOT NULL,
    expiry BIGINT NOT NULL,
    creation_block BIGINT NOT NULL,
    destination_chain_id BIGINT NOT NULL,
    destination_universe INTEGER NOT NULL,
    nonce VARCHAR(66) NOT NULL UNIQUE,
    deposited BOOLEAN DEFAULT FALSE,
    fulfilled BOOLEAN DEFAULT FALSE,
    refunded BOOLEAN DEFAULT FALSE,
    fulfilled_by VARCHAR(42),
    fulfilled_at BIGINT DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Intent sources (1:N relationship)
CREATE TABLE IF NOT EXISTS intent_sources (
    id SERIAL PRIMARY KEY,
    intent_id BIGINT NOT NULL REFERENCES intents(id) ON DELETE CASCADE,
    universe INTEGER NOT NULL,
    chain_id BIGINT NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    value VARCHAR(78) NOT NULL,
    status INTEGER NOT NULL,
    collection_fee_required BIGINT NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Intent destinations (1:N relationship)
CREATE TABLE IF NOT EXISTS intent_destinations (
    id SERIAL PRIMARY KEY,
    intent_id BIGINT NOT NULL REFERENCES intents(id) ON DELETE CASCADE,
    token_address VARCHAR(42) NOT NULL,
    value VARCHAR(78) NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Intent signature data (1:N relationship)
CREATE TABLE IF NOT EXISTS intent_signature_data (
    id SERIAL PRIMARY KEY,
    intent_id BIGINT NOT NULL REFERENCES intents(id) ON DELETE CASCADE,
    universe INTEGER NOT NULL,
    address VARCHAR(42) NOT NULL,
    signature TEXT NOT NULL,
    hash VARCHAR(66) NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fill transactions
CREATE TABLE IF NOT EXISTS fill_transactions (
    cosmos_hash VARCHAR(66) PRIMARY KEY,
    height VARCHAR(100) NOT NULL,
    intent_id BIGINT NOT NULL REFERENCES intents(id) ON DELETE CASCADE,
    filler_address VARCHAR(42) NOT NULL,
    evm_tx_hash VARCHAR(66) NOT NULL,
    chain_id VARCHAR(100) NOT NULL,
    universe INTEGER NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deposit transactions
CREATE TABLE IF NOT EXISTS deposit_transactions (
    cosmos_hash VARCHAR(66) PRIMARY KEY,
    height VARCHAR(100) NOT NULL,
    intent_id BIGINT NOT NULL REFERENCES intents(id) ON DELETE CASCADE,
    chain_id VARCHAR(100) NOT NULL,
    universe INTEGER NOT NULL,
    gas_refunded BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- EVM Fill Events (from eth_getLogs)
-- These are the source of truth for fill confirmations on destination chains
CREATE TABLE IF NOT EXISTS evm_fill_events (
    id SERIAL PRIMARY KEY,
    request_hash VARCHAR(66) NOT NULL,
    intent_id BIGINT REFERENCES intents(id) ON DELETE CASCADE,
    chain_id BIGINT NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    log_index INTEGER NOT NULL,
    from_address VARCHAR(42) NOT NULL,
    solver_address VARCHAR(42) NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure uniqueness per transaction and log index
    UNIQUE(tx_hash, log_index)
);

-- EVM Deposit Events (from eth_getLogs)
-- These are the source of truth for deposit confirmations on source chains
CREATE TABLE IF NOT EXISTS evm_deposit_events (
    id SERIAL PRIMARY KEY,
    request_hash VARCHAR(66) NOT NULL,
    intent_id BIGINT REFERENCES intents(id) ON DELETE CASCADE,
    chain_id BIGINT NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    log_index INTEGER NOT NULL,
    from_address VARCHAR(42) NOT NULL,
    gas_refunded BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure uniqueness per transaction and log index
    UNIQUE(tx_hash, log_index)
);

-- Sync state per EVM chain (cursor for last checked block)
CREATE TABLE IF NOT EXISTS evm_sync_state (
    chain_id BIGINT PRIMARY KEY,
    last_checked_block BIGINT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Intent indexes
CREATE INDEX IF NOT EXISTS idx_intents_user_address ON intents(user_address);
CREATE INDEX IF NOT EXISTS idx_intents_deposited ON intents(deposited);
CREATE INDEX IF NOT EXISTS idx_intents_fulfilled ON intents(fulfilled);
CREATE INDEX IF NOT EXISTS idx_intents_refunded ON intents(refunded);
CREATE INDEX IF NOT EXISTS idx_intents_creation_block ON intents(creation_block);
CREATE INDEX IF NOT EXISTS idx_intents_expiry ON intents(expiry);
CREATE INDEX IF NOT EXISTS idx_intents_destination_chain_id ON intents(destination_chain_id);
CREATE INDEX IF NOT EXISTS idx_intents_updated_at ON intents(updated_at);

-- Source indexes
CREATE INDEX IF NOT EXISTS idx_intent_sources_intent_id ON intent_sources(intent_id);
CREATE INDEX IF NOT EXISTS idx_intent_sources_chain_id ON intent_sources(chain_id);
CREATE INDEX IF NOT EXISTS idx_intent_sources_token_address ON intent_sources(token_address);

-- Destination indexes
CREATE INDEX IF NOT EXISTS idx_intent_destinations_intent_id ON intent_destinations(intent_id);
CREATE INDEX IF NOT EXISTS idx_intent_destinations_token_address ON intent_destinations(token_address);

-- Signature data indexes
CREATE INDEX IF NOT EXISTS idx_intent_signature_data_intent_id ON intent_signature_data(intent_id);
CREATE INDEX IF NOT EXISTS idx_intent_signature_data_address ON intent_signature_data(address);

-- Fill transaction indexes
CREATE INDEX IF NOT EXISTS idx_fill_transactions_intent_id ON fill_transactions(intent_id);
CREATE INDEX IF NOT EXISTS idx_fill_transactions_filler_address ON fill_transactions(filler_address);
CREATE INDEX IF NOT EXISTS idx_fill_transactions_created_at ON fill_transactions(created_at);

-- Deposit transaction indexes
CREATE INDEX IF NOT EXISTS idx_deposit_transactions_intent_id ON deposit_transactions(intent_id);
CREATE INDEX IF NOT EXISTS idx_deposit_transactions_created_at ON deposit_transactions(created_at);

-- EVM Fill event indexes
CREATE INDEX IF NOT EXISTS idx_evm_fill_events_request_hash ON evm_fill_events(request_hash);
CREATE INDEX IF NOT EXISTS idx_evm_fill_events_intent_id ON evm_fill_events(intent_id);
CREATE INDEX IF NOT EXISTS idx_evm_fill_events_chain_id ON evm_fill_events(chain_id);
CREATE INDEX IF NOT EXISTS idx_evm_fill_events_tx_hash ON evm_fill_events(tx_hash);
CREATE INDEX IF NOT EXISTS idx_evm_fill_events_block_number ON evm_fill_events(block_number);
CREATE INDEX IF NOT EXISTS idx_evm_fill_events_solver_address ON evm_fill_events(solver_address);
CREATE INDEX IF NOT EXISTS idx_evm_fill_events_created_at ON evm_fill_events(created_at);

-- EVM Deposit event indexes
CREATE INDEX IF NOT EXISTS idx_evm_deposit_events_request_hash ON evm_deposit_events(request_hash);
CREATE INDEX IF NOT EXISTS idx_evm_deposit_events_intent_id ON evm_deposit_events(intent_id);
CREATE INDEX IF NOT EXISTS idx_evm_deposit_events_chain_id ON evm_deposit_events(chain_id);
CREATE INDEX IF NOT EXISTS idx_evm_deposit_events_tx_hash ON evm_deposit_events(tx_hash);
CREATE INDEX IF NOT EXISTS idx_evm_deposit_events_block_number ON evm_deposit_events(block_number);
CREATE INDEX IF NOT EXISTS idx_evm_deposit_events_from_address ON evm_deposit_events(from_address);
CREATE INDEX IF NOT EXISTS idx_evm_deposit_events_created_at ON evm_deposit_events(created_at);

-- Sync state indexes
CREATE INDEX IF NOT EXISTS idx_evm_sync_state_updated_at ON evm_sync_state(updated_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at on intents
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_intents_updated_at ON intents;
CREATE TRIGGER update_intents_updated_at 
    BEFORE UPDATE ON intents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

