import { NetworkProps } from '@/lib/api/network';
import { Building2, Warehouse, MapPin, Network, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Item, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions, ItemGroup } from '@/components/ui/item';

// Function to determine the appropriate icon based on network tags and ID
function getNetworkIcon(network: NetworkProps) {
  // Check if network ID indicates field office (L followed by numbers)
  if (/^L\d+/.test(network.id)) {
    return Building2;
  }
  
  // Check tags for specific types
  if (network.tags.some(tag => tag.toLowerCase() === 'regional')) {
    return MapPin;
  }
  
  if (network.tags.some(tag => tag.toLowerCase() === 'garage')) {
    return Warehouse;
  }
  
  // Default icon
  return Network;
}

export default function NetworkDirectoryResults({
  networks,
  onNetworkSelect,
  selectedNetworkId
}: {
  networks: NetworkProps[];
  onNetworkSelect: (network: NetworkProps) => void;
  selectedNetworkId?: string;
}) {

  return (
    <ItemGroup className="divide-y">
      {networks.map((network) => {
        const IconComponent = getNetworkIcon(network);
        const isSelected = selectedNetworkId === network.id;
        
        return (
          <Item
            key={network.id}
            variant="outline"
            size="sm"
            asChild
            className={`cursor-pointer ${
              isSelected 
                ? 'bg-color-primary-10' 
                : 'bg-color-background-100 hover:bg-color-background-90'
            }`}
            onClick={() => onNetworkSelect(network)}
          >
            <a href="#" onClick={(e) => e.preventDefault()}>
              <ItemMedia variant="icon" className="bg-color-primary-100">
                <IconComponent className="size-5 text-color-background-100" />
              </ItemMedia>
              <ItemContent>
                <ItemTitle className="text-color-text-100 font-medium">
                  {network.name}
                </ItemTitle>
                <ItemDescription>
                  <div className="flex items-center gap-1 flex-wrap mt-1">
                    {network.productTypes.map((type, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className="text-xs"
                        style={{ 
                          backgroundColor: 'rgba(var(--color-primary-100), 0.2)',
                          color: 'rgb(var(--color-primary-100))'
                        }}
                      >
                        {type}
                      </Badge>
                    ))}
                  </div>
                  {network.tags && network.tags.length > 0 && (
                    <span className="text-xs mt-1 block text-muted-foreground">
                      Tags: {network.tags.join(', ')}
                    </span>
                  )}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <ChevronRight className="size-4 text-muted-foreground" />
              </ItemActions>
            </a>
          </Item>
        );
      })}
    </ItemGroup>
  );
}
