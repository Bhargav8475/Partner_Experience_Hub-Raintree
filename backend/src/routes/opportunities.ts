import { Router, Request, Response } from 'express'
import { SalesforceService } from '../services/salesforce.js'
import { RaintreeSalesforceService } from '../services/raintree.js'
import { CreateOpportunityRequest, UpdateOpportunityRequest, DeleteOpportunityRequest } from '../types/salesforce.js'

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

/**
 * PUT /api/opportunities/:id
 * Update an opportunity in partner's Salesforce and optionally in Raintree Salesforce
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const opportunityId = req.params.id
    const { opportunity, partnerCredentials, syncToRaintree, raintreeOpportunityId }: UpdateOpportunityRequest & { raintreeOpportunityId?: string } = req.body

    // Validate request
    if (!opportunity || !partnerCredentials) {
      return res.status(400).json({
        error: 'Missing required fields: opportunity and partnerCredentials are required'
      })
    }

    if (!partnerCredentials.email || !partnerCredentials.password || !partnerCredentials.securityToken) {
      return res.status(400).json({
        error: 'Missing required partner credentials: email, password, and securityToken are required'
      })
    }

    const results: {
      partnerUpdated?: boolean
      raintreeUpdated?: boolean
      errors?: string[]
    } = {}

    // Update opportunity in partner's Salesforce
    try {
      const partnerService = await SalesforceService.createWithCredentials(partnerCredentials)
      await partnerService.updateOpportunity(opportunityId, opportunity)
      results.partnerUpdated = true
      console.log('✅ Opportunity updated in partner Salesforce:', opportunityId)
    } catch (error: any) {
      return res.status(500).json({
        error: `Failed to update opportunity in partner Salesforce: ${error.message}`,
        details: error.message
      })
    }

    // If sync to Raintree is enabled, update in Raintree Salesforce as well
    if (syncToRaintree) {
      if (raintreeOpportunityId) {
        console.log('🔄 Syncing opportunity update to Raintree Salesforce...')
        console.log('   Partner Opportunity ID:', opportunityId)
        console.log('   Raintree Opportunity ID:', raintreeOpportunityId)
        console.log('   Update Data:', opportunity)
        try {
          await RaintreeSalesforceService.updateOpportunity(raintreeOpportunityId, opportunity)
          results.raintreeUpdated = true
          console.log('✅ Successfully synced update to Raintree Salesforce:', raintreeOpportunityId)
        } catch (error: any) {
          // Log error but don't fail the entire request
          console.error('❌ Raintree sync failed:', error.message)
          console.error('   Full error:', error)
          results.errors = results.errors || []
          results.errors.push(`Raintree sync failed: ${error.message}`)
        }
      } else {
        console.warn('⚠️  Raintree sync enabled but raintreeOpportunityId not provided')
        console.warn('   This opportunity may not have been created with Raintree sync enabled')
        results.errors = results.errors || []
        results.errors.push('Raintree sync enabled but raintreeOpportunityId is missing. This opportunity may not have been synced to Raintree when created.')
      }
    } else {
      console.log('ℹ️  Raintree sync not enabled for this update')
    }

    res.json({
      success: true,
      message: 'Opportunity updated successfully',
      data: results
    })
  } catch (error: any) {
    console.error('Error updating opportunity:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
})

/**
 * DELETE /api/opportunities/:id
 * Delete an opportunity from partner's Salesforce and optionally from Raintree Salesforce
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const opportunityId = req.params.id
    const { partnerCredentials, syncToRaintree, raintreeOpportunityId }: DeleteOpportunityRequest = req.body

    // Validate request
    if (!partnerCredentials) {
      return res.status(400).json({
        error: 'Missing required fields: partnerCredentials are required'
      })
    }

    if (!partnerCredentials.email || !partnerCredentials.password || !partnerCredentials.securityToken) {
      return res.status(400).json({
        error: 'Missing required partner credentials: email, password, and securityToken are required'
      })
    }

    const results: {
      partnerDeleted?: boolean
      raintreeDeleted?: boolean
      errors?: string[]
    } = {}

    // Delete opportunity from partner's Salesforce
    try {
      const partnerService = await SalesforceService.createWithCredentials(partnerCredentials)
      await partnerService.deleteOpportunity(opportunityId)
      results.partnerDeleted = true
      console.log('✅ Opportunity deleted from partner Salesforce:', opportunityId)
    } catch (error: any) {
      return res.status(500).json({
        error: `Failed to delete opportunity from partner Salesforce: ${error.message}`,
        details: error.message
      })
    }

    // If sync to Raintree is enabled, delete from Raintree Salesforce as well
    if (syncToRaintree && raintreeOpportunityId) {
      console.log('🔄 Syncing opportunity deletion to Raintree Salesforce...')
      try {
        await RaintreeSalesforceService.deleteOpportunity(raintreeOpportunityId)
        results.raintreeDeleted = true
        console.log('✅ Successfully synced deletion to Raintree Salesforce:', raintreeOpportunityId)
      } catch (error: any) {
        // Log error but don't fail the entire request
        console.error('❌ Raintree sync failed:', error.message)
        results.errors = results.errors || []
        results.errors.push(`Raintree sync failed: ${error.message}`)
      }
    } else if (syncToRaintree && !raintreeOpportunityId) {
      console.warn('⚠️  Raintree sync enabled but raintreeOpportunityId not provided')
      results.errors = results.errors || []
      results.errors.push('Raintree sync enabled but raintreeOpportunityId is missing')
    }

    res.json({
      success: true,
      message: 'Opportunity deleted successfully',
      data: results
    })
  } catch (error: any) {
    console.error('Error deleting opportunity:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
})

/**
 * POST /api/opportunities/:id/sync-raintree
 * Sync an opportunity to Raintree Salesforce without updating partner Salesforce
 */
router.post('/:id/sync-raintree', async (req: Request, res: Response) => {
  try {
    const opportunityId = req.params.id
    const { opportunity, raintreeOpportunityId }: { opportunity: OpportunityData, raintreeOpportunityId: string } = req.body

    // Validate request
    if (!opportunity || !raintreeOpportunityId) {
      return res.status(400).json({
        error: 'Missing required fields: opportunity and raintreeOpportunityId are required'
      })
    }

    console.log('🔄 Syncing opportunity to Raintree Salesforce (direct sync)...')
    console.log('   Partner Opportunity ID:', opportunityId)
    console.log('   Raintree Opportunity ID:', raintreeOpportunityId)
    console.log('   Update Data:', opportunity)

    try {
      await RaintreeSalesforceService.updateOpportunity(raintreeOpportunityId, opportunity)
      console.log('✅ Successfully synced to Raintree Salesforce:', raintreeOpportunityId)
      
      res.json({
        success: true,
        message: 'Opportunity synced to Raintree successfully',
        data: {
          raintreeUpdated: true
        }
      })
    } catch (error: any) {
      console.error('❌ Raintree sync failed:', error.message)
      console.error('   Full error:', error)
      res.status(500).json({
        error: 'Failed to sync to Raintree Salesforce',
        message: error.message
      })
    }
  } catch (error: any) {
    console.error('Error syncing opportunity to Raintree:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
})

export default router

