import { Router, Request, Response } from 'express'
import { SalesforceService } from '../services/salesforce.js'
import { RaintreeSalesforceService } from '../services/raintree.js'
import { CreateOpportunityRequest, OpportunityData } from '../types/salesforce.js'

const router = Router()

/**
 * POST /api/opportunities
 * Create an opportunity in partner's Salesforce and optionally in Raintree Salesforce
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { opportunity, partnerCredentials, syncToRaintree }: CreateOpportunityRequest = req.body

    // Validate request
    if (!opportunity || !partnerCredentials) {
      return res.status(400).json({
        error: 'Missing required fields: opportunity and partnerCredentials are required'
      })
    }

    if (!opportunity.Name || !opportunity.StageName || !opportunity.CloseDate) {
      return res.status(400).json({
        error: 'Missing required opportunity fields: Name, StageName, and CloseDate are required'
      })
    }

    if (!partnerCredentials.email || !partnerCredentials.password || !partnerCredentials.securityToken) {
      return res.status(400).json({
        error: 'Missing required partner credentials: email, password, and securityToken are required'
      })
    }

    const results: {
      partnerSalesforceId?: string
      raintreeSalesforceId?: string
      errors?: string[]
    } = {}

    // Create opportunity in partner's Salesforce
    try {
      const partnerService = await SalesforceService.createWithCredentials(partnerCredentials)
      results.partnerSalesforceId = await partnerService.createOpportunity(opportunity)
    } catch (error: any) {
      return res.status(500).json({
        error: `Failed to create opportunity in partner Salesforce: ${error.message}`,
        details: error.message
      })
    }

    // If sync to Raintree is enabled, create in Raintree Salesforce as well
    if (syncToRaintree) {
      console.log('🔄 Syncing opportunity to Raintree Salesforce...')
      try {
        results.raintreeSalesforceId = await RaintreeSalesforceService.createOpportunity(opportunity)
        console.log('✅ Successfully synced to Raintree Salesforce:', results.raintreeSalesforceId)
      } catch (error: any) {
        // Log error but don't fail the entire request
        console.error('❌ Raintree sync failed:', error.message)
        console.error('Full error:', error)
        results.errors = results.errors || []
        results.errors.push(`Raintree sync failed: ${error.message}`)
      }
    } else {
      console.log('ℹ️  Raintree sync not enabled (syncToRaintree = false)')
    }

    res.status(201).json({
      success: true,
      message: 'Opportunity created successfully',
      data: results
    })
  } catch (error: any) {
    console.error('Error creating opportunity:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
})

/**
 * GET /api/opportunities
 * Get opportunities from partner's Salesforce
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { email, password, securityToken } = req.query

    if (!email || !password || !securityToken) {
      return res.status(400).json({
        error: 'Missing required query parameters: email, password, and securityToken are required'
      })
    }

    const partnerCredentials = {
      email: email as string,
      password: password as string,
      securityToken: securityToken as string
    }

    const partnerService = await SalesforceService.createWithCredentials(partnerCredentials)
    const opportunities = await partnerService.getOpportunities()

    res.json({
      success: true,
      data: opportunities
    })
  } catch (error: any) {
    console.error('Error fetching opportunities:', error)
    res.status(500).json({
      error: 'Failed to fetch opportunities',
      message: error.message
    })
  }
})

export default router

