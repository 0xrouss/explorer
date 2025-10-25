import { StatusBadge } from "./StatusBadge";
import { AddressLink } from "./AddressLink";
import {
  formatDate,
  formatBlockNumber,
  formatAddress,
  formatChainId,
  formatTokenAddressDisplay,
  formatTokenValueByAddress,
} from "@/lib/formatters";
import { getTokenSymbol } from "@/lib/config/tokens";
import type { IntentTableProps, NetworkType } from "@/types";

export function IntentTable({
  intents,
  isLoading = false,
  onIntentClick,
  network,
}: IntentTableProps & {
  onIntentClick?: (intentId: number) => void;
  network?: NetworkType;
}) {
  if (isLoading) {
    return (
      <div className="bg-card-bg border border-card-border shadow-lg overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-bg-tertiary rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (intents.length === 0) {
    return (
      <div className="bg-card-bg border border-card-border shadow-lg overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6 text-center">
          <p className="text-text-secondary">No intents found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card-bg border border-card-border shadow-lg overflow-hidden sm:rounded-lg">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-table-border">
          <thead className="bg-table-header-bg">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Intent
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Source Chains
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Source Amounts
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Destination Chain
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Destination Amounts
              </th>
            </tr>
          </thead>
          <tbody className="bg-card-bg divide-y divide-table-border">
            {intents.map((intent) => (
              <tr
                key={intent.id}
                className="hover:bg-table-row-hover cursor-pointer transition-colors duration-150"
                onClick={() => onIntentClick?.(intent.id)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                  <span>{intent.id}</span>
                </td>
                <td
                  className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary"
                  onClick={(e) => e.stopPropagation()}
                >
                  {intent.signature_address ? (
                    network ? (
                      <AddressLink
                        address={intent.signature_address}
                        network={network}
                        showFull={true}
                      />
                    ) : (
                      <span className="font-mono">
                        {intent.signature_address}
                      </span>
                    )
                  ) : (
                    <span className="text-text-muted">No signature</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={intent.status || "pending"} size="sm" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                  {intent.sources && intent.sources.length > 0 ? (
                    <div className="space-y-1">
                      {intent.sources.map((source, index) => (
                        <div key={index} className="flex items-center">
                          <span>{formatChainId(source.chain_id)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-text-muted">No sources</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                  {intent.sources && intent.sources.length > 0 ? (
                    <div className="space-y-1">
                      {intent.sources.map((source, index) => {
                        const amount = formatTokenValueByAddress(
                          source.value,
                          source.chain_id,
                          source.token_address
                        );
                        const symbol = getTokenSymbol(
                          source.chain_id,
                          source.token_address
                        );
                        const displayText = `${amount} ${symbol}`;
                        const truncatedText =
                          displayText.length > 10
                            ? `${amount.substring(
                                0,
                                10 - symbol.length - 1
                              )} ${symbol}`
                            : displayText;
                        return (
                          <div key={index} className="flex items-center">
                            <span className="font-medium" title={displayText}>
                              {truncatedText}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-text-muted">No sources</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                  <div className="flex items-center">
                    <span>{formatChainId(intent.destination_chain_id)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                  {intent.destinations && intent.destinations.length > 0 ? (
                    <div className="space-y-1">
                      {intent.destinations
                        .filter((destination) => {
                          // Check if there's a gas refunded event
                          const hasGasRefunded = intent.evmDeposits?.some(
                            (deposit) => deposit.gas_refunded
                          );

                          // If gas refunded and this is Ether (0x0000000000000000000000000000000000000000), hide it
                          if (
                            hasGasRefunded &&
                            destination.token_address ===
                              "0x0000000000000000000000000000000000000000"
                          ) {
                            return false;
                          }

                          return true;
                        })
                        .map((destination, index) => {
                          const amount = formatTokenValueByAddress(
                            destination.value,
                            intent.destination_chain_id,
                            destination.token_address
                          );
                          const symbol = getTokenSymbol(
                            intent.destination_chain_id,
                            destination.token_address
                          );
                          const displayText = `${amount} ${symbol}`;
                          const truncatedText =
                            displayText.length > 10
                              ? `${amount.substring(
                                  0,
                                  10 - symbol.length - 1
                                )} ${symbol}`
                              : displayText;
                          return (
                            <div key={index} className="flex items-center">
                              <span className="font-medium" title={displayText}>
                                {truncatedText}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <span className="text-text-muted">No destinations</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
