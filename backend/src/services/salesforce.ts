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
   * Create a new instance with different credentials
   */
  static async createWithCredentials(credentials: SalesforceCredentials): Promise<SalesforceService> {
    const service = new SalesforceService()
    await service.authenticate(credentials)
    return service
  }
}

