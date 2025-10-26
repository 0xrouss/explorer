"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SearchBar } from "@/components/SearchBar";
import { IntentTable } from "@/components/IntentTable";
import { Pagination } from "@/components/Pagination";
import { StatusBadge } from "@/components/StatusBadge";
import { Header } from "@/components/Header";
import { formatNumber } from "@/lib/formatters";
import type {
  NetworkType,
  DatabaseIntent,
  IntentStatus,
  ApiResponse,
} from "@/types";

const NETWORK: NetworkType = "FULLY";

export default function HomePage() {
  const router = useRouter();
  const [intents, setIntents] = useState<DatabaseIntent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<IntentStatus | "all">(
    "all"
  );
  const [networkStats, setNetworkStats] = useState<any>(null);

  const fetchIntents = async (
    network: NetworkType,
    page: number = 1,
    status: string = "all",
    search?: string
  ) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        status,
      });

      if (search) {
        params.append("search", search);
      }

      const response = await fetch(`/api/intents?${params}`);
      const data: ApiResponse<DatabaseIntent[]> = await response.json();

      if (data.data) {
        setIntents(data.data);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages);
          setTotalCount(data.pagination.total);
        }
      }
    } catch (error) {
      console.error("Failed to fetch intents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNetworkStats = async () => {
    try {
      const response = await fetch(`/api/stats`);
      const data = await response.json();
      setNetworkStats(data.data);
    } catch (error) {
      console.error("Failed to fetch network stats:", error);
    }
  };

  useEffect(() => {
    fetchIntents(NETWORK, currentPage, selectedStatus, searchQuery);
    fetchNetworkStats();
  }, [currentPage, selectedStatus, searchQuery]);

  const handleStatusChange = (status: IntentStatus | "all") => {
    setSelectedStatus(status);
    setCurrentPage(1);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleIntentClick = (intentId: number) => {
    router.push(`/intent/${intentId}`);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const statusOptions: (IntentStatus | "all")[] = [
    "all",
    "pending",
    "deposited",
    "fulfilled",
    "refunded",
    "failed",
  ];
  const statusLabels = {
    all: "All",
    pending: "Pending",
    deposited: "Deposited",
    fulfilled: "Fulfilled",
    refunded: "Refunded",
    failed: "Failed",
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Network Stats */}
        {networkStats && (
          <div className="mb-8">
            <div className="bg-card-bg border border-card-border shadow-lg rounded-lg overflow-hidden">
              <div className="px-6 py-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-text-primary">
                    Network Statistics
                  </h3>
                  <div className="h-1 w-12 bg-gradient-to-r from-accent-blue to-accent-purple rounded-full"></div>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Total Intents */}
                  <div className="bg-bg-secondary border border-card-border rounded-lg p-6 hover:shadow-md transition-all duration-200 hover:border-accent-blue/30">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-accent-blue to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                          <svg
                            className="w-6 h-6 text-white"
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
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-secondary mb-1">
                          Total Intents
                        </p>
                        <p className="text-2xl font-bold text-text-primary">
                          {formatNumber(networkStats.totalIntents)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Unique Users */}
                  <div className="bg-bg-secondary border border-card-border rounded-lg p-6 hover:shadow-md transition-all duration-200 hover:border-accent-green/30">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-accent-green to-green-600 rounded-lg flex items-center justify-center shadow-lg">
                          <svg
                            className="w-6 h-6 text-white"
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
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-secondary mb-1">
                          Unique Users
                        </p>
                        <p className="text-2xl font-bold text-text-primary">
                          {formatNumber(networkStats.uniqueUsers)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Total Fills */}
                  <div className="bg-bg-secondary border border-card-border rounded-lg p-6 hover:shadow-md transition-all duration-200 hover:border-accent-purple/30">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-accent-purple to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                          <svg
                            className="w-6 h-6 text-white"
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
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-secondary mb-1">
                          Total Fills
                        </p>
                        <p className="text-2xl font-bold text-text-primary">
                          {formatNumber(networkStats.totalFills || 0)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Total Deposits */}
                  <div className="bg-bg-secondary border border-card-border rounded-lg p-6 hover:shadow-md transition-all duration-200 hover:border-accent-yellow/30">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-accent-yellow to-yellow-600 rounded-lg flex items-center justify-center shadow-lg">
                          <svg
                            className="w-6 h-6 text-white"
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
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-secondary mb-1">
                          Total Deposits
                        </p>
                        <p className="text-2xl font-bold text-text-primary">
                          {formatNumber(networkStats.totalDeposits || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="bg-card-bg shadow rounded-lg p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="flex-1 max-w-md">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onSearch={handleSearch}
                  placeholder="Search by Intent ID or Signature Address..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-text-primary">
                  Status:
                </span>
                <div className="flex gap-1.5">
                  {statusOptions.map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className="rounded-md text-sm font-medium text-white transition-colors"
                      style={
                        selectedStatus === status
                          ? {
                              backgroundColor: "#1f6feb",
                              padding: "10px 20px",
                            }
                          : {
                              backgroundColor: "#30363d",
                              padding: "10px 20px",
                            }
                      }
                    >
                      {statusLabels[status]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-4">
          <p className="text-sm text-text-secondary">
            Showing {intents.length} of {formatNumber(totalCount)} intents
          </p>
        </div>

        {/* Intents Table */}
        <IntentTable
          intents={intents}
          isLoading={isLoading}
          onIntentClick={handleIntentClick}
          network={NETWORK}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            isLoading={isLoading}
          />
        )}
      </main>
    </div>
  );
}
