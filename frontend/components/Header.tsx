interface HeaderProps {
  networkName?: string;
}

export function Header({ networkName = "FULLY Network" }: HeaderProps) {
  return (
    <header className="bg-gradient-to-r from-card-bg to-bg-secondary border-b border-card-border shadow-xl">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <h1 className="text-2xl font-bold text-text-primary">
            Avail Nexus Intent Explorer
          </h1>
          <span className="px-3 py-1.5 bg-blue-100 text-blue-800 border border-blue-200 rounded-full text-sm font-medium">
            {networkName}
          </span>
        </div>
      </div>
    </header>
  );
}
