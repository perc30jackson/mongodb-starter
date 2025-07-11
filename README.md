# Cisco Meraki Network Manager

A modern Cisco Meraki network management dashboard built with Next.js, MongoDB, and shadcn/ui components.

## Features

- **Network Directory**: Browse and search your Meraki networks
- **Device Management**: View, control, and monitor network devices  
- **Firewall Management**: Dedicated firewall configuration and monitoring
- **Switch Management**: Switch port configuration and VLAN management
- **Bulk Operations**: Select multiple networks/devices for batch operations
- **Meraki API Integration**: Real-time data sync with Cisco Meraki Dashboard
- **Network Analytics**: View clients, traffic, and network statistics
- **Device Controls**: Blink LEDs, reboot devices, check status
- **Auto Sync**: Automatically sync data from Meraki API

## Prerequisites

1. **MongoDB**: Local MongoDB instance running on `mongodb://localhost:27017`
2. **Meraki API Key**: Generate from your Meraki Dashboard (Organization > Settings > Dashboard API access)
3. **Node.js**: Version 16 or higher

## Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd mongodb-starter
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required environment variables:
- `MONGODB_URI`: Your local MongoDB connection string (default: `mongodb://localhost:27017/meraki-dashboard`)
- `MERAKI_API_KEY`: Your Cisco Meraki API key

### 3. Start MongoDB

Make sure MongoDB is running locally:

```bash
# On Windows (if MongoDB is installed as a service)
net start MongoDB

# On macOS/Linux
mongod

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 4. Sync Meraki Data

Initial sync of your Meraki networks:

```bash
npm run sync-meraki
```

### 5. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Tech Stack

- **Frontend**: [Next.js](https://nextjs.org/), [React](https://reactjs.org/), [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/)
- **Backend**: [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- **Database**: [MongoDB](https://www.mongodb.com/)
- **API Integration**: [Cisco Meraki API](https://developer.cisco.com/meraki/api-v1/)
- **HTTP Client**: [Axios](https://axios-http.com/)

## License

MIT License - feel free to use this project for your own Meraki network management needs.
