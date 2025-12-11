export interface SalesforceCredentials {
  email: string
  password: string
  securityToken: string
}

export interface SalesforceAuthResponse {
  access_token: string
  instance_url: string
  id: string
  token_type: string
  issued_at: string
  signature: string
}

export interface OpportunityData {
  Name: string
  StageName: string
  Amount: number
  CloseDate: string
}

export interface SalesforceOpportunity {
  Id: string
  Name: string
  StageName: string
  Amount: number
  CloseDate: string
  CreatedDate?: string
  LastModifiedDate?: string
}

export interface CreateOpportunityRequest {
  opportunity: OpportunityData
  partnerCredentials: SalesforceCredentials
  syncToRaintree?: boolean
}

