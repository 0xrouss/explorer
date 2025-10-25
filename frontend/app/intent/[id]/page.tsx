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
                          <span className="text-xs text-text-muted bg-[var(--bg-tertiary)] px-2 py-1 rounded">
                            {source.universe}
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
                  <span className="w-2 h-2 bg-[var(--status-success)] rounded-full mr-2"></span>
                  Destination Chain
                </h4>
                <div className="space-y-2">
                  <div className="bg-[var(--bg-tertiary)] rounded p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-text-primary">
                        {formatChainId(intent.destination_chain_id)}
                      </span>
                      <span className="text-xs text-text-muted bg-[var(--bg-tertiary)] px-2 py-1 rounded">
                        {intent.destination_universe}
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border-primary">
              <div className="text-center">
                <div className="text-sm text-text-secondary mb-1">
                  Intent ID
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-lg font-medium text-text-primary">
                    #{intent.id}
                  </span>
                  <CopyButton text={intent.id.toString()} size="sm" />
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-text-secondary mb-1">User</div>
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-sm text-text-primary font-mono">
                    {formatAddress(intent.user_address)}
                  </span>
                  <CopyButton text={intent.user_address} size="sm" />
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-text-secondary mb-1">Created</div>
                <div className="text-sm text-text-primary">
                  {formatDate(intent.created_at)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-text-secondary mb-1">Expires</div>
                <div className="text-sm text-text-primary">
                  {formatExpiryTime(intent.expiry)}
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
            <summary className="px-4 py-5 sm:p-6 cursor-pointer hover:bg-[var(--hover-bg)] transition-colors">
              <div className="flex items-center justify-between">
                <h3 className="text-lg leading-6 font-medium text-text-primary">
                  Technical Details
                </h3>
                <div className="flex items-center space-x-4 text-sm text-text-secondary">
                  <span>{signatures.length} signatures</span>
                  <span>•</span>
                  <span>
                    {evmFills.length + evmDeposits.length} transactions
                  </span>
                  <svg
                    className="w-5 h-5 transform group-open:rotate-180 transition-transform"
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

            <div className="px-4 py-5 sm:p-6 border-t border-border-primary">
              {/* Signatures */}
              <div className="mb-8">
                <h4 className="text-md font-medium text-text-primary mb-4">
                  Signatures ({signatures.length})
                </h4>
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
                  <h4 className="text-md font-medium text-text-primary mb-4">
                    EVM Transactions
                  </h4>

                  {/* EVM Fill Events */}
                  {evmFills.length > 0 && (
                    <div className="mb-8">
                      <h4 className="text-md font-medium text-text-primary mb-4">
                        Fill Events ({evmFills.length})
                      </h4>
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
                              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                Created
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
                                    <span className="text-text-muted text-xs">
                                      ({fill.chain_id})
                                    </span>
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
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary font-mono">
                                  {formatAddress(fill.from_address)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                                  {formatDate(fill.created_at)}
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
                      <h4 className="text-md font-medium text-text-primary mb-4">
                        Deposit Events ({evmDeposits.length})
                      </h4>
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
                              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                Created
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
                                    <span className="text-text-muted text-xs">
                                      ({deposit.chain_id})
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                                  {formatBlockNumber(deposit.block_number)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary font-mono">
                                  {formatAddress(deposit.from_address)}
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
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                                  {formatDate(deposit.created_at)}
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
