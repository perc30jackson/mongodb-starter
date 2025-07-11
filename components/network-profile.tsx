import { useState } from 'react';
import { NetworkProps } from '@/lib/api/network';
import NetworkDirectory from '@/components/layout/network-directory';
import NetworkDetails from '@/components/network-details';

export default function NetworkProfile({
  results,
  totalNetworks,
  selectedNetwork: initialNetwork
}: {
  results: any[];
  totalNetworks: number;
  selectedNetwork: NetworkProps | null;
}) {
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkProps | null>(initialNetwork);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <NetworkDirectory
          results={results}
          totalNetworks={totalNetworks}
          onNetworkSelect={setSelectedNetwork}
          selectedNetworkId={selectedNetwork?.id}
        />
        <main className="flex-1">
          {selectedNetwork ? (
            <NetworkDetails network={selectedNetwork} />
          ) : (
            <div className="flex items-center justify-center h-screen text-foreground">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">Select a Network</h2>
                <p className="text-muted-foreground">Choose a network from the directory to view details and devices.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
