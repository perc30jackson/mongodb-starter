import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import axios from 'axios';

// Load environment variables
dotenv.config({ path: '.env.local' });

const MERAKI_BASE_URL = 'https://api.meraki.com/api/v1';
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/meraki-dashboard';

async function syncNetworksFromMeraki() {
  const apiKey = process.env.MERAKI_API_KEY;
  
  if (!apiKey) {
    throw new Error('MERAKI_API_KEY environment variable is required');
  }

  const axiosInstance = axios.create({
    baseURL: MERAKI_BASE_URL,
    headers: {
      'X-Cisco-Meraki-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  try {
    // Get organizations
    console.log('Fetching organizations...');
    const orgsResponse = await axiosInstance.get('/organizations');
    const organizations = orgsResponse.data;
    
    console.log(`Found ${organizations.length} organizations`);

    const client = new MongoClient(uri);
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('meraki-dashboard');
    const networksCollection = db.collection('networks');
    
    let totalNetworks = 0;

    for (const org of organizations) {
      console.log(`Processing organization: ${org.name}`);
      
      try {
        const networksResponse = await axiosInstance.get(`/organizations/${org.id}/networks`);
        const networks = networksResponse.data;
        
        console.log(`  Found ${networks.length} networks`);
        
        for (const network of networks) {
          await networksCollection.updateOne(
            { id: network.id },
            { $set: { ...network, organizationId: org.id } },
            { upsert: true }
          );
        }
        
        totalNetworks += networks.length;
      } catch (error) {
        console.error(`Error fetching networks for org ${org.name}:`, error.message);
      }
    }
    
    await client.close();
    console.log(`✓ Sync complete! Processed ${totalNetworks} networks from ${organizations.length} organizations.`);
    
  } catch (error) {
    console.error('❌ Error syncing networks from Meraki:', error.message);
    throw error;
  }
}

async function syncData() {
  try {
    console.log('Starting Meraki data sync...');
    await syncNetworksFromMeraki();
  } catch (error) {
    console.error('❌ Error syncing Meraki data:', error);
    process.exit(1);
  }
}

syncData();
