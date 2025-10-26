"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { CopyButton } from "@/components/CopyButton";
import { AddressLink } from "@/components/AddressLink";
import {
  formatDate,
  formatBlockNumber,
  formatTokenValue,
  formatTokenValueByAddress,
  formatTokenValueSmart,
  formatChainId,
  formatTokenAddressDisplay,
  formatTxHash,
  formatAddress,
  formatExpiryTime,
  formatBlockOrTimestamp,
  getChainExplorerUrl,
  getChainExplorerAddressUrl,
} from "@/lib/formatters";
import type {
  NetworkType,
  IntentWithRelations,
  TransactionData,
} from "@/types";

interface IntentDetailPageProps {
  params: { id: string };
}

const NETWORK: NetworkType = "FULLY";

export default function IntentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const intentId = params.id as string;

  const [intentData, setIntentData] = useState<IntentWithRelations | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIntentData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const intentResponse = await fetch(`/api/intents/${intentId}`);

        if (!intentResponse.ok) {
          throw new Error("Failed to fetch intent data");
        }

        const intentResult = await intentResponse.json();
        setIntentData(intentResult.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchIntentData();
  }, [intentId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[var(--accent-blue)] mx-auto"></div>
          <p className="mt-4 text-text-secondary">Loading intent details...</p>
        </div>
      </div>
    );
  }

  if (error || !intentData) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-4">
            Intent Not Found
          </h1>
          <p className="text-text-secondary mb-4">
            {error || "The requested intent could not be found."}
          </p>
          <button
            onClick={() => router.push("/")}
            className="bg-accent-blue text-white px-4 py-2 rounded-md hover:bg-accent-blue/80 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // IntentWithRelations is now flat with relations as properties
  const {
    sources,
    destinations,
    signatureData: signatures,
    fills,
    deposits,
    evmFills = [],
    evmDeposits = [],
    ...intent
  } = intentData;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="bg-card-bg border-b border-card-border shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <button
                onClick={() => router.push("/")}
                className="text-[var(--accent-blue)] hover:text-[var(--accent-blue)]/80 mb-2 transition-colors"
              >
                ← Back to Explorer
              </button>
              <h1 className="text-3xl font-bold text-text-primary">
                Intent #{intent.id}
              </h1>
            </div>
            <StatusBadge status={intent.status || "pending"} size="lg" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cross-Chain Flow Overview */}
        <div className="bg-card-bg border border-card-border shadow-lg overflow-hidden sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg leading-6 font-medium text-text-primary">
                Cross-Chain Intent Flow
              </h3>
              <StatusBadge status={intent.status || "pending"} size="md" />
            </div>

            {/* Cross-chain flow visualization */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Sources */}
              <div className="bg-bg-secondary border border-border-primary rounded-lg p-4">
                <h4 className="text-sm font-medium text-text-secondary mb-3 flex items-center">
                  <span className="w-2 h-2 bg-accent-blue rounded-full mr-2"></span>
                  Source Chains ({sources.length})
                </h4>
                <div className="space-y-2">
                  {sources.length > 0 ? (
                    sources.map((source, index) => (
                      <div
                        key={index}
                        className="bg-[var(--bg-tertiary)] rounded p-3"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-text-primary">
                            {formatChainId(source.chain_id)}
                          </span>
                        </div>
                        <div className="text-sm text-text-secondary font-medium">
                          {formatTokenValueSmart(
                            source.value,
                            source.chain_id,
                            source.token_address
                          )}{" "}
                          {formatTokenAddressDisplay(
                            source.chain_id,
                            source.token_address
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-text-muted">No sources</p>
                  )}
                </div>
              </div>

              {/* Arrow/Flow indicator */}
              <div className="flex items-center justify-center">
                <div className="flex flex-col items-center group">
                  <div className="w-12 h-12 bg-gradient-to-r from-[var(--accent-blue)] to-[var(--status-success)] rounded-full flex items-center justify-center mb-2 shadow-lg group-hover:scale-110 transition-transform duration-200">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </div>
                  <span className="text-xs text-text-muted font-medium">
                    Cross-Chain
                  </span>
                  <span className="text-xs text-text-muted opacity-75">
                    Bridge
                  </span>
                </div>
              </div>

              {/* Destinations */}
              <div className="bg-bg-secondary border border-border-primary rounded-lg p-4">
                <h4 className="text-sm font-medium text-text-secondary mb-3 flex items-center">
                  <span className="w-2 h-2 rounded-full mr-2"></span>
                  Destination Chain
                </h4>
                <div className="space-y-2">
                  <div className="bg-[var(--bg-tertiary)] rounded p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-text-primary">
                        {formatChainId(intent.destination_chain_id)}
                      </span>
                    </div>
                    {destinations.length > 0 ? (
                      destinations.map((destination, index) => (
                        <div key={index} className="mt-2">
                          <div className="text-sm text-text-secondary font-medium">
                            {formatTokenValueSmart(
                              destination.value,
                              intent.destination_chain_id,
                              destination.token_address
                            )}{" "}
                            {formatTokenAddressDisplay(
                              intent.destination_chain_id,
                              destination.token_address
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-text-muted">No destinations</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-border-primary">
              <div className="text-center">
                <div className="text-sm text-text-secondary mb-1">
                  Intent ID
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <span className="text font-medium text-text-primary">
                    #{intent.id}
                  </span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-text-secondary mb-1">User</div>
                <div className="flex items-center justify-center space-x-2">
                  {(() => {
                    // Find universe 0 signature address, fallback to user_address
                    const universe0Signature = signatures?.find(
                      (sig: any) => sig.universe === 0
                    );
                    const displayAddress =
                      universe0Signature?.address || intent.user_address;
                    return (
                      <>
                        <AddressLink
                          address={displayAddress}
                          network={NETWORK}
                          showFull={true}
                        />
                      </>
                    );
                  })()}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-text-secondary mb-1">Created</div>
                <div className="text-sm text-text-primary">
                  {formatDate(intent.created_at)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Sources & Destinations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Sources Details */}
          <div className="bg-card-bg border border-card-border shadow-lg overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-text-primary mb-4">
                Source Details ({sources.length})
              </h3>
              {sources.length > 0 ? (
                <div className="space-y-4">
                  {sources.map((source) => (
                    <div
                      key={source.id}
                      className="bg-bg-secondary border border-border-primary rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-text-primary">
                            {formatChainId(source.chain_id)}
                          </span>
                          <span className="text-xs text-text-muted bg-[var(--bg-tertiary)] px-2 py-1 rounded">
                            {source.universe}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-text-primary">
                          {formatTokenValueSmart(
                            source.value,
                            source.chain_id,
                            source.token_address
                          )}{" "}
                          {formatTokenAddressDisplay(
                            source.chain_id,
                            source.token_address
                          )}
                        </span>
                      </div>
                      <div className="text-sm text-text-secondary mb-2">
                        {formatTokenAddressDisplay(
                          source.chain_id,
                          source.token_address
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-muted font-mono">
                          {formatAddress(source.token_address)}
                        </span>
                        <CopyButton text={source.token_address} size="sm" />
                      </div>
                      <div className="mt-2 pt-2 border-t border-border-primary">
                        <div className="flex justify-between text-xs mb-2">
                          <span className="text-text-muted">
                            Collection Fee:
                          </span>
                          <span className="text-text-secondary">
                            {formatTokenValueSmart(
                              source.collection_fee_required.toString(),
                              source.chain_id,
                              source.token_address
                            )}{" "}
                            {formatTokenAddressDisplay(
                              source.chain_id,
                              source.token_address
                            )}
                          </span>
                        </div>
                        {/* Transaction */}
                        {evmDeposits.filter(
                          (deposit) => deposit.chain_id === source.chain_id
                        ).length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs text-text-muted mb-1">
                              Transaction:
                            </div>
                            {evmDeposits
                              .filter(
                                (deposit) =>
                                  deposit.chain_id === source.chain_id
                              )
                              .map((deposit, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between text-xs"
                                >
                                  <span className="text-text-secondary font-mono">
                                    {formatTxHash(deposit.tx_hash)}
                                  </span>
                                  <div className="flex items-center space-x-1">
                                    <CopyButton
                                      text={deposit.tx_hash}
                                      size="sm"
                                    />
                                    {getChainExplorerUrl(
                                      deposit.chain_id,
                                      deposit.tx_hash
                                    ) && (
                                      <a
                                        href={getChainExplorerUrl(
                                          deposit.chain_id,
                                          deposit.tx_hash
                                        )}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[var(--accent-blue)] hover:text-[var(--accent-blue)]/80 transition-colors"
                                        title="View on chain explorer"
                                      >
                                        <svg
                                          className="w-3 h-3"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                          />
                                        </svg>
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-text-secondary">No sources found</p>
              )}
            </div>
          </div>

          {/* Destinations Details */}
          <div className="bg-card-bg border border-card-border shadow-lg overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-text-primary mb-4">
                Destination Details ({destinations.length})
              </h3>
              {destinations.length > 0 ? (
                <div className="space-y-4">
                  {destinations.map((destination) => (
                    <div
                      key={destination.id}
                      className="bg-bg-secondary border border-border-primary rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-text-primary">
                            {formatChainId(intent.destination_chain_id)}
                          </span>
                          <span className="text-xs text-text-muted bg-[var(--bg-tertiary)] px-2 py-1 rounded">
                            {intent.destination_universe}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-text-primary">
                          {formatTokenValueSmart(
                            destination.value,
                            intent.destination_chain_id,
                            destination.token_address
                          )}{" "}
                          {formatTokenAddressDisplay(
                            intent.destination_chain_id,
                            destination.token_address
                          )}
                        </span>
                      </div>
                      <div className="text-sm text-text-secondary mb-2">
                        {formatTokenAddressDisplay(
                          intent.destination_chain_id,
                          destination.token_address
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-muted font-mono">
                          {formatAddress(destination.token_address)}
                        </span>
                        <CopyButton
                          text={destination.token_address}
                          size="sm"
                        />
                      </div>
                      {/* Transaction */}
                      {evmFills.filter(
                        (fill) => fill.chain_id === intent.destination_chain_id
                      ).length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border-primary">
                          <div className="text-xs text-text-muted mb-1">
                            Transaction:
                          </div>
                          {evmFills
                            .filter(
                              (fill) =>
                                fill.chain_id === intent.destination_chain_id
                            )
                            .map((fill, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between text-xs"
                              >
                                <span className="text-text-secondary font-mono">
                                  {formatTxHash(fill.tx_hash)}
                                </span>
                                <div className="flex items-center space-x-1">
                                  <CopyButton text={fill.tx_hash} size="sm" />
                                  {getChainExplorerUrl(
                                    fill.chain_id,
                                    fill.tx_hash
                                  ) && (
                                    <a
                                      href={getChainExplorerUrl(
                                        fill.chain_id,
                                        fill.tx_hash
                                      )}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[var(--accent-blue)] hover:text-[var(--accent-blue)]/80 transition-colors"
                                      title="View on chain explorer"
                                    >
                                      <svg
                                        className="w-3 h-3"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                        />
                                      </svg>
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-text-secondary">No destinations found</p>
              )}
            </div>
          </div>
        </div>

        {/* Technical Details - Collapsible */}
        <div className="bg-card-bg border border-card-border shadow-lg overflow-hidden sm:rounded-lg mb-8">
          <details className="group">
            <summary className="px-6 py-6 cursor-pointer hover:bg-[var(--hover-bg)] transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-accent-blue to-blue-600 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-text-primary">
                      Technical Details
                    </h3>
                    <p className="text-sm text-text-secondary">
                      Signatures, transactions, and blockchain data
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-accent-blue rounded-full"></div>
                    <span className="text-text-secondary">
                      {signatures.length} signatures
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-accent-green rounded-full"></div>
                    <span className="text-text-secondary">
                      {evmFills.length} fills
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-accent-yellow rounded-full"></div>
                    <span className="text-text-secondary">
                      {evmDeposits.length} deposits
                    </span>
                  </div>
                  <svg
                    className="w-5 h-5 text-text-secondary transform group-open:rotate-180 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </summary>

            <div className="px-6 py-6 border-t border-border-primary">
              {/* Intent Metadata */}
              {/* <div className="mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-bg-secondary border border-card-border rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-6 h-6 bg-accent-blue/20 rounded-md flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-accent-blue"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <h5 className="text-sm font-medium text-text-primary">
                        Intent Metadata
                      </h5>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Nonce:</span>
                        <span className="text-text-primary font-mono">
                          {intent.nonce}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">
                          Creation Block:
                        </span>
                        <span className="text-text-primary">
                          {formatBlockNumber(intent.creation_block)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">
                          Expiry Block:
                        </span>
                        <span className="text-text-primary">
                          {formatBlockNumber(intent.expiry)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-bg-secondary border border-card-border rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-6 h-6 bg-accent-green/20 rounded-md flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-accent-green"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                      </div>
                      <h5 className="text-sm font-medium text-text-primary">
                        Transaction Stats
                      </h5>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">
                          Total Fills:
                        </span>
                        <span className="text-text-primary">
                          {evmFills.length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">
                          Total Deposits:
                        </span>
                        <span className="text-text-primary">
                          {evmDeposits.length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">
                          Total Transactions:
                        </span>
                        <span className="text-text-primary">
                          {evmFills.length + evmDeposits.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-bg-secondary border border-card-border rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-6 h-6 bg-accent-purple/20 rounded-md flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-accent-purple"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                          />
                        </svg>
                      </div>
                      <h5 className="text-sm font-medium text-text-primary">
                        Signature Info
                      </h5>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">
                          Total Signatures:
                        </span>
                        <span className="text-text-primary">
                          {signatures.length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Universes:</span>
                        <span className="text-text-primary">
                          {signatures.map((s) => s.universe).join(", ")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">
                          Fulfilled By:
                        </span>
                        <span className="text-text-primary">
                          {intent.fulfilled_by
                            ? formatAddress(intent.fulfilled_by)
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div> */}

              {/* Signatures */}
              <div className="mb-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-br from-accent-blue to-blue-600 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-text-primary">
                      Signatures ({signatures.length})
                    </h4>
                    <p className="text-sm text-text-secondary">
                      Cryptographic signatures from different universes
                    </p>
                  </div>
                </div>
                {signatures.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[var(--table-border)]">
                      <thead className="bg-[var(--table-header-bg)]">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                            Universe
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                            Address
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                            Signature Hash
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-card-bg divide-y divide-[var(--table-border)]">
                        {signatures.map((signature) => (
                          <tr key={signature.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                              {signature.universe}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                              <AddressLink
                                address={signature.address}
                                network={NETWORK}
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary font-mono">
                              <div className="flex items-center space-x-2">
                                <span>{formatTxHash(signature.hash)}</span>
                                <CopyButton text={signature.hash} size="sm" />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-text-secondary">No signatures found</p>
                )}
              </div>

              {/* EVM Transactions */}
              {(evmFills.length > 0 || evmDeposits.length > 0) && (
                <div>
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-8 h-8 bg-gradient-to-br from-accent-green to-green-600 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-text-primary">
                        EVM Transactions
                      </h4>
                      <p className="text-sm text-text-secondary">
                        Blockchain transactions for fills and deposits
                      </p>
                    </div>
                  </div>

                  {/* EVM Fill Events */}
                  {evmFills.length > 0 && (
                    <div className="mb-8">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-6 h-6 bg-accent-green/20 rounded-md flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-accent-green"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                        </div>
                        <h5 className="text-md font-semibold text-text-primary">
                          Fill Events ({evmFills.length})
                        </h5>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-[var(--table-border)]">
                          <thead className="bg-[var(--table-header-bg)]">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                TX Hash
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                Chain
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                Block Number
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                Solver
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                From
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-card-bg divide-y divide-[var(--table-border)]">
                            {evmFills.map((fill) => (
                              <tr key={`${fill.tx_hash}-${fill.log_index}`}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary font-mono">
                                  <div className="flex items-center space-x-2">
                                    <span>{formatTxHash(fill.tx_hash)}</span>
                                    <CopyButton text={fill.tx_hash} size="sm" />
                                    {getChainExplorerUrl(
                                      fill.chain_id,
                                      fill.tx_hash
                                    ) && (
                                      <a
                                        href={getChainExplorerUrl(
                                          fill.chain_id,
                                          fill.tx_hash
                                        )}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[var(--accent-blue)] hover:text-[var(--accent-blue)]/80 transition-colors"
                                        title="View on chain explorer"
                                      >
                                        <svg
                                          className="w-4 h-4"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                          />
                                        </svg>
                                      </a>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                                  <div className="flex items-center space-x-2">
                                    <span>{formatChainId(fill.chain_id)}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                                  {formatBlockNumber(fill.block_number)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                                  <AddressLink
                                    address={fill.solver_address}
                                    network={NETWORK}
                                  />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                                  <AddressLink
                                    address={fill.from_address}
                                    network={NETWORK}
                                    showFull={true}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* EVM Deposit Events */}
                  {evmDeposits.length > 0 && (
                    <div>
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-6 h-6 bg-accent-yellow/20 rounded-md flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-accent-yellow"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                            />
                          </svg>
                        </div>
                        <h5 className="text-md font-semibold text-text-primary">
                          Deposit Events ({evmDeposits.length})
                        </h5>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-[var(--table-border)]">
                          <thead className="bg-[var(--table-header-bg)]">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                TX Hash
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                Chain
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                Block Number
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                From
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                Gas Refunded
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-card-bg divide-y divide-[var(--table-border)]">
                            {evmDeposits.map((deposit) => (
                              <tr
                                key={`${deposit.tx_hash}-${deposit.log_index}`}
                              >
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary font-mono">
                                  <div className="flex items-center space-x-2">
                                    <span>{formatTxHash(deposit.tx_hash)}</span>
                                    <CopyButton
                                      text={deposit.tx_hash}
                                      size="sm"
                                    />
                                    {getChainExplorerUrl(
                                      deposit.chain_id,
                                      deposit.tx_hash
                                    ) && (
                                      <a
                                        href={getChainExplorerUrl(
                                          deposit.chain_id,
                                          deposit.tx_hash
                                        )}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[var(--accent-blue)] hover:text-[var(--accent-blue)]/80 transition-colors"
                                        title="View on chain explorer"
                                      >
                                        <svg
                                          className="w-4 h-4"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                          />
                                        </svg>
                                      </a>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                                  <div className="flex items-center space-x-2">
                                    <span>
                                      {formatChainId(deposit.chain_id)}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                                  {formatBlockNumber(deposit.block_number)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                                  <AddressLink
                                    address={deposit.from_address}
                                    network={NETWORK}
                                    showFull={true}
                                  />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      deposit.gas_refunded
                                        ? "bg-[var(--status-success)]/20 text-[var(--status-success)]"
                                        : "bg-[var(--text-muted)]/20 text-text-muted"
                                    }`}
                                  >
                                    {deposit.gas_refunded ? "Yes" : "No"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </details>
        </div>
      </main>
    </div>
  );
}
