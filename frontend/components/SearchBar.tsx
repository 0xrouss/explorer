"use client";

import { useState } from "react";
import type { SearchBarProps } from "@/types";

export function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = "Search by Intent ID or Signature Address...",
}: SearchBarProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;

    setIsLoading(true);
    try {
      await onSearch(value.trim());
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-accent-blue focus:border-transparent bg-bg-secondary text-text-primary placeholder-text-muted"
        />
        <button
          type="submit"
          disabled={isLoading || !value.trim()}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 bg-accent-blue text-white rounded-md hover:bg-accent-blue/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? "..." : "Search"}
        </button>
      </div>
    </form>
  );
}
