# Partner Experience Backend API

Backend API server for Partner Experience UI with real Salesforce integration.

## Features

- ✅ Salesforce REST API integration
- ✅ Partner Salesforce credential management
- ✅ Raintree Salesforce automatic sync
- ✅ Objects CRUD
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
   RAINTREE_SALESFORCE_EMAIL=<RAINTREE_SALESFORCE_EMAIL>
   RAINTREE_SALESFORCE_PASSWORD=<RAINTREE_SALESFORCE_PASSWORD>
   RAINTREE_SALESFORCE_SECURITY_TOKEN=<RAINTREE_SALESFORCE_SECURITY_TOKEN>
   
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

### PUT /api/opportunities/:id
Update an opportunity in partner's Salesforce and optionally in Raintree Salesforce.

**Request Body:**
```json
{
  "opportunity": {
    "Name": "Updated Opportunity Name",
    "StageName": "Qualification",
    "Amount": 75000,
    "CloseDate": "2024-12-31"
  },
  "partnerCredentials": {
    "email": "partner@example.com",
    "password": "password123",
    "securityToken": "security_token_here"
  },
  "syncToRaintree": true,
  "raintreeOpportunityId": "006..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Opportunity updated successfully",
  "data": {
    "partnerUpdated": true,
    "raintreeUpdated": true,
    "errors": []
  }
}
```

### DELETE /api/opportunities/:id
Delete an opportunity from partner's Salesforce and optionally from Raintree Salesforce.

**Request Body:**
```json
{
  "partnerCredentials": {
    "email": "partner@example.com",
    "password": "password123",
    "securityToken": "security_token_here"
  },
  "syncToRaintree": true,
  "raintreeOpportunityId": "006..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Opportunity deleted successfully",
  "data": {
    "partnerDeleted": true,
    "raintreeDeleted": true,
    "errors": []
  }
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

1. **Partner Authentication**: When a partner provides their Salesforce credentials, the backend authenticates with Salesforce using OAuth 2.0 Username-Password flow. Raintree Salesforce is also pre-authenticated at this time.

2. **Opportunity CRUD Operations**: 
   - **Create**: Always creates in partner's Salesforce. If `syncToRaintree` is true, also creates in Raintree's Salesforce
   - **Read**: Fetches opportunities from partner's Salesforce
   - **Update**: Updates in partner's Salesforce. If `syncToRaintree` is true and `raintreeOpportunityId` is provided, also updates in Raintree's Salesforce
   - **Delete**: Deletes from partner's Salesforce. If `syncToRaintree` is true and `raintreeOpportunityId` is provided, also deletes from Raintree's Salesforce

3. **Bidirectional Sync**: 
   - Changes made in the UI are immediately synced to Salesforce (both Partner and Raintree if enabled)
   - Changes made directly in Salesforce can be viewed by clicking the "Refresh" button in the UI
   - The UI fetches the latest data from Salesforce on refresh

4. **Error Handling**: If Raintree sync fails, the partner operation still succeeds, and the error is returned in the response.

## Development

- **Development Mode**: `npm run dev` (uses tsx for hot reload)
- **Build**: `npm run build` (compiles TypeScript to JavaScript)
- **Production**: `npm start` (runs compiled JavaScript)

## Notes

- The backend uses Salesforce REST API v58.0 by default
- Partner credentials are sent with each request (not stored on the server)
- Raintree credentials are stored in environment variables
- All API calls use proper error handling and validation

