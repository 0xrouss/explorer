import ConnectButton from "./ConnectButton";

interface HeaderProps {
  networkName?: string;
}

export function Header() {
  return (
    <header className="bg-gradient-to-r from-card-bg to-bg-secondary border-b border-card-border shadow-xl">
      <div className="max-w-7xl mx-auto px-9">
        <div className="flex justify-between items-center pt-2">
          <h1 className="text-xl font-bold text-text-primary">
            Avail Nexus Intent Explorer - Folly
          </h1>
          <div className="pb-2">
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}
