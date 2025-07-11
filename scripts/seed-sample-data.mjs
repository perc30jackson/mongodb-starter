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
        name: 'Regional Headquarters Network',
        productTypes: ['appliance', 'wireless', 'switch'],
        timeZone: 'America/Los_Angeles',
        tags: ['regional'],
        url: 'https://dashboard.meraki.com/n/12345/manage/configure/overview',
        notes: 'Regional headquarters network with all device types',
        selected: false
      },
      {
        id: 'N_987654321',
        organizationId: 'O_123456789',
        name: 'Downtown Garage Network',
        productTypes: ['appliance', 'wireless', 'switch'],
        timeZone: 'America/New_York',
        tags: ['garage'],
        url: 'https://dashboard.meraki.com/n/67890/manage/configure/overview',
        notes: 'Downtown parking garage network',
        selected: false
      },
      {
        id: 'L_567890123',
        organizationId: 'O_123456789',
        name: 'Field Office - Seattle',
        productTypes: ['appliance', 'wireless'],
        timeZone: 'America/Los_Angeles',
        tags: ['field office'],
        url: 'https://dashboard.meraki.com/n/11111/manage/configure/overview',
        notes: 'Seattle field office location',
        selected: false
      },
      {
        id: 'L_345678901',
        organizationId: 'O_123456789',
        name: 'Field Office - Austin',
        productTypes: ['wireless', 'switch'],
        timeZone: 'America/Chicago',
        tags: ['field office'],
        url: 'https://dashboard.meraki.com/n/22222/manage/configure/overview',
        notes: 'Austin field office location',
        selected: false
      },
      {
        id: 'N_456789012',
        organizationId: 'O_123456789',
        name: 'West Coast Regional Hub',
        productTypes: ['appliance', 'wireless', 'switch'],
        timeZone: 'America/Los_Angeles',
        tags: ['regional'],
        url: 'https://dashboard.meraki.com/n/33333/manage/configure/overview',
        notes: 'West coast regional distribution hub',
        selected: false
      },
      {
        id: 'N_678901234',
        organizationId: 'O_123456789',
        name: 'Underground Garage Network',
        productTypes: ['wireless', 'switch'],
        timeZone: 'America/New_York',
        tags: ['garage'],
        url: 'https://dashboard.meraki.com/n/44444/manage/configure/overview',
        notes: 'Underground parking garage facility',
        selected: false
      },
      {
        id: 'L_789012345',
        organizationId: 'O_123456789',
        name: 'Field Office - Denver',
        productTypes: ['appliance', 'wireless'],
        timeZone: 'America/Denver',
        tags: ['field office'],
        url: 'https://dashboard.meraki.com/n/55555/manage/configure/overview',
        notes: 'Denver field office location',
        selected: false
      }
    ];

    // Sample devices data
    const sampleDevices = [
      {
        serial: 'Q2QN-ABCD-EFGH',
        mac: '00:18:0a:12:34:56',
        name: 'Regional HQ MX',
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
        name: 'Regional HQ Switch',
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
        name: 'Regional HQ AP',
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
        name: 'Garage MX',
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
        name: 'Garage AP',
        model: 'MR36',
        networkId: 'N_987654321',
        productType: 'wireless',
        firmware: 'MR 28.7',
        lanIp: '192.168.2.20',
        status: 'online',
        tags: ['wireless']
      },
      {
        serial: 'Q2QT-MNOP-7890',
        mac: '00:18:0a:12:34:61',
        name: 'Seattle Field Office MX',
        model: 'MX65',
        networkId: 'L_567890123',
        productType: 'appliance',
        firmware: 'MX 17.10.2',
        lanIp: '192.168.3.1',
        status: 'online',
        tags: ['security', 'gateway']
      },
      {
        serial: 'Q2QY-QRST-1234',
        mac: '00:18:0a:12:34:62',
        name: 'Austin Field Office AP',
        model: 'MR36',
        networkId: 'L_345678901',
        productType: 'wireless',
        firmware: 'MR 28.7',
        lanIp: '192.168.4.20',
        status: 'online',
        tags: ['wireless']
      },
      {
        serial: 'Q2QU-UVWX-5678',
        mac: '00:18:0a:12:34:63',
        name: 'Denver Field Office MX',
        model: 'MX64',
        networkId: 'L_789012345',
        productType: 'appliance',
        firmware: 'MX 17.10.2',
        lanIp: '192.168.5.1',
        status: 'online',
        tags: ['security', 'gateway']
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
