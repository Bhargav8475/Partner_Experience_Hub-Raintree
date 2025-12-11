# Partner Experience UI - Frontend

Frontend application for Partner Experience UI built with React, TypeScript, and Tailwind CSS.

## Features

- **Step 1: Login Screen** - Split-screen design with branding and login form
- **Step 2: CRM Selection** - Interactive connector cards with Salesforce as the primary option
- **Step 3: Dashboard** - Opportunity management with real-time syncing capabilities
- **Real-time Sync** - Create opportunities that sync to partner's Salesforce and optionally to Raintree Salesforce

## Tech Stack

- React 18
- TypeScript
- Tailwind CSS
- Lucide React Icons
- Vite (Build Tool)

## Getting Started

### Prerequisites

1. **Node.js** (v18 or higher)
2. **Backend API** - Make sure the backend server is running (see `../backend/README.md`)

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create `.env` file** (optional - defaults to `http://localhost:3001`)
   ```env
   VITE_API_BASE_URL=http://localhost:3001
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── App.tsx           # Main application component
│   ├── main.tsx          # React entry point
│   ├── services/         # API client services
│   ├── components/       # UI components
│   └── lib/              # Utility functions
├── public/               # Static assets
├── index.html            # HTML template
├── package.json          # Dependencies
├── vite.config.ts        # Vite configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── tsconfig.json         # TypeScript configuration
```

## Flow Overview

1. **Login** → Enter credentials to proceed
2. **CRM Selection** → Choose Salesforce (HubSpot & Zoho coming soon)
3. **Authentication** → Connect Salesforce organization (stores partner credentials)
4. **Dashboard** → Create opportunities that sync to:
   - Partner's Salesforce (always)
   - Raintree Salesforce (when "Sync to Raintree Systems immediately" is enabled)

## Key Features

- ✅ Real-time Salesforce integration via backend API
- ✅ Full CRUD operations (Create, Read, Update, Delete) for opportunities
- ✅ Partner Salesforce credential management
- ✅ Automatic Raintree Salesforce sync
- ✅ Bidirectional sync - changes in UI sync to Salesforce, refresh to see Salesforce changes
- ✅ Edit and delete opportunities with Raintree sync support
- ✅ Progress bar showing onboarding steps
- ✅ Salesforce authentication modal with loading states
- ✅ Responsive design
- ✅ Professional UI with Salesforce branding

## API Integration

The frontend communicates with the backend API at `http://localhost:3001` (configurable via `VITE_API_BASE_URL`).

### Endpoints Used

- `POST /api/opportunities` - Create opportunity
- `GET /api/opportunities` - Get opportunities
- `PUT /api/opportunities/:id` - Update opportunity
- `DELETE /api/opportunities/:id` - Delete opportunity
- `POST /api/auth/raintree` - Pre-authenticate Raintree Salesforce

See `../backend/README.md` for detailed API documentation.

## Development

- **Development Mode**: `npm run dev` (runs on `http://localhost:5173`)
- **Build**: `npm run build` (creates production build in `dist/`)
- **Preview**: `npm run preview` (previews production build)

## Notes

- The frontend requires the backend API to be running
- Partner credentials are stored in localStorage for persistence
- Raintree Salesforce is pre-authenticated when partner connects
