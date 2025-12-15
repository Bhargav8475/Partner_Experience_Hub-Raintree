import { SalesforceService } from './salesforce.js'
import { RaintreeSalesforceService } from './raintree.js'
import { SalesforceCredentials } from '../types/salesforce.js'

export interface SyncMapping {
  partnerId: string
  raintreeId: string
  partnerLastModified: string
  raintreeLastModified: string
  lastSyncSource: 'partner' | 'raintree' | 'system'
  lastSyncTime: string
}

export interface SyncResult {
  recordId: string
  recordName: string
  syncDirection: 'partner-to-raintree' | 'raintree-to-partner' | 'none' | 'conflict'
  success: boolean
  error?: string
  timestamp: string
}

export interface SyncResults {
  opportunities: SyncResult[]
  leads: SyncResult[]
  updatedMappings: {
    opportunities: Record<string, SyncMapping>
    leads: Record<string, SyncMapping>
  }
  summary: {
    total: number
    synced: number
    failed: number
    conflicts: number
  }
}

/**
 * Bi-Directional Sync Service
 * Handles synchronization between Partner Salesforce and Raintree Salesforce
 */
export class SyncService {
  /**
   * Detect changes and perform bi-directional sync for opportunities
   * Returns sync results and updated mappings
   */
  static async syncOpportunities(
    partnerCredentials: SalesforceCredentials,
    mappings: Record<string, SyncMapping>
  ): Promise<{ results: SyncResult[], updatedMappings: Record<string, SyncMapping> }> {
    const results: SyncResult[] = []
    const updatedMappings: Record<string, SyncMapping> = { ...mappings }

    try {
      // Get opportunities from both systems
      const partnerService = await SalesforceService.createWithCredentials(partnerCredentials)
      const partnerOpps = await partnerService.getOpportunities()
      
      // Create a map for quick lookup
      const partnerOppMap = new Map(partnerOpps.map(opp => [opp.Id, opp]))
      const raintreeOppMap = new Map<string, any>()

      // Fetch Raintree opportunities for mapped records
      for (const [partnerId, mapping] of Object.entries(mappings)) {
        try {
          const raintreeOpp = await RaintreeSalesforceService.getOpportunity(mapping.raintreeId)
          if (raintreeOpp) {
            raintreeOppMap.set(partnerId, raintreeOpp)
          }
        } catch (error) {
          console.warn(`Failed to fetch Raintree opportunity ${mapping.raintreeId}:`, error)
        }
      }

      // Process each mapped opportunity
      for (const [partnerId, mapping] of Object.entries(mappings)) {
        const partnerOpp = partnerOppMap.get(partnerId)
        const raintreeOpp = raintreeOppMap.get(partnerId)

        if (!partnerOpp || !raintreeOpp) {
          continue
        }

        const syncResult = await this.syncOpportunityRecord(
          partnerOpp,
          raintreeOpp,
          mapping,
          partnerService
        )

        results.push(syncResult)

        // Update mapping with latest timestamps
        updatedMappings[partnerId] = {
          ...mapping,
          partnerLastModified: partnerOpp.LastModifiedDate || partnerOpp.CreatedDate,
          raintreeLastModified: raintreeOpp.LastModifiedDate || raintreeOpp.CreatedDate,
          lastSyncSource: syncResult.syncDirection === 'partner-to-raintree' ? 'partner' 
            : syncResult.syncDirection === 'raintree-to-partner' ? 'raintree' 
            : mapping.lastSyncSource,
          lastSyncTime: syncResult.timestamp
        }
      }
    } catch (error: any) {
      console.error('Error in syncOpportunities:', error)
      throw error
    }

    return { results, updatedMappings }
  }

  /**
   * Detect changes and perform bi-directional sync for leads
   * Returns sync results and updated mappings
   */
  static async syncLeads(
    partnerCredentials: SalesforceCredentials,
    mappings: Record<string, SyncMapping>
  ): Promise<{ results: SyncResult[], updatedMappings: Record<string, SyncMapping> }> {
    const results: SyncResult[] = []
    const updatedMappings: Record<string, SyncMapping> = { ...mappings }

    try {
      // Get leads from both systems
      const partnerService = await SalesforceService.createWithCredentials(partnerCredentials)
      const partnerLeads = await partnerService.getLeads()
      
      // Create a map for quick lookup
      const partnerLeadMap = new Map(partnerLeads.map(lead => [lead.Id, lead]))
      const raintreeLeadMap = new Map<string, any>()

      // Fetch Raintree leads for mapped records
      for (const [partnerId, mapping] of Object.entries(mappings)) {
        try {
          const raintreeLead = await RaintreeSalesforceService.getLead(mapping.raintreeId)
          if (raintreeLead) {
            raintreeLeadMap.set(partnerId, raintreeLead)
          }
        } catch (error) {
          console.warn(`Failed to fetch Raintree lead ${mapping.raintreeId}:`, error)
        }
      }

      // Process each mapped lead
      for (const [partnerId, mapping] of Object.entries(mappings)) {
        const partnerLead = partnerLeadMap.get(partnerId)
        const raintreeLead = raintreeLeadMap.get(partnerId)

        if (!partnerLead || !raintreeLead) {
          continue
        }

        const syncResult = await this.syncLeadRecord(
          partnerLead,
          raintreeLead,
          mapping,
          partnerService
        )

        results.push(syncResult)

        // Update mapping with latest timestamps
        updatedMappings[partnerId] = {
          ...mapping,
          partnerLastModified: partnerLead.LastModifiedDate || partnerLead.CreatedDate,
          raintreeLastModified: raintreeLead.LastModifiedDate || raintreeLead.CreatedDate,
          lastSyncSource: syncResult.syncDirection === 'partner-to-raintree' ? 'partner' 
            : syncResult.syncDirection === 'raintree-to-partner' ? 'raintree' 
            : mapping.lastSyncSource,
          lastSyncTime: syncResult.timestamp
        }
      }
    } catch (error: any) {
      console.error('Error in syncLeads:', error)
      throw error
    }

    return { results, updatedMappings }
  }

  /**
   * Sync a single opportunity record bi-directionally
   */
  private static async syncOpportunityRecord(
    partnerOpp: any,
    raintreeOpp: any,
    mapping: SyncMapping,
    partnerService: SalesforceService
  ): Promise<SyncResult> {
    const partnerLastModified = new Date(partnerOpp.LastModifiedDate || partnerOpp.CreatedDate).getTime()
    const raintreeLastModified = new Date(raintreeOpp.LastModifiedDate || raintreeOpp.CreatedDate).getTime()
    const storedPartnerModified = new Date(mapping.partnerLastModified).getTime()
    const storedRaintreeModified = new Date(mapping.raintreeLastModified).getTime()

    // Check if Partner has newer changes
    const partnerHasNewChanges = partnerLastModified > storedPartnerModified
    const raintreeHasNewChanges = raintreeLastModified > storedRaintreeModified

    // Determine sync direction
    let syncDirection: 'partner-to-raintree' | 'raintree-to-partner' | 'none' | 'conflict' = 'none'
    let shouldSync = false

    if (partnerHasNewChanges && raintreeHasNewChanges) {
      // Conflict: both systems have new changes
      if (partnerLastModified > raintreeLastModified) {
        syncDirection = 'partner-to-raintree'
        shouldSync = true
      } else {
        syncDirection = 'raintree-to-partner'
        shouldSync = true
      }
    } else if (partnerHasNewChanges) {
      // Only Partner has new changes
      // Don't sync if last sync was from Raintree (prevent ping-pong)
      if (mapping.lastSyncSource !== 'raintree') {
        syncDirection = 'partner-to-raintree'
        shouldSync = true
      }
    } else if (raintreeHasNewChanges) {
      // Only Raintree has new changes
      // Don't sync if last sync was from Partner (prevent ping-pong)
      if (mapping.lastSyncSource !== 'partner') {
        syncDirection = 'raintree-to-partner'
        shouldSync = true
      }
    }

    if (!shouldSync) {
      return {
        recordId: mapping.partnerId,
        recordName: partnerOpp.Name || 'Unknown',
        syncDirection: 'none',
        success: true,
        timestamp: new Date().toISOString()
      }
    }

    try {
      if (syncDirection === 'partner-to-raintree') {
        // Sync Partner → Raintree
        await RaintreeSalesforceService.updateOpportunity(mapping.raintreeId, {
          Name: partnerOpp.Name,
          StageName: partnerOpp.StageName,
          Amount: partnerOpp.Amount || 0,
          CloseDate: partnerOpp.CloseDate
        })

        return {
          recordId: mapping.partnerId,
          recordName: partnerOpp.Name || 'Unknown',
          syncDirection: 'partner-to-raintree',
          success: true,
          timestamp: new Date().toISOString()
        }
      } else if (syncDirection === 'raintree-to-partner') {
        // Sync Raintree → Partner
        await partnerService.updateOpportunity(mapping.partnerId, {
          Name: raintreeOpp.Name,
          StageName: raintreeOpp.StageName,
          Amount: raintreeOpp.Amount || 0,
          CloseDate: raintreeOpp.CloseDate
        })

        return {
          recordId: mapping.partnerId,
          recordName: partnerOpp.Name || 'Unknown',
          syncDirection: 'raintree-to-partner',
          success: true,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error: any) {
      return {
        recordId: mapping.partnerId,
        recordName: partnerOpp.Name || 'Unknown',
        syncDirection,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }

    return {
      recordId: mapping.partnerId,
      recordName: partnerOpp.Name || 'Unknown',
      syncDirection: 'none',
      success: true,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Sync a single lead record bi-directionally
   */
  private static async syncLeadRecord(
    partnerLead: any,
    raintreeLead: any,
    mapping: SyncMapping,
    partnerService: SalesforceService
  ): Promise<SyncResult> {
    const partnerLastModified = new Date(partnerLead.LastModifiedDate || partnerLead.CreatedDate).getTime()
    const raintreeLastModified = new Date(raintreeLead.LastModifiedDate || raintreeLead.CreatedDate).getTime()
    const storedPartnerModified = new Date(mapping.partnerLastModified).getTime()
    const storedRaintreeModified = new Date(mapping.raintreeLastModified).getTime()

    // Check if Partner has newer changes
    const partnerHasNewChanges = partnerLastModified > storedPartnerModified
    const raintreeHasNewChanges = raintreeLastModified > storedRaintreeModified

    // Determine sync direction
    let syncDirection: 'partner-to-raintree' | 'raintree-to-partner' | 'none' | 'conflict' = 'none'
    let shouldSync = false

    if (partnerHasNewChanges && raintreeHasNewChanges) {
      // Conflict: both systems have new changes
      if (partnerLastModified > raintreeLastModified) {
        syncDirection = 'partner-to-raintree'
        shouldSync = true
      } else {
        syncDirection = 'raintree-to-partner'
        shouldSync = true
      }
    } else if (partnerHasNewChanges) {
      // Only Partner has new changes
      if (mapping.lastSyncSource !== 'raintree') {
        syncDirection = 'partner-to-raintree'
        shouldSync = true
      }
    } else if (raintreeHasNewChanges) {
      // Only Raintree has new changes
      if (mapping.lastSyncSource !== 'partner') {
        syncDirection = 'raintree-to-partner'
        shouldSync = true
      }
    }

    if (!shouldSync) {
      return {
        recordId: mapping.partnerId,
        recordName: `${partnerLead.FirstName || ''} ${partnerLead.LastName || ''}`.trim() || 'Unknown',
        syncDirection: 'none',
        success: true,
        timestamp: new Date().toISOString()
      }
    }

    try {
      if (syncDirection === 'partner-to-raintree') {
        // Sync Partner → Raintree
        await RaintreeSalesforceService.updateLead(mapping.raintreeId, {
          FirstName: partnerLead.FirstName || '',
          LastName: partnerLead.LastName || '',
          Company: partnerLead.Company || '',
          Email: partnerLead.Email || '',
          Status: partnerLead.Status || 'Open - Not Contacted'
        })

        return {
          recordId: mapping.partnerId,
          recordName: `${partnerLead.FirstName || ''} ${partnerLead.LastName || ''}`.trim() || 'Unknown',
          syncDirection: 'partner-to-raintree',
          success: true,
          timestamp: new Date().toISOString()
        }
      } else if (syncDirection === 'raintree-to-partner') {
        // Sync Raintree → Partner
        await partnerService.updateLead(mapping.partnerId, {
          FirstName: raintreeLead.FirstName || '',
          LastName: raintreeLead.LastName || '',
          Company: raintreeLead.Company || '',
          Email: raintreeLead.Email || '',
          Status: raintreeLead.Status || 'Open - Not Contacted'
        })

        return {
          recordId: mapping.partnerId,
          recordName: `${partnerLead.FirstName || ''} ${partnerLead.LastName || ''}`.trim() || 'Unknown',
          syncDirection: 'raintree-to-partner',
          success: true,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error: any) {
      return {
        recordId: mapping.partnerId,
        recordName: `${partnerLead.FirstName || ''} ${partnerLead.LastName || ''}`.trim() || 'Unknown',
        syncDirection,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }

    return {
      recordId: mapping.partnerId,
      recordName: `${partnerLead.FirstName || ''} ${partnerLead.LastName || ''}`.trim() || 'Unknown',
      syncDirection: 'none',
      success: true,
      timestamp: new Date().toISOString()
    }
  }

}

