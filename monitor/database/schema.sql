-- Intent Monitor Database Schema
-- Normalized schema for tracking Arcana network intents

-- Create enum types
CREATE TYPE network_type AS ENUM ('CORAL', 'FOLLY', 'CERISE');
CREATE TYPE intent_status AS ENUM ('pending', 'deposited', 'fulfilled', 'refunded');

-- Main intents table
CREATE TABLE intents (
    id BIGINT PRIMARY KEY,
    user_cosmos VARCHAR(255) NOT NULL,
    
    -- Status
    status intent_status NOT NULL DEFAULT 'pending',
    deposited BOOLEAN DEFAULT FALSE,
    fulfilled BOOLEAN DEFAULT FALSE,
    refunded BOOLEAN DEFAULT FALSE,
    
    -- Timing
    creation_block BIGINT NOT NULL,
    expiry BIGINT NOT NULL,
    fulfilled_at BIGINT,
    
    -- Chain info
    destination_chain_id BIGINT NOT NULL,
    destination_universe INT NOT NULL,
    
    -- Fulfillment
    fulfilled_by VARCHAR(42),
    
    -- Technical
    nonce VARCHAR(66) NOT NULL,
    
    -- Network tracking
    network network_type NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Intent sources (1:N relationship)
CREATE TABLE intent_sources (
    id SERIAL PRIMARY KEY,
    intent_id BIGINT NOT NULL REFERENCES intents(id) ON DELETE CASCADE,
    universe INT NOT NULL,
    chain_id BIGINT NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    value VARCHAR(78) NOT NULL, -- Large numbers as string
    status INT NOT NULL,
    collection_fee_required BIGINT NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Intent destinations (1:N relationship)
CREATE TABLE intent_destinations (
    id SERIAL PRIMARY KEY,
    intent_id BIGINT NOT NULL REFERENCES intents(id) ON DELETE CASCADE,
    token_address VARCHAR(42) NOT NULL,
    value VARCHAR(78) NOT NULL, -- Large numbers as string
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Intent signatures (1:N relationship)
CREATE TABLE intent_signatures (
    id SERIAL PRIMARY KEY,
    intent_id BIGINT NOT NULL REFERENCES intents(id) ON DELETE CASCADE,
    universe INT NOT NULL,
    address VARCHAR(42) NOT NULL,
    signature TEXT NOT NULL,
    hash VARCHAR(66) NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fill transactions
CREATE TABLE fill_transactions (
    cosmos_hash VARCHAR(66) PRIMARY KEY,
    height VARCHAR(100) NOT NULL,
    intent_id BIGINT NOT NULL REFERENCES intents(id) ON DELETE CASCADE,
    filler_address VARCHAR(42) NOT NULL,
    evm_tx_hash VARCHAR(66) NOT NULL,
    chain_id VARCHAR(100) NOT NULL,
    universe INT NOT NULL,
    network network_type NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deposit transactions
CREATE TABLE deposit_transactions (
    cosmos_hash VARCHAR(66) PRIMARY KEY,
    height VARCHAR(100) NOT NULL,
    intent_id BIGINT NOT NULL REFERENCES intents(id) ON DELETE CASCADE,
    chain_id VARCHAR(100) NOT NULL,
    universe INT NOT NULL,
    network network_type NOT NULL,
    gas_refunded BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
-- Intent indexes
CREATE INDEX idx_intents_user_cosmos ON intents(user_cosmos);
CREATE INDEX idx_intents_status ON intents(status);
CREATE INDEX idx_intents_fulfilled ON intents(fulfilled);
CREATE INDEX idx_intents_deposited ON intents(deposited);
CREATE INDEX idx_intents_refunded ON intents(refunded);
CREATE INDEX idx_intents_creation_block ON intents(creation_block);
CREATE INDEX idx_intents_expiry ON intents(expiry);
CREATE INDEX idx_intents_destination_chain ON intents(destination_chain_id);
CREATE INDEX idx_intents_network ON intents(network);
CREATE INDEX idx_intents_created_at ON intents(created_at);
CREATE INDEX idx_intents_updated_at ON intents(updated_at);

-- Source indexes
CREATE INDEX idx_intent_sources_intent_id ON intent_sources(intent_id);
CREATE INDEX idx_intent_sources_universe ON intent_sources(universe);
CREATE INDEX idx_intent_sources_chain_id ON intent_sources(chain_id);
CREATE INDEX idx_intent_sources_token_address ON intent_sources(token_address);

-- Destination indexes
CREATE INDEX idx_intent_destinations_intent_id ON intent_destinations(intent_id);
CREATE INDEX idx_intent_destinations_token_address ON intent_destinations(token_address);

-- Signature indexes
CREATE INDEX idx_intent_signatures_intent_id ON intent_signatures(intent_id);
CREATE INDEX idx_intent_signatures_universe ON intent_signatures(universe);
CREATE INDEX idx_intent_signatures_address ON intent_signatures(address);

-- Fill transaction indexes
CREATE INDEX idx_fill_transactions_intent_id ON fill_transactions(intent_id);
CREATE INDEX idx_fill_transactions_filler_address ON fill_transactions(filler_address);
CREATE INDEX idx_fill_transactions_network ON fill_transactions(network);
CREATE INDEX idx_fill_transactions_created_at ON fill_transactions(created_at);

-- Deposit transaction indexes
CREATE INDEX idx_deposit_transactions_intent_id ON deposit_transactions(intent_id);
CREATE INDEX idx_deposit_transactions_network ON deposit_transactions(network);
CREATE INDEX idx_deposit_transactions_created_at ON deposit_transactions(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_intents_updated_at 
    BEFORE UPDATE ON intents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a view for intent summary
CREATE VIEW intent_summary AS
SELECT 
    i.id,
    i.user_cosmos,
    i.status,
    i.deposited,
    i.fulfilled,
    i.refunded,
    i.creation_block,
    i.expiry,
    i.fulfilled_at,
    i.destination_chain_id,
    i.destination_universe,
    i.fulfilled_by,
    i.network,
    i.created_at,
    i.updated_at,
    COUNT(DISTINCT s.id) as source_count,
    COUNT(DISTINCT d.id) as destination_count,
    COUNT(DISTINCT sig.id) as signature_count,
    COUNT(DISTINCT f.cosmos_hash) as fill_count,
    COUNT(DISTINCT dep.cosmos_hash) as deposit_count
FROM intents i
LEFT JOIN intent_sources s ON i.id = s.intent_id
LEFT JOIN intent_destinations d ON i.id = d.intent_id
LEFT JOIN intent_signatures sig ON i.id = sig.intent_id
LEFT JOIN fill_transactions f ON i.id = f.intent_id
LEFT JOIN deposit_transactions dep ON i.id = dep.intent_id
GROUP BY i.id;
