import { SalesforceService } from './salesforce.js'
import { OpportunityData } from '../types/salesforce.js'

/**
 * Raintree Salesforce Service
 * Uses pre-configured credentials from environment variables
 */
export class RaintreeSalesforceService {
  private static service: SalesforceService | null = null

  /**
   * Get or create Raintree Salesforce service instance
   */
  private static async getService(): Promise<SalesforceService> {
    if (!this.service) {
      await this.authenticate()
    }

    return this.service!
  }

  /**
   * Authenticate Raintree Salesforce using OAuth Username-Password flow
   * This uses the same OAuth flow as partner authentication
   */
  static async authenticate(): Promise<void> {
    if (this.service) {
      console.log('ℹ️  Raintree Salesforce already authenticated')
      return
    }

    const credentials = {
      email: process.env.RAINTREE_SALESFORCE_EMAIL || '',
      password: process.env.RAINTREE_SALESFORCE_PASSWORD || '',
      securityToken: process.env.RAINTREE_SALESFORCE_SECURITY_TOKEN || ''
    }

    console.log('🔐 Authenticating with Raintree Salesforce using OAuth...')
    console.log('   Email:', credentials.email || 'NOT SET')
    console.log('   Password:', credentials.password ? '***' : 'NOT SET')
    console.log('   Security Token:', credentials.securityToken ? `${credentials.securityToken.substring(0, 4)}*** (length: ${credentials.securityToken.length})` : 'NOT SET')
    console.log('   Combined Password Length:', (credentials.password + credentials.securityToken).length)
    console.log('   Expected Token Format: 24 characters (e.g., k7pk2qQxLl221rkFqNEfy7Xp)')

    if (!credentials.email || !credentials.password || !credentials.securityToken) {
      throw new Error('Raintree Salesforce credentials are not configured. Please check your .env file.')
    }

    try {
      // Use the same OAuth Username-Password flow as partner authentication
      this.service = await SalesforceService.createWithCredentials(credentials)
      console.log('✅ Successfully authenticated with Raintree Salesforce')
    } catch (error: any) {
      console.error('❌ Failed to authenticate with Raintree Salesforce:', error.message)
      throw error
    }
  }

  /**
   * Create an Opportunity in Raintree Salesforce
   */
  static async createOpportunity(opportunityData: OpportunityData): Promise<string> {
    try {
      console.log('📝 Creating opportunity in Raintree Salesforce:', opportunityData.Name)
      const service = await this.getService()
      const opportunityId = await service.createOpportunity(opportunityData)
      console.log('✅ Opportunity created in Raintree Salesforce with ID:', opportunityId)
      return opportunityId
    } catch (error: any) {
      console.error('❌ Error creating opportunity in Raintree Salesforce:', error.message)
      throw new Error(`Failed to create opportunity in Raintree Salesforce: ${error.message}`)
    }
  }

  /**
   * Reset the service instance (useful for testing or credential updates)
   */
  static reset(): void {
    this.service = null
  }

  /**
   * Update an Opportunity in Raintree Salesforce
   */
  static async updateOpportunity(opportunityId: string, opportunityData: Partial<OpportunityData>): Promise<void> {
    try {
      console.log('📝 Updating opportunity in Raintree Salesforce:', opportunityId)
      const service = await this.getService()
      await service.updateOpportunity(opportunityId, opportunityData)
      console.log('✅ Opportunity updated in Raintree Salesforce:', opportunityId)
    } catch (error: any) {
      console.error('❌ Error updating opportunity in Raintree Salesforce:', error.message)
      throw new Error(`Failed to update opportunity in Raintree Salesforce: ${error.message}`)
    }
  }

  /**
   * Delete an Opportunity from Raintree Salesforce
   */
  static async deleteOpportunity(opportunityId: string): Promise<void> {
    try {
      console.log('🗑️  Deleting opportunity from Raintree Salesforce:', opportunityId)
      const service = await this.getService()
      await service.deleteOpportunity(opportunityId)
      console.log('✅ Opportunity deleted from Raintree Salesforce:', opportunityId)
    } catch (error: any) {
      console.error('❌ Error deleting opportunity from Raintree Salesforce:', error.message)
      throw new Error(`Failed to delete opportunity from Raintree Salesforce: ${error.message}`)
    }
  }

  /**
   * Create a Lead in Raintree Salesforce
   */
  static async createLead(leadData: {
    FirstName: string
    LastName: string
    Company: string
    Email: string
    Status: string
    Phone?: string
    Title?: string
  }): Promise<string> {
    try {
      console.log('📝 Creating lead in Raintree Salesforce:', `${leadData.FirstName} ${leadData.LastName}`)
      const service = await this.getService()
      const leadId = await service.createLead(leadData)
      console.log('✅ Lead created in Raintree Salesforce with ID:', leadId)
      return leadId
    } catch (error: any) {
      console.error('❌ Error creating lead in Raintree Salesforce:', error.message)
      throw new Error(`Failed to create lead in Raintree Salesforce: ${error.message}`)
    }
  }

  /**
   * Update a Lead in Raintree Salesforce
   */
  static async updateLead(leadId: string, leadData: Partial<{
    FirstName: string
    LastName: string
    Company: string
    Email: string
    Status: string
    Phone?: string
    Title?: string
  }>): Promise<void> {
    try {
      console.log('📝 Updating lead in Raintree Salesforce:', leadId)
      const service = await this.getService()
      await service.updateLead(leadId, leadData)
      console.log('✅ Lead updated in Raintree Salesforce:', leadId)
    } catch (error: any) {
      console.error('❌ Error updating lead in Raintree Salesforce:', error.message)
      throw new Error(`Failed to update lead in Raintree Salesforce: ${error.message}`)
    }
  }

  /**
   * Delete a Lead from Raintree Salesforce
   */
  static async deleteLead(leadId: string): Promise<void> {
    try {
      console.log('🗑️  Deleting lead from Raintree Salesforce:', leadId)
      const service = await this.getService()
      await service.deleteLead(leadId)
      console.log('✅ Lead deleted from Raintree Salesforce:', leadId)
    } catch (error: any) {
      console.error('❌ Error deleting lead from Raintree Salesforce:', error.message)
      throw new Error(`Failed to delete lead from Raintree Salesforce: ${error.message}`)
    }
  }

  /**
   * Get a single Opportunity from Raintree Salesforce by ID
   */
  static async getOpportunity(opportunityId: string): Promise<any> {
    try {
      const service = await this.getService()
      const apiVersion = process.env.SALESFORCE_API_VERSION || 'v58.0'
      
      // Access the authenticated client
      const axios = require('axios')
      const instanceUrl = (service as any).instanceUrl
      const accessToken = (service as any).accessToken

      if (!instanceUrl || !accessToken) {
        throw new Error('Raintree Salesforce not authenticated')
      }

      const response = await axios.get(
        `${instanceUrl}/services/data/${apiVersion}/sobjects/Opportunity/${opportunityId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      return response.data
    } catch (error: any) {
      console.error(`Error fetching Raintree opportunity ${opportunityId}:`, error.message)
      throw error
    }
  }

  /**
   * Get a single Lead from Raintree Salesforce by ID
   */
  static async getLead(leadId: string): Promise<any> {
    try {
      const service = await this.getService()
      const apiVersion = process.env.SALESFORCE_API_VERSION || 'v58.0'
      
      const axios = require('axios')
      const instanceUrl = (service as any).instanceUrl
      const accessToken = (service as any).accessToken

      if (!instanceUrl || !accessToken) {
        throw new Error('Raintree Salesforce not authenticated')
      }

      const response = await axios.get(
        `${instanceUrl}/services/data/${apiVersion}/sobjects/Lead/${leadId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      return response.data
    } catch (error: any) {
      console.error(`Error fetching Raintree lead ${leadId}:`, error.message)
      throw error
    }
  }

  /**
   * Get all Opportunities from Raintree Salesforce
   */
  static async getOpportunities(): Promise<any[]> {
    try {
      const service = await this.getService()
      return await service.getOpportunities()
    } catch (error: any) {
      console.error('Error fetching Raintree opportunities:', error.message)
      throw error
    }
  }

  /**
   * Get all Leads from Raintree Salesforce
   */
  static async getLeads(): Promise<any[]> {
    try {
      const service = await this.getService()
      return await service.getLeads()
    } catch (error: any) {
      console.error('Error fetching Raintree leads:', error.message)
      throw error
    }
  }

  /**
   * Test Raintree Salesforce connection
   */
  static async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const service = await this.getService()
      // Try to get opportunities as a test
      await service.getOpportunities()
      return {
        success: true,
        message: 'Raintree Salesforce connection is working'
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Raintree Salesforce connection failed: ${error.message}`
      }
    }
  }
}

