import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

// Load environment variables
dotenv.config({ path: '.env.local' });

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/meraki-dashboard';

async function clearDatabase() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('meraki-dashboard');
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('Found collections:', collections.map(c => c.name));
    
    // Clear each collection
    for (const collection of collections) {
      const result = await db.collection(collection.name).deleteMany({});
      console.log(`Cleared ${collection.name}: ${result.deletedCount} documents deleted`);
    }
    
    console.log('Database cleared successfully!');
    
  } catch (error) {
    console.error('Error clearing database:', error);
  } finally {
    await client.close();
  }
}

clearDatabase();
