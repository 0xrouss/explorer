import Link from "next/link";
import { formatAddress } from "@/lib/formatters";

interface AddressLinkProps {
  address: string;
  network?: string; // Keep for backward compatibility but not used
  className?: string;
  showFull?: boolean;
}

export function AddressLink({
  address,
  network,
  className = "",
  showFull = false,
}: AddressLinkProps) {
  const displayAddress = showFull ? address : formatAddress(address);

  return (
    <Link
      href={`/user/${address}`}
      className={`text-[var(--accent-blue)] hover:text-[var(--accent-blue)]/80 hover:underline transition-colors ${className}`}
      title="View signature address profile"
    >
      {displayAddress}
    </Link>
  );
}
