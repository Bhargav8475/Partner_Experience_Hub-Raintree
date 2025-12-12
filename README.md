# Partner Experience UI

A modern, multi-step partner onboarding application with **real Salesforce integration** built with React, TypeScript, Express.js, and Tailwind CSS.

## Project Structure

```
Partner Experience UI/
├── frontend/             # Frontend React application
│   ├── src/              # Source code
│   ├── public/           # Static assets
│   └── package.json      # Frontend dependencies
├── backend/              # Backend API server
│   ├── src/              # Source code
│   └── package.json      # Backend dependencies
└── README.md             # This file
```

## Features

- **Step 1: Login Screen** - Split-screen design with branding and login form
- **Step 2: CRM Selection** - Interactive connector cards with Salesforce as the primary option
- **Step 3: Dashboard** - Opportunity management with real-time syncing capabilities
- **Backend API** - CRM's REST API integration
- **Dual Sync** - Create opportunities in partner's Salesforce and optionally in Raintree Salesforce

## Tech Stack

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- Lucide React Icons
- Vite (Build Tool)

### Backend
- Node.js / Express.js
- TypeScript
- Salesforce REST API
- Axios for HTTP requests

## Quick Start

### Prerequisites

1. **Node.js** (v18 or higher)
2. **Salesforce Connected App** - You'll need to create one to get OAuth credentials (see Backend Setup)

### Running the Application

You need to run both frontend and backend servers:

**Terminal 1 (Backend):**
```bash
cd backend
npm install
# Create .env file with your credentials (see backend/README.md)
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

## Documentation

- **Frontend**: See `frontend/README.md` for frontend setup and documentation
- **Backend**: See `backend/README.md` for backend setup and API documentation

## Flow Overview

1. **Login** → Enter credentials to proceed
2. **CRM Selection** → Choose Salesforce
3. **Authentication** → Connect Salesforce organization (stores partner credentials and pre-authenticates Raintree)
4. **Dashboard** → Create opportunities that sync to:
   - Partner's Salesforce (always)
   - Raintree Salesforce (when "Sync to Raintree Systems immediately" is enabled)

## Key Features

- ✅ Real Salesforce REST API integration
- ✅ Separated frontend and backend architecture
- ✅ Partner Salesforce credential management
- ✅ Automatic Raintree Salesforce sync
- ✅ Opportunity creation and retrieval
- ✅ Pre-authentication of Raintree Salesforce on partner login
- ✅ Responsive design
- ✅ Professional UI with Salesforce branding

## Important Notes

- **Salesforce Connected App Required**: You must create a Connected App in Raintree's Salesforce org to get OAuth credentials (Client ID and Client Secret)
- **Credentials**: Partner credentials are sent with each request (not stored on server). Raintree credentials are stored in backend environment variables
- **Dual Sync**: When creating an opportunity, it always syncs to the partner's Salesforce. If the "Sync to Raintree Systems immediately" toggle is enabled, it also syncs to Raintree's Salesforce

