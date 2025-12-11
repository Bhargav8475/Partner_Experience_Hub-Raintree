import { Router, Request, Response } from 'express'
import { RaintreeSalesforceService } from '../services/raintree.js'

const router = Router()

/**
 * POST /api/auth/raintree
 * Pre-authenticate Raintree Salesforce (called when partner authenticates)
 */
router.post('/raintree', async (req: Request, res: Response) => {
  try {
    console.log('🔐 Pre-authenticating Raintree Salesforce...')
    
    // Authenticate Raintree using OAuth Username-Password flow
    await RaintreeSalesforceService.authenticate()
    
    res.json({
      success: true,
      message: 'Raintree Salesforce authenticated successfully'
    })
  } catch (error: any) {
    console.error('❌ Failed to pre-authenticate Raintree Salesforce:', error.message)
    res.status(500).json({
      error: 'Failed to authenticate Raintree Salesforce',
      message: error.message
    })
  }
})

/**
 * GET /api/auth/raintree/status
 * Check if Raintree Salesforce is authenticated
 */
router.get('/raintree/status', async (req: Request, res: Response) => {
  try {
    // Try to get the service (will authenticate if not already authenticated)
    const service = await RaintreeSalesforceService['getService']()
    
    res.json({
      success: true,
      authenticated: true,
      message: 'Raintree Salesforce is authenticated'
    })
  } catch (error: any) {
    res.json({
      success: false,
      authenticated: false,
      message: error.message
    })
  }
})

export default router

