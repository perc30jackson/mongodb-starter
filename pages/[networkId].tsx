import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { getNetwork } from '@/lib/api/network';
import Layout from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Network, Wifi, Router, Shield, Loader2 } from 'lucide-react';

interface NetworkPageProps {
  network: any;
  redirectTo?: string;
}

export default function NetworkPage({ network, redirectTo }: NetworkPageProps) {
  const router = useRouter();

  useEffect(() => {
    if (redirectTo) {
      router.replace(redirectTo);
    }
  }, [router, redirectTo]);

  if (redirectTo) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Loading Network</h2>
              <p className="text-muted-foreground">
                Redirecting to {network?.name || 'network'} dashboard...
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!network) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <Network className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Network Not Found</h2>
              <p className="text-muted-foreground">
                The requested network could not be found.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Network className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">{network.name}</h2>
            <p className="text-muted-foreground mb-4">
              Product Types: {network.productTypes?.join(', ') || 'Unknown'}
            </p>
            <p className="text-sm text-muted-foreground">
              This network has multiple product types. Please use the specific product dashboards.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const networkId = context.params?.networkId as string;

  if (!networkId) {
    return {
      notFound: true,
    };
  }

  try {
    const network = await getNetwork(networkId);

    if (!network) {
      return {
        notFound: true,
      };
    }

    // Determine the best redirect based on product types
    const productTypes = network.productTypes || [];
    
    // Priority order: wireless > switch > appliance (firewall)
    if (productTypes.includes('wireless')) {
      return {
        props: {
          network,
          redirectTo: `/wireless/${networkId}`
        }
      };
    } else if (productTypes.includes('switch')) {
      return {
        props: {
          network,
          redirectTo: `/switch/${networkId}`
        }
      };
    } else if (productTypes.includes('appliance')) {
      return {
        props: {
          network,
          redirectTo: `/firewall/${networkId}`
        }
      };
    }

    // If no specific product type matches, show a general page
    return {
      props: {
        network
      }
    };

  } catch (error) {
    console.error('Error fetching network:', error);
    return {
      notFound: true,
    };
  }
};
