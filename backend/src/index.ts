import express, { Express, Request, Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import opportunitiesRouter from './routes/opportunities.js'
import leadsRouter from './routes/leads.js'
import authRouter from './routes/auth.js'
import syncRouter from './routes/sync.js'

// Load environment variables
dotenv.config()

// Validate required environment variables on startup
const requiredEnvVars = [
  'SALESFORCE_CLIENT_ID',
  'SALESFORCE_CLIENT_SECRET',
  'RAINTREE_SALESFORCE_EMAIL',
  'RAINTREE_SALESFORCE_PASSWORD',
  'RAINTREE_SALESFORCE_SECURITY_TOKEN'
]

const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:')
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`)
  })
  console.error('\n📖 Please create a .env file in the backend directory with these variables.')
  console.error('   See backend/README.md for detailed instructions.\n')
  
  if (missingVars.includes('SALESFORCE_CLIENT_ID') || missingVars.includes('SALESFORCE_CLIENT_SECRET')) {
    console.error('⚠️  IMPORTANT: You need to create a Salesforce Connected App to get CLIENT_ID and CLIENT_SECRET.')
    console.error('   See backend/README.md for step-by-step instructions.\n')
  }
  
  process.exit(1)
}

console.log('✅ All required environment variables are set')

const app: Express = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Partner Experience Backend API is running' })
})

// API Routes
app.use('/api/opportunities', opportunitiesRouter)
app.use('/api/leads', leadsRouter)
app.use('/api/auth', authRouter)
app.use('/api/sync', syncRouter)

// Debug endpoint to test Raintree Salesforce connection
app.get('/api/debug/raintree', async (req: Request, res: Response) => {
  try {
    const { RaintreeSalesforceService } = await import('./services/raintree.js')
    
    // Check if credentials are set
    const email = process.env.RAINTREE_SALESFORCE_EMAIL
    const password = process.env.RAINTREE_SALESFORCE_PASSWORD
    const token = process.env.RAINTREE_SALESFORCE_SECURITY_TOKEN
    
    if (!email || !password || !token) {
      return res.status(400).json({
        error: 'Raintree credentials not configured',
        missing: {
          email: !email,
          password: !password,
          securityToken: !token
        }
      })
    }
    
    // Test connection
    const result = await RaintreeSalesforceService.testConnection()
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        credentialsConfigured: true
      })
    } else {
      res.status(500).json({
        error: result.message,
        credentialsConfigured: true
      })
    }
  } catch (error: any) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
})

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', err)
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  })
})

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`)
  console.log(`📋 Health check: http://localhost:${PORT}/health`)
  console.log(`📊 API endpoints:`)
  console.log(`   POST   /api/opportunities - Create opportunity`)
  console.log(`   GET    /api/opportunities - Get opportunities`)
  console.log(`   PUT    /api/opportunities/:id - Update opportunity`)
  console.log(`   DELETE /api/opportunities/:id - Delete opportunity`)
  console.log(`   POST   /api/leads - Create lead`)
  console.log(`   GET    /api/leads - Get leads`)
  console.log(`   PUT    /api/leads/:id - Update lead`)
  console.log(`   DELETE /api/leads/:id - Delete lead`)
  console.log(`   POST   /api/auth/raintree - Pre-authenticate Raintree Salesforce`)
  console.log(`   GET    /api/auth/raintree/status - Check Raintree authentication status`)
  console.log(`   POST   /api/sync/detect-changes - Bi-directional sync detection`)
  console.log(`   GET    /api/sync/status - Get sync status`)
  console.log(`   GET    /api/debug/raintree - Test Raintree Salesforce connection`)
})

