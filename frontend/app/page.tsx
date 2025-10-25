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
      <Header networkName="FULLY Network" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Network Stats */}
        {networkStats && (
          <div className="mb-8">
            <div className="bg-card-bg overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-text-primary mb-4">
                  Network Statistics
                </h3>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="bg-bg-secondary overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-accent-blue rounded-md flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              I
                            </span>
                          </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-text-secondary truncate">
                              Total Intents
                            </dt>
                            <dd className="text-lg font-medium text-text-primary">
                              {formatNumber(networkStats.totalIntents)}
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-bg-secondary overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              U
                            </span>
                          </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-text-secondary truncate">
                              Unique Users
                            </dt>
                            <dd className="text-lg font-medium text-text-primary">
                              {formatNumber(networkStats.uniqueUsers)}
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-bg-secondary overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              F
                            </span>
                          </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-text-secondary truncate">
                              Total Fills
                            </dt>
                            <dd className="text-lg font-medium text-text-primary">
                              {formatNumber(networkStats.totalFills || 0)}
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-bg-secondary overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              D
                            </span>
                          </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-text-secondary truncate">
                              Total Deposits
                            </dt>
                            <dd className="text-lg font-medium text-text-primary">
                              {formatNumber(networkStats.totalDeposits || 0)}
                            </dd>
                          </dl>
                        </div>
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
