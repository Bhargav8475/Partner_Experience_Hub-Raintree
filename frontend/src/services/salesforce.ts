// Salesforce API Service - Frontend client for backend API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

interface OpportunityData {
  Name: string
  StageName: string
  Amount: number
  CloseDate: string
}

interface PartnerCredentials {
  email: string
  password: string
  securityToken: string
}

class SalesforceAPI {
  private partnerCredentials: PartnerCredentials | null = null

  /**
   * Store partner credentials (for authentication and API calls)
   * Also pre-authenticates Raintree Salesforce using the same OAuth flow
   */
  async authenticate(username: string, password: string, securityToken: string): Promise<void> {
    try {
      // Validate credentials
      if (!username || !password || !securityToken) {
        throw new Error('Username, password, and security token are required')
      }

      // Store credentials for API calls
      this.partnerCredentials = {
        email: username,
        password: password,
        securityToken: securityToken
      }

      // Store in localStorage for persistence
      localStorage.setItem('salesforce_username', username)
      localStorage.setItem('salesforce_password', password)
      localStorage.setItem('salesforce_token', securityToken)

      console.log('✅ Partner credentials stored for:', username)

      // Pre-authenticate Raintree Salesforce using the same OAuth Username-Password flow
      try {
        console.log('🔐 Pre-authenticating Raintree Salesforce...')
        const raintreeResponse = await fetch(`${API_BASE_URL}/api/auth/raintree`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (raintreeResponse.ok) {
          console.log('✅ Raintree Salesforce pre-authenticated successfully')
        } else {
          const errorData = await raintreeResponse.json().catch(() => ({}))
          console.warn('⚠️ Raintree pre-authentication failed (will retry on sync):', errorData.message || 'Unknown error')
          // Don't throw - we'll retry when syncing
        }
      } catch (raintreeError: any) {
        console.warn('⚠️ Raintree pre-authentication error (will retry on sync):', raintreeError.message)
        // Don't throw - partner authentication succeeded, Raintree will retry on sync
      }
    } catch (error) {
      console.error('Salesforce authentication error:', error)
      throw error
    }
  }

  /**
   * Get stored partner credentials
   */
  private getPartnerCredentials(): PartnerCredentials {
    if (this.partnerCredentials) {
      return this.partnerCredentials
    }

    // Try to load from localStorage
    const username = localStorage.getItem('salesforce_username')
    const password = localStorage.getItem('salesforce_password')
    const token = localStorage.getItem('salesforce_token')

    if (username && password && token) {
      this.partnerCredentials = {
        email: username,
        password: password,
        securityToken: token
      }
      return this.partnerCredentials
    }

    throw new Error('Not authenticated. Please connect to Salesforce first.')
  }

  /**
   * Create an Opportunity in Salesforce via backend API
   */
  async createOpportunity(
    opportunityData: OpportunityData,
    syncToRaintree: boolean = false
  ): Promise<string> {
    try {
      const credentials = this.getPartnerCredentials()

      const response = await fetch(`${API_BASE_URL}/api/opportunities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          opportunity: opportunityData,
          partnerCredentials: credentials,
          syncToRaintree: syncToRaintree
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || 'Failed to create opportunity')
      }

      const data = await response.json()
      
      // Check for Raintree sync errors
      if (data.data?.errors && data.data.errors.length > 0) {
        console.warn('⚠️ Raintree sync errors:', data.data.errors)
        // Store errors for display (we'll handle this in the component)
        if (data.data.errors.length > 0) {
          const raintreeError = data.data.errors.find((e: string) => e.includes('Raintree'))
          if (raintreeError) {
            throw new Error(`Partner opportunity created, but ${raintreeError}`)
          }
        }
      }
      
      // Return partner Salesforce ID (primary)
      if (data.data?.partnerSalesforceId) {
        return data.data.partnerSalesforceId
      }

      throw new Error('No opportunity ID returned from server')
    } catch (error: any) {
      console.error('Error creating opportunity:', error)
      throw error
    }
  }

  /**
   * Get all Opportunities from Salesforce via backend API
   */
  async getOpportunities(): Promise<any[]> {
    try {
      const credentials = this.getPartnerCredentials()

      const params = new URLSearchParams({
        email: credentials.email,
        password: credentials.password,
        securityToken: credentials.securityToken
      })

      const response = await fetch(`${API_BASE_URL}/api/opportunities?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || 'Failed to fetch opportunities')
      }

      const data = await response.json()
      return data.data || []
    } catch (error: any) {
      console.error('Error fetching opportunities:', error)
      throw error
    }
  }

  /**
   * Update an Opportunity in Salesforce via backend API
   */
  async updateOpportunity(
    opportunityId: string,
    opportunityData: Partial<OpportunityData>,
    syncToRaintree: boolean = false,
    raintreeOpportunityId?: string
  ): Promise<void> {
    try {
      const credentials = this.getPartnerCredentials()

      const response = await fetch(`${API_BASE_URL}/api/opportunities/${opportunityId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          opportunity: opportunityData,
          partnerCredentials: credentials,
          syncToRaintree: syncToRaintree,
          raintreeOpportunityId: raintreeOpportunityId
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || 'Failed to update opportunity')
      }

      const data = await response.json()
      
      // Check for Raintree sync errors
      if (data.data?.errors && data.data.errors.length > 0) {
        console.warn('⚠️ Raintree sync errors:', data.data.errors)
        const raintreeError = data.data.errors.find((e: string) => e.includes('Raintree'))
        if (raintreeError) {
          throw new Error(`Partner opportunity updated, but ${raintreeError}`)
        }
      }
    } catch (error: any) {
      console.error('Error updating opportunity:', error)
      throw error
    }
  }

  /**
   * Delete an Opportunity from Salesforce via backend API
   */
  async deleteOpportunity(
    opportunityId: string,
    syncToRaintree: boolean = false,
    raintreeOpportunityId?: string
  ): Promise<void> {
    try {
      const credentials = this.getPartnerCredentials()

      const response = await fetch(`${API_BASE_URL}/api/opportunities/${opportunityId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          partnerCredentials: credentials,
          syncToRaintree: syncToRaintree,
          raintreeOpportunityId: raintreeOpportunityId
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || 'Failed to delete opportunity')
      }

      const data = await response.json()
      
      // Check for Raintree sync errors
      if (data.data?.errors && data.data.errors.length > 0) {
        console.warn('⚠️ Raintree sync errors:', data.data.errors)
        const raintreeError = data.data.errors.find((e: string) => e.includes('Raintree'))
        if (raintreeError) {
          throw new Error(`Partner opportunity deleted, but ${raintreeError}`)
        }
      }
    } catch (error: any) {
      console.error('Error deleting opportunity:', error)
      throw error
    }
  }

  /**
   * Create a Lead in Salesforce via backend API
   */
  async createLead(
    leadData: {
      FirstName: string
      LastName: string
      Company: string
      Email: string
      Status: string
      Phone?: string
      Title?: string
    },
    syncToRaintree: boolean = false
  ): Promise<string> {
    try {
      const credentials = this.getPartnerCredentials()

      const response = await fetch(`${API_BASE_URL}/api/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lead: leadData,
          partnerCredentials: credentials,
          syncToRaintree: syncToRaintree
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || 'Failed to create lead')
      }

      const data = await response.json()
      
      // Check for Raintree sync errors
      if (data.data?.errors && data.data.errors.length > 0) {
        console.warn('⚠️ Raintree sync errors:', data.data.errors)
        if (data.data.errors.length > 0) {
          const raintreeError = data.data.errors.find((e: string) => e.includes('Raintree'))
          if (raintreeError) {
            throw new Error(`Partner lead created, but ${raintreeError}`)
          }
        }
      }
      
      // Return partner Salesforce ID (primary)
      if (data.data?.partnerSalesforceId) {
        return data.data.partnerSalesforceId
      }

      throw new Error('No lead ID returned from server')
    } catch (error: any) {
      console.error('Error creating lead:', error)
      throw error
    }
  }

  /**
   * Get all Leads from Salesforce via backend API
   */
  async getLeads(): Promise<any[]> {
    try {
      const credentials = this.getPartnerCredentials()

      const params = new URLSearchParams({
        email: credentials.email,
        password: credentials.password,
        securityToken: credentials.securityToken
      })

      const response = await fetch(`${API_BASE_URL}/api/leads?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || 'Failed to fetch leads')
      }

      const data = await response.json()
      return data.data || []
    } catch (error: any) {
      console.error('Error fetching leads:', error)
      throw error
    }
  }

  /**
   * Update a Lead in Salesforce via backend API
   */
  async updateLead(
    leadId: string,
    leadData: Partial<{
      FirstName: string
      LastName: string
      Company: string
      Email: string
      Status: string
      Phone?: string
      Title?: string
    }>,
    syncToRaintree: boolean = false,
    raintreeLeadId?: string
  ): Promise<void> {
    try {
      const credentials = this.getPartnerCredentials()

      const response = await fetch(`${API_BASE_URL}/api/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lead: leadData,
          partnerCredentials: credentials,
          syncToRaintree: syncToRaintree,
          raintreeLeadId: raintreeLeadId
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || 'Failed to update lead')
      }

      const data = await response.json()
      
      // Check for Raintree sync errors
      if (data.data?.errors && data.data.errors.length > 0) {
        console.warn('⚠️ Raintree sync errors:', data.data.errors)
        const raintreeError = data.data.errors.find((e: string) => e.includes('Raintree'))
        if (raintreeError) {
          throw new Error(`Partner lead updated, but ${raintreeError}`)
        }
      }
    } catch (error: any) {
      console.error('Error updating lead:', error)
      throw error
    }
  }

  /**
   * Delete a Lead from Salesforce via backend API
   */
  async deleteLead(
    leadId: string,
    syncToRaintree: boolean = false,
    raintreeLeadId?: string
  ): Promise<void> {
    try {
      const credentials = this.getPartnerCredentials()

      const response = await fetch(`${API_BASE_URL}/api/leads/${leadId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          partnerCredentials: credentials,
          syncToRaintree: syncToRaintree,
          raintreeLeadId: raintreeLeadId
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || 'Failed to delete lead')
      }

      const data = await response.json()
      
      // Check for Raintree sync errors
      if (data.data?.errors && data.data.errors.length > 0) {
        console.warn('⚠️ Raintree sync errors:', data.data.errors)
        const raintreeError = data.data.errors.find((e: string) => e.includes('Raintree'))
        if (raintreeError) {
          throw new Error(`Partner lead deleted, but ${raintreeError}`)
        }
      }
    } catch (error: any) {
      console.error('Error deleting lead:', error)
      throw error
    }
  }

  /**
   * Sync an opportunity directly to Raintree Salesforce (without updating partner Salesforce)
   */
  async syncOpportunityToRaintree(
    opportunityId: string,
    opportunityData: OpportunityData,
    raintreeOpportunityId: string
  ): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/opportunities/${opportunityId}/sync-raintree`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          opportunity: opportunityData,
          raintreeOpportunityId: raintreeOpportunityId
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || 'Failed to sync opportunity to Raintree')
      }

      const data = await response.json()
      console.log('✅ Opportunity synced to Raintree:', data)
    } catch (error: any) {
      console.error('Error syncing opportunity to Raintree:', error)
      throw error
    }
  }

  /**
   * Sync a lead directly to Raintree Salesforce (without updating partner Salesforce)
   */
  async syncLeadToRaintree(
    leadId: string,
    leadData: {
      FirstName: string
      LastName: string
      Company: string
      Email: string
      Status: string
      Phone?: string
      Title?: string
    },
    raintreeLeadId: string
  ): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/leads/${leadId}/sync-raintree`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lead: leadData,
          raintreeLeadId: raintreeLeadId
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || 'Failed to sync lead to Raintree')
      }

      const data = await response.json()
      console.log('✅ Lead synced to Raintree:', data)
    } catch (error: any) {
      console.error('Error syncing lead to Raintree:', error)
      throw error
    }
  }

  /**
   * Detect changes and perform bi-directional sync
   * Uses the backend sync service to detect changes in both Partner and Raintree Salesforce
   */
  async detectAndSyncChanges(): Promise<{
    opportunities: Array<{
      recordId: string
      recordName: string
      syncDirection: 'partner-to-raintree' | 'raintree-to-partner' | 'none' | 'conflict'
      success: boolean
      error?: string
      timestamp: string
    }>
    leads: Array<{
      recordId: string
      recordName: string
      syncDirection: 'partner-to-raintree' | 'raintree-to-partner' | 'none' | 'conflict'
      success: boolean
      error?: string
      timestamp: string
    }>
    updatedMappings: {
      opportunities: Record<string, {
        partnerId: string
        raintreeId: string
        partnerLastModified: string
        raintreeLastModified: string
        lastSyncSource: 'partner' | 'raintree' | 'system'
        lastSyncTime: string
      }>
      leads: Record<string, {
        partnerId: string
        raintreeId: string
        partnerLastModified: string
        raintreeLastModified: string
        lastSyncSource: 'partner' | 'raintree' | 'system'
        lastSyncTime: string
      }>
    }
    summary: {
      total: number
      synced: number
      failed: number
      conflicts: number
    }
  }> {
    try {
      const credentials = this.getPartnerCredentials()
      const oppMappings = JSON.parse(localStorage.getItem('opportunity_mappings') || '{}')
      const leadMappings = JSON.parse(localStorage.getItem('lead_mappings') || '{}')

      const response = await fetch(`${API_BASE_URL}/api/sync/detect-changes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerCredentials: credentials,
          opportunityMappings: oppMappings,
          leadMappings: leadMappings
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || 'Failed to sync')
      }

      const data = await response.json()
      
      // Update localStorage with new mappings
      if (data.data.updatedMappings) {
        localStorage.setItem('opportunity_mappings', JSON.stringify(data.data.updatedMappings.opportunities))
        localStorage.setItem('lead_mappings', JSON.stringify(data.data.updatedMappings.leads))
      }

      return data.data
    } catch (error: any) {
      console.error('Error in detectAndSyncChanges:', error)
      throw error
    }
  }

  /**
   * Clear authentication
   */
  logout(): void {
    this.partnerCredentials = null
    localStorage.removeItem('salesforce_username')
    localStorage.removeItem('salesforce_password')
    localStorage.removeItem('salesforce_token')
  }
}

export const salesforceAPI = new SalesforceAPI()

