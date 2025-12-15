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

export interface UpdateOpportunityRequest {
  opportunityId: string
  opportunity: Partial<OpportunityData>
  partnerCredentials: SalesforceCredentials
  syncToRaintree?: boolean
}

export interface DeleteOpportunityRequest {
  opportunityId: string
  partnerCredentials: SalesforceCredentials
  syncToRaintree?: boolean
  raintreeOpportunityId?: string
}

export interface LeadData {
  FirstName: string
  LastName: string
  Company: string
  Email: string
  Status: string
  Phone?: string
  Title?: string
}

export interface SalesforceLead {
  Id: string
  FirstName?: string
  LastName?: string
  Company?: string
  Email?: string
  Status?: string
  Phone?: string
  Title?: string
  CreatedDate?: string
  LastModifiedDate?: string
}

export interface CreateLeadRequest {
  lead: LeadData
  partnerCredentials: SalesforceCredentials
  syncToRaintree?: boolean
}

export interface UpdateLeadRequest {
  leadId: string
  lead: Partial<LeadData>
  partnerCredentials: SalesforceCredentials
  syncToRaintree?: boolean
  raintreeLeadId?: string
}

export interface DeleteLeadRequest {
  leadId: string
  partnerCredentials: SalesforceCredentials
  syncToRaintree?: boolean
  raintreeLeadId?: string
}

