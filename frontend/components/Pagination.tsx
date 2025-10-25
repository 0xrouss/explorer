import type { PaginationProps } from "@/types";

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  isLoading,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="bg-card-bg border-t border-card-border">
      <div className="flex items-center justify-between px-6 py-6">
        {/* Page Info */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 px-3 py-2 bg-bg-secondary border border-border-primary rounded-lg">
            <div className="w-2 h-2 bg-accent-blue rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-text-primary">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center space-x-1">
          {/* Previous Button */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1 || isLoading}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-text-primary bg-bg-secondary border border-border-primary rounded-lg hover:bg-hover-bg hover:border-border-accent disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span>Previous</span>
          </button>

          {/* Page Numbers */}
          <div className="flex items-center space-x-1 mx-4">
            {getPageNumbers().map((page, index) => (
              <button
                key={index}
                onClick={() => typeof page === "number" && onPageChange(page)}
                disabled={page === "..." || isLoading}
                className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 min-w-[40px] ${
                  page === currentPage
                    ? "bg-accent-blue text-white shadow-lg transform scale-110 border-2 border-accent-blue ring-2 ring-accent-blue/30"
                    : page === "..."
                    ? "text-text-muted cursor-default bg-bg-tertiary"
                    : "text-text-primary hover:bg-hover-bg hover:text-accent-blue bg-bg-secondary border border-border-primary"
                }`}
              >
                {page}
                {page === currentPage && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-accent-blue rounded-full"></div>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Next Button */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || isLoading}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-text-primary bg-bg-secondary border border-border-primary rounded-lg hover:bg-hover-bg hover:border-border-accent disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
          >
            <span>Next</span>
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
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
