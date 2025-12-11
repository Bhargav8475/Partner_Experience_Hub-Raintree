import axios, { AxiosInstance } from 'axios'
import {
  SalesforceCredentials,
  SalesforceAuthResponse,
  OpportunityData,
  SalesforceOpportunity
} from '../types/salesforce.js'

export class SalesforceService {
  private accessToken: string | null = null
  private instanceUrl: string | null = null
  private credentials: SalesforceCredentials | null = null

  /**
   * Authenticate with Salesforce using Username-Password OAuth Flow
   */
  async authenticate(credentials: SalesforceCredentials): Promise<SalesforceAuthResponse> {
    const loginUrl = 'https://login.salesforce.com/services/oauth2/token'
    
    try {
      // Validate OAuth credentials are configured
      const clientId = process.env.SALESFORCE_CLIENT_ID
      const clientSecret = process.env.SALESFORCE_CLIENT_SECRET

      if (!clientId || !clientSecret) {
        throw new Error(
          'Salesforce OAuth credentials are not configured. ' +
          'Please set SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET in your .env file. ' +
          'See backend/README.md for instructions on how to get these credentials from a Salesforce Connected App.'
        )
      }
      
      const params = new URLSearchParams({
        grant_type: 'password',
        client_id: clientId,
        client_secret: clientSecret,
        username: credentials.email,
        password: credentials.password + credentials.securityToken
      })

      const response = await axios.post<SalesforceAuthResponse>(loginUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      this.accessToken = response.data.access_token
      this.instanceUrl = response.data.instance_url
      this.credentials = credentials

      return response.data
    } catch (error: any) {
      if (error.response) {
        const errorData = error.response.data
        const errorCode = errorData?.error || 'unknown_error'
        const errorDescription = errorData?.error_description || 'Authentication failed'
        
        // Provide more specific error messages
        let detailedMessage = errorDescription
        
        if (errorCode === 'invalid_grant') {
          if (errorDescription.includes('authentication failure')) {
            detailedMessage = 'Invalid username, password, or security token. Please verify your credentials.'
          } else if (errorDescription.includes('expired')) {
            detailedMessage = 'Security token may have expired. Please reset it in Salesforce.'
          } else {
            detailedMessage = `Invalid credentials: ${errorDescription}`
          }
        } else if (errorCode === 'invalid_client_id') {
          detailedMessage = 'Invalid Client ID. Please check your SALESFORCE_CLIENT_ID in .env file.'
        } else if (errorCode === 'invalid_client') {
          detailedMessage = 'Invalid Client ID or Client Secret. Please check your OAuth credentials in .env file.'
        }
        
        console.error('Salesforce authentication error details:', {
          error: errorCode,
          description: errorDescription,
          status: error.response.status,
          url: loginUrl
        })
        
        throw new Error(`Salesforce authentication failed: ${detailedMessage}`)
      }
      throw new Error(`Salesforce authentication failed: ${error.message}`)
    }
  }

  /**
   * Get authenticated axios instance
   */
  private getAuthenticatedClient(): AxiosInstance {
    if (!this.accessToken || !this.instanceUrl) {
      throw new Error('Not authenticated. Please authenticate first.')
    }

    return axios.create({
      baseURL: this.instanceUrl,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    })
  }

  /**
   * Create an Opportunity in Salesforce
   */
  async createOpportunity(opportunityData: OpportunityData): Promise<string> {
    try {
      const client = this.getAuthenticatedClient()
      const apiVersion = process.env.SALESFORCE_API_VERSION || 'v58.0'
      
      const response = await client.post<{ id: string; success: boolean; errors: string[] }>(
        `/services/data/${apiVersion}/sobjects/Opportunity`,
        opportunityData
      )

      if (!response.data.success) {
        throw new Error(`Failed to create opportunity: ${response.data.errors?.join(', ') || 'Unknown error'}`)
      }

      return response.data.id
    } catch (error: any) {
      if (error.response) {
        const errorMessage = error.response.data?.[0]?.message || 
                           error.response.data?.message || 
                           'Failed to create opportunity'
        throw new Error(`Salesforce API error: ${errorMessage}`)
      }
      throw new Error(`Failed to create opportunity: ${error.message}`)
    }
  }

  /**
   * Get all Opportunities from Salesforce
   */
  async getOpportunities(): Promise<SalesforceOpportunity[]> {
    try {
      const client = this.getAuthenticatedClient()
      const apiVersion = process.env.SALESFORCE_API_VERSION || 'v58.0'
      
      const query = `SELECT Id, Name, StageName, Amount, CloseDate, CreatedDate, LastModifiedDate FROM Opportunity ORDER BY CreatedDate DESC LIMIT 100`
      
      const response = await client.get<{
        totalSize: number
        done: boolean
        records: SalesforceOpportunity[]
      }>(`/services/data/${apiVersion}/query`, {
        params: { q: query }
      })

      return response.data.records
    } catch (error: any) {
      if (error.response) {
        const errorMessage = error.response.data?.[0]?.message || 
                           error.response.data?.message || 
                           'Failed to fetch opportunities'
        throw new Error(`Salesforce API error: ${errorMessage}`)
      }
      throw new Error(`Failed to fetch opportunities: ${error.message}`)
    }
  }

  /**
   * Update an Opportunity in Salesforce
   */
  async updateOpportunity(opportunityId: string, opportunityData: Partial<OpportunityData>): Promise<void> {
    try {
      const client = this.getAuthenticatedClient()
      const apiVersion = process.env.SALESFORCE_API_VERSION || 'v58.0'
      
      // Filter out undefined/null values and build clean update object
      const cleanData: any = {}
      if (opportunityData.Name !== undefined && opportunityData.Name !== null) {
        cleanData.Name = opportunityData.Name
      }
      if (opportunityData.StageName !== undefined && opportunityData.StageName !== null) {
        cleanData.StageName = opportunityData.StageName
      }
      if (opportunityData.Amount !== undefined && opportunityData.Amount !== null) {
        cleanData.Amount = opportunityData.Amount
      }
      if (opportunityData.CloseDate !== undefined && opportunityData.CloseDate !== null) {
        cleanData.CloseDate = opportunityData.CloseDate
      }

      console.log('📝 Updating opportunity in Salesforce:', {
        opportunityId,
        updateData: cleanData
      })

      const response = await client.patch(
        `/services/data/${apiVersion}/sobjects/Opportunity/${opportunityId}`,
        cleanData
      )

      // Salesforce PATCH returns 204 No Content on success
      // If we get here without an error, the update was successful
      if (response.status === 204 || response.status === 200) {
        console.log('✅ Opportunity updated successfully in Salesforce:', opportunityId)
        return
      }
      
      throw new Error(`Unexpected response status: ${response.status}`)
    } catch (error: any) {
      if (error.response) {
        // Handle Salesforce error response
        const errorData = error.response.data
        let errorMessage = 'Failed to update opportunity'
        
        if (Array.isArray(errorData)) {
          // Salesforce returns errors as an array
          errorMessage = errorData.map((err: any) => err.message || err.errorCode || 'Unknown error').join(', ')
        } else if (errorData?.message) {
          errorMessage = errorData.message
        } else if (errorData?.error_description) {
          errorMessage = errorData.error_description
        } else if (typeof errorData === 'string') {
          errorMessage = errorData
        } else if (errorData && Object.keys(errorData).length > 0) {
          errorMessage = JSON.stringify(errorData)
        }
        
        console.error('❌ Salesforce update error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: errorData,
          opportunityId,
          opportunityData
        })
        
        throw new Error(`Salesforce API error: ${errorMessage}`)
      }
      console.error('❌ Update error (no response):', error.message)
      throw new Error(`Failed to update opportunity: ${error.message}`)
    }
  }

  /**
   * Delete an Opportunity from Salesforce
   */
  async deleteOpportunity(opportunityId: string): Promise<void> {
    try {
      const client = this.getAuthenticatedClient()
      const apiVersion = process.env.SALESFORCE_API_VERSION || 'v58.0'
      
      const response = await client.delete(`/services/data/${apiVersion}/sobjects/Opportunity/${opportunityId}`)

      if (response.status !== 204) {
        throw new Error('Failed to delete opportunity: Unexpected response status')
      }
    } catch (error: any) {
      if (error.response) {
        const errorMessage = error.response.data?.[0]?.message || 
                           error.response.data?.message || 
                           'Failed to delete opportunity'
        throw new Error(`Salesforce API error: ${errorMessage}`)
      }
      throw new Error(`Failed to delete opportunity: ${error.message}`)
    }
  }

  /**
   * Create a Lead in Salesforce
   */
  async createLead(leadData: {
    FirstName: string
    LastName: string
    Company: string
    Email: string
    Status: string
    Phone?: string
    Title?: string
  }): Promise<string> {
    try {
      const client = this.getAuthenticatedClient()
      const apiVersion = process.env.SALESFORCE_API_VERSION || 'v58.0'
      
      const response = await client.post<{ id: string; success: boolean; errors: string[] }>(
        `/services/data/${apiVersion}/sobjects/Lead`,
        leadData
      )

      if (!response.data.success) {
        throw new Error(`Failed to create lead: ${response.data.errors?.join(', ') || 'Unknown error'}`)
      }

      return response.data.id
    } catch (error: any) {
      if (error.response) {
        const errorMessage = error.response.data?.[0]?.message || 
                           error.response.data?.message || 
                           'Failed to create lead'
        throw new Error(`Salesforce API error: ${errorMessage}`)
      }
      throw new Error(`Failed to create lead: ${error.message}`)
    }
  }

  /**
   * Get all Leads from Salesforce
   */
  async getLeads(): Promise<any[]> {
    try {
      const client = this.getAuthenticatedClient()
      const apiVersion = process.env.SALESFORCE_API_VERSION || 'v58.0'
      
      const query = `SELECT Id, FirstName, LastName, Company, Email, Status, Phone, Title, CreatedDate, LastModifiedDate FROM Lead ORDER BY CreatedDate DESC LIMIT 100`
      
      const response = await client.get<{
        totalSize: number
        done: boolean
        records: any[]
      }>(`/services/data/${apiVersion}/query`, {
        params: { q: query }
      })

      return response.data.records
    } catch (error: any) {
      if (error.response) {
        const errorMessage = error.response.data?.[0]?.message || 
                           error.response.data?.message || 
                           'Failed to fetch leads'
        throw new Error(`Salesforce API error: ${errorMessage}`)
      }
      throw new Error(`Failed to fetch leads: ${error.message}`)
    }
  }

  /**
   * Update a Lead in Salesforce
   */
  async updateLead(leadId: string, leadData: Partial<{
    FirstName: string
    LastName: string
    Company: string
    Email: string
    Status: string
    Phone?: string
    Title?: string
  }>): Promise<void> {
    try {
      const client = this.getAuthenticatedClient()
      const apiVersion = process.env.SALESFORCE_API_VERSION || 'v58.0'
      
      // Filter out undefined/null values and build clean update object
      const cleanData: any = {}
      if (leadData.FirstName !== undefined && leadData.FirstName !== null) {
        cleanData.FirstName = leadData.FirstName
      }
      if (leadData.LastName !== undefined && leadData.LastName !== null) {
        cleanData.LastName = leadData.LastName
      }
      if (leadData.Company !== undefined && leadData.Company !== null) {
        cleanData.Company = leadData.Company
      }
      if (leadData.Email !== undefined && leadData.Email !== null) {
        cleanData.Email = leadData.Email
      }
      if (leadData.Status !== undefined && leadData.Status !== null) {
        cleanData.Status = leadData.Status
      }
      if (leadData.Phone !== undefined && leadData.Phone !== null) {
        cleanData.Phone = leadData.Phone
      }
      if (leadData.Title !== undefined && leadData.Title !== null) {
        cleanData.Title = leadData.Title
      }

      console.log('📝 Updating lead in Salesforce:', {
        leadId,
        updateData: cleanData
      })

      const response = await client.patch(
        `/services/data/${apiVersion}/sobjects/Lead/${leadId}`,
        cleanData
      )

      // Salesforce PATCH returns 204 No Content on success
      if (response.status === 204 || response.status === 200) {
        console.log('✅ Lead updated successfully in Salesforce:', leadId)
        return
      }
      
      throw new Error(`Unexpected response status: ${response.status}`)
    } catch (error: any) {
      if (error.response) {
        const errorData = error.response.data
        let errorMessage = 'Failed to update lead'
        
        if (Array.isArray(errorData)) {
          errorMessage = errorData.map((err: any) => err.message || err.errorCode || 'Unknown error').join(', ')
        } else if (errorData?.message) {
          errorMessage = errorData.message
        } else if (errorData?.error_description) {
          errorMessage = errorData.error_description
        } else if (typeof errorData === 'string') {
          errorMessage = errorData
        } else if (errorData && Object.keys(errorData).length > 0) {
          errorMessage = JSON.stringify(errorData)
        }
        
        console.error('❌ Salesforce update error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: errorData,
          leadId,
          leadData
        })
        
        throw new Error(`Salesforce API error: ${errorMessage}`)
      }
      console.error('❌ Update error (no response):', error.message)
      throw new Error(`Failed to update lead: ${error.message}`)
    }
  }

  /**
   * Delete a Lead from Salesforce
   */
  async deleteLead(leadId: string): Promise<void> {
    try {
      const client = this.getAuthenticatedClient()
      const apiVersion = process.env.SALESFORCE_API_VERSION || 'v58.0'
      
      const response = await client.delete(`/services/data/${apiVersion}/sobjects/Lead/${leadId}`)

      if (response.status !== 204) {
        throw new Error('Failed to delete lead: Unexpected response status')
      }
    } catch (error: any) {
      if (error.response) {
        const errorMessage = error.response.data?.[0]?.message || 
                           error.response.data?.message || 
                           'Failed to delete lead'
        throw new Error(`Salesforce API error: ${errorMessage}`)
      }
      throw new Error(`Failed to delete lead: ${error.message}`)
    }
  }

  /**
   * Create a new instance with different credentials
   */
  static async createWithCredentials(credentials: SalesforceCredentials): Promise<SalesforceService> {
    const service = new SalesforceService()
    await service.authenticate(credentials)
    return service
  }
}

