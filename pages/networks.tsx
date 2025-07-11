import { GetStaticProps } from 'next';
import Layout from '@/components/layout';
import NetworkProfile from '@/components/network-profile';
import {
  getAllNetworks,
  NetworkProps,
  getNetworkCount,
  syncNetworksFromMeraki
} from '@/lib/api/network';
import { defaultMetaProps } from '@/components/layout/meta';
import clientPromise from '@/lib/mongodb';

export default function Networks({ 
  results, 
  totalNetworks, 
  selectedNetwork,
  meta
}: { 
  results: any[];
  totalNetworks: number;
  selectedNetwork: NetworkProps | null;
  meta: any;
}) {
  return (
    <Layout meta={meta}>
      <NetworkProfile 
        results={results} 
        totalNetworks={totalNetworks} 
        selectedNetwork={selectedNetwork} 
      />
    </Layout>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  // Initialize default values
  let results: any[] = [];
  let totalNetworks = 0;
  let selectedNetwork: NetworkProps | null = null;

  try {
    await clientPromise;
    
    try {
      // Only sync networks from Meraki API periodically (not on every revalidation)
      // to improve performance. Sync will happen in background via API calls instead.
      if (process.env.MERAKI_API_KEY && Math.random() < 0.1) { // 10% chance to sync
        console.log('Running periodic network sync...');
        await syncNetworksFromMeraki();
      }
    } catch (error) {
      console.log('Could not sync from Meraki API, using cached data');
    }

    try {
      results = await getAllNetworks();
      totalNetworks = await getNetworkCount();
      
      // Get the first network to display
      selectedNetwork = results.length > 0 && results[0].networks && results[0].networks.length > 0 
        ? results[0].networks[0] 
        : null;
    } catch (error) {
      console.log('Could not fetch networks, using empty data');
    }

  } catch (e: any) {
    console.log('MongoDB connection failed, using empty data');
  }

  return {
    props: {
      meta: {
        ...defaultMetaProps,
        title: 'Networks - Cisco Meraki Dashboard',
        description: 'View and manage your Cisco Meraki networks'
      },
      results: results || [],
      totalNetworks: totalNetworks || 0,
      selectedNetwork: selectedNetwork || null
    },
    revalidate: 300 // Revalidate every 5 minutes instead of 1 minute to improve performance
  };
};
