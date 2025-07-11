import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

// Load environment variables
dotenv.config({ path: '.env.local' });

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/meraki-dashboard';

async function seedSampleData() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('meraki-dashboard');
    
    // Sample networks data
    const sampleNetworks = [
      {
        id: 'N_123456789',
        organizationId: 'O_123456789',
        name: 'Main Office Network',
        productTypes: ['appliance', 'wireless', 'switch'],
        timeZone: 'America/Los_Angeles',
        tags: ['main', 'office', 'critical'],
        url: 'https://dashboard.meraki.com/n/12345/manage/configure/overview',
        notes: 'Primary office network with all device types',
        selected: false
      },
      {
        id: 'N_987654321',
        organizationId: 'O_123456789',
        name: 'Branch Office East',
        productTypes: ['appliance', 'wireless'],
        timeZone: 'America/New_York',
        tags: ['branch', 'east', 'remote'],
        url: 'https://dashboard.meraki.com/n/67890/manage/configure/overview',
        notes: 'East coast branch office',
        selected: false
      },
      {
        id: 'N_567890123',
        organizationId: 'O_123456789',
        name: 'Warehouse Network',
        productTypes: ['switch', 'wireless'],
        timeZone: 'America/Chicago',
        tags: ['warehouse', 'industrial'],
        url: 'https://dashboard.meraki.com/n/11111/manage/configure/overview',
        notes: 'Warehouse and distribution center',
        selected: false
      },
      {
        id: 'N_345678901',
        organizationId: 'O_123456789',
        name: 'Guest Network',
        productTypes: ['wireless'],
        timeZone: 'America/Los_Angeles',
        tags: ['guest', 'public'],
        url: 'https://dashboard.meraki.com/n/22222/manage/configure/overview',
        notes: 'Public guest access network',
        selected: false
      }
    ];

    // Sample devices data
    const sampleDevices = [
      {
        serial: 'Q2QN-ABCD-EFGH',
        mac: '00:18:0a:12:34:56',
        name: 'Main Office MX',
        model: 'MX75',
        networkId: 'N_123456789',
        productType: 'appliance',
        firmware: 'MX 17.10.2',
        lanIp: '192.168.1.1',
        status: 'online',
        tags: ['security', 'gateway']
      },
      {
        serial: 'Q2QD-WXYZ-1234',
        mac: '00:18:0a:12:34:57',
        name: 'Main Office Switch',
        model: 'MS220-24',
        networkId: 'N_123456789',
        productType: 'switch',
        firmware: 'MS 14.33',
        lanIp: '192.168.1.10',
        status: 'online',
        tags: ['switch', 'poe']
      },
      {
        serial: 'Q2QW-ABCD-5678',
        mac: '00:18:0a:12:34:58',
        name: 'Main Office AP',
        model: 'MR56',
        networkId: 'N_123456789',
        productType: 'wireless',
        firmware: 'MR 28.7',
        lanIp: '192.168.1.20',
        status: 'online',
        tags: ['wireless', 'wifi6']
      },
      {
        serial: 'Q2QE-EFGH-9012',
        mac: '00:18:0a:12:34:59',
        name: 'Branch Office MX',
        model: 'MX65',
        networkId: 'N_987654321',
        productType: 'appliance',
        firmware: 'MX 17.10.2',
        lanIp: '192.168.2.1',
        status: 'online',
        tags: ['security', 'gateway']
      },
      {
        serial: 'Q2QR-IJKL-3456',
        mac: '00:18:0a:12:34:60',
        name: 'Branch Office AP',
        model: 'MR36',
        networkId: 'N_987654321',
        productType: 'wireless',
        firmware: 'MR 28.7',
        lanIp: '192.168.2.20',
        status: 'offline',
        tags: ['wireless']
      }
    ];

    // Insert sample data
    await db.collection('networks').deleteMany({}); // Clear existing data
    await db.collection('devices').deleteMany({});

    await db.collection('networks').insertMany(sampleNetworks);
    await db.collection('devices').insertMany(sampleDevices);

    console.log('✓ Sample data inserted successfully!');
    console.log(`Inserted ${sampleNetworks.length} networks and ${sampleDevices.length} devices`);
    
  } catch (error) {
    console.error('❌ Error seeding sample data:', error);
  } finally {
    await client.close();
  }
}

seedSampleData();
