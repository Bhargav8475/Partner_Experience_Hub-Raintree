import { Router, Request, Response } from 'express'
import { SyncService, SyncMapping } from '../services/sync.js'
import { SalesforceCredentials } from '../types/salesforce.js'

const router = Router()

/**
 * POST /api/sync/detect-changes
 * Detect changes in both Partner and Raintree Salesforce and sync bi-directionally
 */
router.post('/detect-changes', async (req: Request, res: Response) => {
  try {
    const { partnerCredentials, opportunityMappings, leadMappings } = req.body

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

    // Validate mappings structure
    if (!opportunityMappings || typeof opportunityMappings !== 'object') {
      return res.status(400).json({
        error: 'Missing or invalid opportunityMappings'
      })
    }

    if (!leadMappings || typeof leadMappings !== 'object') {
      return res.status(400).json({
        error: 'Missing or invalid leadMappings'
      })
    }

    console.log('🔄 Starting bi-directional sync detection...')
    console.log(`   Opportunities to check: ${Object.keys(opportunityMappings).length}`)
    console.log(`   Leads to check: ${Object.keys(leadMappings).length}`)

    // Convert simple mappings to SyncMapping format if needed
    const oppMappings: Record<string, SyncMapping> = {}
    const leadMappingsFormatted: Record<string, SyncMapping> = {}

    // Process opportunity mappings
    for (const [partnerId, mapping] of Object.entries(opportunityMappings)) {
      if (typeof mapping === 'string') {
        // Simple format: { partnerId: raintreeId }
        oppMappings[partnerId] = {
          partnerId,
          raintreeId: mapping as string,
          partnerLastModified: new Date().toISOString(), // Will be updated after fetch
          raintreeLastModified: new Date().toISOString(), // Will be updated after fetch
          lastSyncSource: 'system',
          lastSyncTime: new Date().toISOString()
        }
      } else {
        // Enhanced format: { partnerId: SyncMapping }
        oppMappings[partnerId] = mapping as SyncMapping
      }
    }

    // Process lead mappings
    for (const [partnerId, mapping] of Object.entries(leadMappings)) {
      if (typeof mapping === 'string') {
        // Simple format: { partnerId: raintreeId }
        leadMappingsFormatted[partnerId] = {
          partnerId,
          raintreeId: mapping as string,
          partnerLastModified: new Date().toISOString(),
          raintreeLastModified: new Date().toISOString(),
          lastSyncSource: 'system',
          lastSyncTime: new Date().toISOString()
        }
      } else {
        // Enhanced format: { partnerId: SyncMapping }
        leadMappingsFormatted[partnerId] = mapping as SyncMapping
      }
    }

    // Perform bi-directional sync
    const [oppSync, leadSync] = await Promise.all([
      SyncService.syncOpportunities(partnerCredentials, oppMappings),
      SyncService.syncLeads(partnerCredentials, leadMappingsFormatted)
    ])

    // Calculate summary
    const allResults = [...oppSync.results, ...leadSync.results]
    const summary = {
      total: allResults.length,
      synced: allResults.filter(r => r.success && r.syncDirection !== 'none').length,
      failed: allResults.filter(r => !r.success).length,
      conflicts: allResults.filter(r => r.syncDirection === 'conflict').length
    }

    console.log('✅ Sync detection completed:', summary)

    res.json({
      success: true,
      message: 'Bi-directional sync completed',
      data: {
        opportunities: oppSync.results,
        leads: leadSync.results,
        updatedMappings: {
          opportunities: oppSync.updatedMappings,
          leads: leadSync.updatedMappings
        },
        summary
      }
    })
  } catch (error: any) {
    console.error('Error in detect-changes:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
})

/**
 * GET /api/sync/status
 * Get sync status for all mapped records
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const { opportunityMappings, leadMappings } = req.query

    if (!opportunityMappings && !leadMappings) {
      return res.status(400).json({
        error: 'Missing required query parameters: opportunityMappings or leadMappings'
      })
    }

    // Parse mappings from query (they should be JSON strings)
    let oppMappings = {}
    let leadMappingsParsed = {}

    try {
      if (opportunityMappings) {
        oppMappings = typeof opportunityMappings === 'string' 
          ? JSON.parse(opportunityMappings) 
          : opportunityMappings
      }
      if (leadMappings) {
        leadMappingsParsed = typeof leadMappings === 'string'
          ? JSON.parse(leadMappings)
          : leadMappings
      }
    } catch (parseError) {
      return res.status(400).json({
        error: 'Invalid JSON in mappings'
      })
    }

    res.json({
      success: true,
      data: {
        opportunities: {
          total: Object.keys(oppMappings).length,
          mappings: oppMappings
        },
        leads: {
          total: Object.keys(leadMappingsParsed).length,
          mappings: leadMappingsParsed
        }
      }
    })
  } catch (error: any) {
    console.error('Error in sync status:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
})

export default router

