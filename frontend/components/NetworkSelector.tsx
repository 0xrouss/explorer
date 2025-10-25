"use client";

import { NETWORKS, NETWORK_CONFIG } from "@/lib/constants";
import type { NetworkSelectorProps } from "@/types";

export function NetworkSelector({
  selectedNetwork,
  onNetworkChange,
}: NetworkSelectorProps) {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium text-gray-700">Network:</span>
      <div className="flex space-x-1">
        {NETWORKS.map((network) => (
          <button
            key={network}
            onClick={() => onNetworkChange(network)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              selectedNetwork === network
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            style={{
              backgroundColor:
                selectedNetwork === network
                  ? NETWORK_CONFIG[network].color
                  : undefined,
            }}
          >
            {network}
          </button>
        ))}
      </div>
    </div>
  );
}
