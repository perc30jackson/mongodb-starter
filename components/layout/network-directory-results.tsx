import { NetworkProps } from '@/lib/api/network';
import { useState } from 'react';

export default function NetworkDirectoryResults({
  networks,
  onNetworkSelect,
  selectedNetworkId
}: {
  networks: NetworkProps[];
  onNetworkSelect: (network: NetworkProps) => void;
  selectedNetworkId?: string;
}) {
  const [selectedNetworks, setSelectedNetworks] = useState<Set<string>>(new Set());

  const handleNetworkToggle = async (networkId: string, selected: boolean) => {
    const newSelected = new Set(selectedNetworks);
    if (selected) {
      newSelected.add(networkId);
    } else {
      newSelected.delete(networkId);
    }
    setSelectedNetworks(newSelected);

    // Update the backend
    try {
      await fetch('/api/network/select', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ networkId, selected }),
      });
    } catch (error) {
      console.error('Error updating network selection:', error);
    }
  };

  return (
    <ul className="relative z-0 divide-y divide-border">
      {networks.map((network) => (
        <li key={network.id} className="bg-background">
          <div
            className={`relative px-6 py-5 flex items-center space-x-3 hover:bg-accent focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary cursor-pointer ${
              selectedNetworkId === network.id ? 'bg-accent' : ''
            }`}
            onClick={() => onNetworkSelect(network)}
          >
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {network.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="focus:outline-none">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-bold text-foreground">{network.name}</p>
                <div className="flex items-center mt-1">
                  {network.productTypes.map((type, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary mr-1"
                    >
                      {type}
                    </span>
                  ))}
                </div>
                {network.tags && network.tags.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Tags: {network.tags.join(', ')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex-shrink-0">
              <label htmlFor={`network-${network.id}`} className="sr-only">
                Select network {network.name}
              </label>
              <input
                id={`network-${network.id}`}
                type="checkbox"
                className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                checked={selectedNetworks.has(network.id)}
                onChange={(e) => {
                  e.stopPropagation();
                  handleNetworkToggle(network.id, e.target.checked);
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
