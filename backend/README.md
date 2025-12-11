# Partner Experience Backend API

Backend API server for Partner Experience UI with real Salesforce integration.

## Features

- ✅ Real Salesforce REST API integration
- ✅ Partner Salesforce credential management
- ✅ Raintree Salesforce automatic sync
- ✅ Opportunity creation and retrieval
- ✅ TypeScript with Express.js

## Prerequisites

1. **Salesforce Connected App Setup**
   - You need to create a Connected App in **Raintree's Salesforce org** to get Client ID and Client Secret
   - This ONE Connected App works for both partners and Raintree
   - Go to **Setup** → **App Manager** → **New Connected App** in Raintree's Salesforce org
   - Enable OAuth Settings and get the Consumer Key (Client ID) and Consumer Secret (Client Secret)

2. **Node.js** (v18 or higher)

## Setup

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure Environment Variables**
   Create a `.env` file in the `backend` directory:
   ```env
   PORT=3001
   
   # Salesforce OAuth Credentials (from Connected App)
   SALESFORCE_CLIENT_ID=your_client_id_here
   SALESFORCE_CLIENT_SECRET=your_client_secret_here
   
   # Raintree Salesforce Credentials
   RAINTREE_SALESFORCE_EMAIL=bhargav667@agentforce.com
   RAINTREE_SALESFORCE_PASSWORD=dpirj0hyp7
   RAINTREE_SALESFORCE_SECURITY_TOKEN=k7pk2qQxLl221rkFqNEfy7Xp
   
   # Salesforce API Version
   SALESFORCE_API_VERSION=v58.0
   ```

3. **Start the Server**
   ```bash
   npm run dev
   ```

   The server will run on `http://localhost:3001`

## API Endpoints

### POST /api/opportunities
Create an opportunity in partner's Salesforce and optionally in Raintree Salesforce.

**Request Body:**
```json
{
  "opportunity": {
    "Name": "New Opportunity",
    "StageName": "Prospecting",
    "Amount": 50000,
    "CloseDate": "2024-12-31"
  },
  "partnerCredentials": {
    "email": "partner@example.com",
    "password": "password123",
    "securityToken": "security_token_here"
  },
  "syncToRaintree": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Opportunity created successfully",
  "data": {
    "partnerSalesforceId": "006...",
    "raintreeSalesforceId": "006...",
    "errors": []
  }
}
```

### GET /api/opportunities
Get opportunities from partner's Salesforce.

**Query Parameters:**
- `email` - Partner Salesforce email
- `password` - Partner Salesforce password
- `securityToken` - Partner Salesforce security token

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "Id": "006...",
      "Name": "Opportunity Name",
      "StageName": "Prospecting",
      "Amount": 50000,
      "CloseDate": "2024-12-31"
    }
  ]
}
```

## Architecture

```
backend/
├── src/
│   ├── index.ts              # Express server setup
│   ├── routes/
│   │   └── opportunities.ts  # Opportunity API routes
│   ├── services/
│   │   ├── salesforce.ts     # Salesforce REST API service
│   │   └── raintree.ts       # Raintree Salesforce service
│   └── types/
│       └── salesforce.ts     # TypeScript types
├── package.json
├── tsconfig.json
└── .env
```

## How It Works

1. **Partner Authentication**: When a partner provides their Salesforce credentials, the backend authenticates with Salesforce using OAuth 2.0 Username-Password flow.

2. **Opportunity Creation**: 
   - Always creates the opportunity in the partner's Salesforce
   - If `syncToRaintree` is true, also creates it in Raintree's Salesforce using pre-configured credentials

3. **Error Handling**: If Raintree sync fails, the partner opportunity is still created, and the error is returned in the response.

## Development

- **Development Mode**: `npm run dev` (uses tsx for hot reload)
- **Build**: `npm run build` (compiles TypeScript to JavaScript)
- **Production**: `npm start` (runs compiled JavaScript)

## Notes

- The backend uses Salesforce REST API v58.0 by default
- Partner credentials are sent with each request (not stored on the server)
- Raintree credentials are stored in environment variables
- All API calls use proper error handling and validation

