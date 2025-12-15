import { Router, Request, Response } from 'express'
import { SalesforceService } from '../services/salesforce.js'
import { RaintreeSalesforceService } from '../services/raintree.js'
import { CreateLeadRequest, UpdateLeadRequest, DeleteLeadRequest } from '../types/salesforce.js'

const router = Router()

/**
 * POST /api/leads
 * Create a lead in partner's Salesforce and optionally in Raintree Salesforce
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { lead, partnerCredentials, syncToRaintree }: CreateLeadRequest = req.body

    // Validate request
    if (!lead || !partnerCredentials) {
      return res.status(400).json({
        error: 'Missing required fields: lead and partnerCredentials are required'
      })
    }

    if (!lead.FirstName || !lead.LastName || !lead.Company || !lead.Email || !lead.Status) {
      return res.status(400).json({
        error: 'Missing required lead fields: FirstName, LastName, Company, Email, and Status are required'
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

    // Create lead in partner's Salesforce
    try {
      const partnerService = await SalesforceService.createWithCredentials(partnerCredentials)
      results.partnerSalesforceId = await partnerService.createLead(lead)
    } catch (error: any) {
      return res.status(500).json({
        error: `Failed to create lead in partner Salesforce: ${error.message}`,
        details: error.message
      })
    }

    // If sync to Raintree is enabled, create in Raintree Salesforce as well
    if (syncToRaintree) {
      console.log('🔄 Syncing lead to Raintree Salesforce...')
      try {
        results.raintreeSalesforceId = await RaintreeSalesforceService.createLead(lead)
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
      message: 'Lead created successfully',
      data: results
    })
  } catch (error: any) {
    console.error('Error creating lead:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
})

/**
 * GET /api/leads
 * Get leads from partner's Salesforce
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
    const leads = await partnerService.getLeads()

    res.json({
      success: true,
      data: leads
    })
  } catch (error: any) {
    console.error('Error fetching leads:', error)
    res.status(500).json({
      error: 'Failed to fetch leads',
      message: error.message
    })
  }
})

/**
 * PUT /api/leads/:id
 * Update a lead in partner's Salesforce and optionally in Raintree Salesforce
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const leadId = req.params.id
    const { lead, partnerCredentials, syncToRaintree, raintreeLeadId }: UpdateLeadRequest & { raintreeLeadId?: string } = req.body

    // Validate request
    if (!lead || !partnerCredentials) {
      return res.status(400).json({
        error: 'Missing required fields: lead and partnerCredentials are required'
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

    // Update lead in partner's Salesforce
    try {
      const partnerService = await SalesforceService.createWithCredentials(partnerCredentials)
      await partnerService.updateLead(leadId, lead)
      results.partnerUpdated = true
      console.log('✅ Lead updated in partner Salesforce:', leadId)
    } catch (error: any) {
      return res.status(500).json({
        error: `Failed to update lead in partner Salesforce: ${error.message}`,
        details: error.message
      })
    }

    // If sync to Raintree is enabled, update in Raintree Salesforce as well
    if (syncToRaintree) {
      if (raintreeLeadId) {
        console.log('🔄 Syncing lead update to Raintree Salesforce...')
        console.log('   Partner Lead ID:', leadId)
        console.log('   Raintree Lead ID:', raintreeLeadId)
        console.log('   Update Data:', lead)
        try {
          await RaintreeSalesforceService.updateLead(raintreeLeadId, lead)
          results.raintreeUpdated = true
          console.log('✅ Successfully synced update to Raintree Salesforce:', raintreeLeadId)
        } catch (error: any) {
          // Log error but don't fail the entire request
          console.error('❌ Raintree sync failed:', error.message)
          console.error('   Full error:', error)
          results.errors = results.errors || []
          results.errors.push(`Raintree sync failed: ${error.message}`)
        }
      } else {
        console.warn('⚠️  Raintree sync enabled but raintreeLeadId not provided')
        console.warn('   This lead may not have been created with Raintree sync enabled')
        results.errors = results.errors || []
        results.errors.push('Raintree sync enabled but raintreeLeadId is missing. This lead may not have been synced to Raintree when created.')
      }
    } else {
      console.log('ℹ️  Raintree sync not enabled for this update')
    }

    res.json({
      success: true,
      message: 'Lead updated successfully',
      data: results
    })
  } catch (error: any) {
    console.error('Error updating lead:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
})

/**
 * DELETE /api/leads/:id
 * Delete a lead from partner's Salesforce and optionally from Raintree Salesforce
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const leadId = req.params.id
    const { partnerCredentials, syncToRaintree, raintreeLeadId }: DeleteLeadRequest = req.body

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

    // Delete lead from partner's Salesforce
    try {
      const partnerService = await SalesforceService.createWithCredentials(partnerCredentials)
      await partnerService.deleteLead(leadId)
      results.partnerDeleted = true
      console.log('✅ Lead deleted from partner Salesforce:', leadId)
    } catch (error: any) {
      return res.status(500).json({
        error: `Failed to delete lead from partner Salesforce: ${error.message}`,
        details: error.message
      })
    }

    // If sync to Raintree is enabled, delete from Raintree Salesforce as well
    if (syncToRaintree && raintreeLeadId) {
      console.log('🔄 Syncing lead deletion to Raintree Salesforce...')
      try {
        await RaintreeSalesforceService.deleteLead(raintreeLeadId)
        results.raintreeDeleted = true
        console.log('✅ Successfully synced deletion to Raintree Salesforce:', raintreeLeadId)
      } catch (error: any) {
        // Log error but don't fail the entire request
        console.error('❌ Raintree sync failed:', error.message)
        results.errors = results.errors || []
        results.errors.push(`Raintree sync failed: ${error.message}`)
      }
    } else if (syncToRaintree && !raintreeLeadId) {
      console.warn('⚠️  Raintree sync enabled but raintreeLeadId not provided')
      results.errors = results.errors || []
      results.errors.push('Raintree sync enabled but raintreeLeadId is missing')
    }

    res.json({
      success: true,
      message: 'Lead deleted successfully',
      data: results
    })
  } catch (error: any) {
    console.error('Error deleting lead:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
})

/**
 * POST /api/leads/:id/sync-raintree
 * Sync a lead to Raintree Salesforce without updating partner Salesforce
 */
router.post('/:id/sync-raintree', async (req: Request, res: Response) => {
  try {
    const leadId = req.params.id
    const { lead, raintreeLeadId }: { lead: any, raintreeLeadId: string } = req.body

    // Validate request
    if (!lead || !raintreeLeadId) {
      return res.status(400).json({
        error: 'Missing required fields: lead and raintreeLeadId are required'
      })
    }

    console.log('🔄 Syncing lead to Raintree Salesforce (direct sync)...')
    console.log('   Partner Lead ID:', leadId)
    console.log('   Raintree Lead ID:', raintreeLeadId)
    console.log('   Update Data:', lead)

    try {
      await RaintreeSalesforceService.updateLead(raintreeLeadId, lead)
      console.log('✅ Successfully synced to Raintree Salesforce:', raintreeLeadId)
      
      res.json({
        success: true,
        message: 'Lead synced to Raintree successfully',
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
    console.error('Error syncing lead to Raintree:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
})

export default router


