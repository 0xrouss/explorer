"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { IntentTable } from "@/components/IntentTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Pagination } from "@/components/Pagination";
import { CopyButton } from "@/components/CopyButton";
import { formatAddress, formatDate, formatNumber } from "@/lib/formatters";
import type {
  NetworkType,
  DatabaseIntent,
  UserStats,
  ApiResponse,
} from "@/types";

interface UserPageProps {
  params: { address: string };
}

const NETWORK: NetworkType = "FULLY";

export default function UserPage() {
  const params = useParams();
  const router = useRouter();
  const address = params.address as string;

  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [intents, setIntents] = useState<DatabaseIntent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: "20",
        });

        const response = await fetch(`/api/users/${address}?${params}`);

        if (!response.ok) {
          throw new Error("Failed to fetch user data");
        }

        const result: ApiResponse<{
          stats: UserStats;
          intents: DatabaseIntent[];
        }> = await response.json();

        if (result.data) {
          setUserStats(result.data.stats);
          setIntents(result.data.intents);
          if (result.pagination) {
            setTotalPages(result.pagination.totalPages);
            setTotalCount(result.pagination.total);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [address, currentPage]);

  const handleIntentClick = (intentId: number) => {
    router.push(`/intent/${intentId}`);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[var(--accent-blue)] mx-auto"></div>
          <p className="mt-4 text-text-secondary">Loading user data...</p>
        </div>
      </div>
    );
  }

  if (error || !userStats) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-4">
            Signature Address Not Found
          </h1>
          <p className="text-text-secondary mb-4">
            {error || "The requested signature address could not be found."}
          </p>
          <button
            onClick={() => router.push("/")}
            className="bg-[var(--accent-blue)] text-white px-4 py-2 rounded-md hover:bg-[var(--accent-blue)]/80 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

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
                Signature Address Profile
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Overview */}
        <div className="bg-card-bg border border-card-border shadow-lg overflow-hidden sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-text-primary mb-4">
              Signature Address Information
            </h3>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-text-secondary">
                  Signature Address
                </dt>
                <dd className="mt-1 text-sm text-text-primary flex items-center space-x-2">
                  <span className="font-mono">{formatAddress(address)}</span>
                  <CopyButton text={address} size="sm" />
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-text-secondary">
                  Network
                </dt>
                <dd className="mt-1 text-sm text-text-primary">{NETWORK}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-text-secondary">
                  First Intent Date
                </dt>
                <dd className="mt-1 text-sm text-text-primary">
                  {userStats.firstIntentDate
                    ? formatDate(userStats.firstIntentDate)
                    : "N/A"}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-text-secondary">
                  Last Intent Date
                </dt>
                <dd className="mt-1 text-sm text-text-primary">
                  {userStats.lastIntentDate
                    ? formatDate(userStats.lastIntentDate)
                    : "N/A"}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* User Statistics */}
        <div className="bg-card-bg border border-card-border shadow-lg overflow-hidden sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-text-primary mb-4">
              Intent Signing Statistics
            </h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
              <div className="bg-[var(--bg-secondary)] overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-[var(--accent-blue)] rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          T
                        </span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-text-secondary truncate">
                          Total Intents
                        </dt>
                        <dd className="text-lg font-medium text-text-primary">
                          {formatNumber(userStats.totalIntents)}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--bg-secondary)] overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-[var(--status-warning)] rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          P
                        </span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-text-secondary truncate">
                          Pending
                        </dt>
                        <dd className="text-lg font-medium text-text-primary">
                          {formatNumber(userStats.pendingIntents)}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--bg-secondary)] overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-[var(--accent-blue)] rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          D
                        </span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-text-secondary truncate">
                          Deposited
                        </dt>
                        <dd className="text-lg font-medium text-text-primary">
                          {formatNumber(userStats.depositedIntents)}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--bg-secondary)] overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-[var(--status-success)] rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          F
                        </span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-text-secondary truncate">
                          Fulfilled
                        </dt>
                        <dd className="text-lg font-medium text-text-primary">
                          {formatNumber(userStats.fulfilledIntents)}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--bg-secondary)] overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-[var(--status-error)] rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          R
                        </span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-text-secondary truncate">
                          Refunded
                        </dt>
                        <dd className="text-lg font-medium text-text-primary">
                          {formatNumber(userStats.refundedIntents)}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-4">
          <p className="text-sm text-text-secondary">
            Showing {intents.length} of {formatNumber(totalCount)} intents
            signed by this signature address
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
