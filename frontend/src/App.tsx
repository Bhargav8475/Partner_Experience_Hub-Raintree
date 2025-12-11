import { useState, useEffect } from 'react'
import { Cloud, Lock, CheckCircle, X, Loader2, Building2, Calendar, DollarSign, TrendingUp, Users, Briefcase, LogOut, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Sidebar, SidebarHeader, SidebarContent, SidebarItem, SidebarFooter } from '@/components/ui/sidebar'
import { salesforceAPI } from '@/services/salesforce'

// Types
interface Opportunity {
  id: string
  name: string
  stage: string
  amount: number
  closeDate: string
  synced: boolean
}

interface Lead {
  id: string
  firstName: string
  lastName: string
  company: string
  email: string
  status: string
  synced: boolean
}

function App() {
  // State Management
  const [step, setStep] = useState<number>(1)
  const [email, setEmail] = useState<string>('demo@example.com')
  const [password, setPassword] = useState<string>('password123')
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false)
  const [salesforceUsername, setSalesforceUsername] = useState<string>('priyatham@dataskate.io')
  const [salesforcePassword, setSalesforcePassword] = useState<string>('IhaveNOpassword@369')
  const [salesforceToken, setSalesforceToken] = useState<string>('TcFg3Y5X4kKyjaqNAo0QHJzgA')
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false)
  const [showSuccess, setShowSuccess] = useState<boolean>(false)
  const [showOpportunityModal, setShowOpportunityModal] = useState<boolean>(false)
  const [showLeadModal, setShowLeadModal] = useState<boolean>(false)
  const [activeSection, setActiveSection] = useState<'opportunities' | 'leads'>('opportunities')
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState<boolean>(false)
  
  // Opportunity form state
  const [oppName, setOppName] = useState<string>('')
  const [oppStage, setOppStage] = useState<string>('Prospecting')
  const [oppAmount, setOppAmount] = useState<string>('')
  const [oppCloseDate, setOppCloseDate] = useState<string>('')
  const [syncToRaintree, setSyncToRaintree] = useState<boolean>(false)

  // Lead form state
  const [leadFirstName, setLeadFirstName] = useState<string>('')
  const [leadLastName, setLeadLastName] = useState<string>('')
  const [leadCompany, setLeadCompany] = useState<string>('')
  const [leadEmail, setLeadEmail] = useState<string>('')
  const [leadStatus, setLeadStatus] = useState<string>('Open - Not Contacted')
  const [syncLeadToRaintree, setSyncLeadToRaintree] = useState<boolean>(false)

  // Step 1: Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setStep(2)
  }

  // Step 2: Handle Salesforce Authentication
  const handleSalesforceAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAuthenticating(true)
    setShowSuccess(false)
    setError(null)

    try {
      await salesforceAPI.authenticate(salesforceUsername, salesforcePassword, salesforceToken)
      setIsAuthenticating(false)
      setShowSuccess(true)

      // Move to dashboard after showing success
      setTimeout(() => {
        setShowAuthModal(false)
        setStep(3)
        setShowSuccess(false)
        // Load initial data from Salesforce
        loadSalesforceData()
      }, 1500)
    } catch (err: any) {
      setIsAuthenticating(false)
      setError(err.message || 'Failed to authenticate with Salesforce. Please check your credentials.')
      console.error('Authentication error:', err)
    }
  }

  // Load data from Salesforce
  const loadSalesforceData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [sfOpportunities, sfLeads] = await Promise.all([
        salesforceAPI.getOpportunities(),
        salesforceAPI.getLeads()
      ])

      // Transform Salesforce opportunities to our format
      const transformedOpps: Opportunity[] = sfOpportunities.map((opp: any) => ({
        id: opp.Id,
        name: opp.Name,
        stage: opp.StageName,
        amount: opp.Amount || 0,
        closeDate: opp.CloseDate,
        synced: true
      }))

      // Transform Salesforce leads to our format
      const transformedLeads: Lead[] = sfLeads.map((lead: any) => ({
        id: lead.Id,
        firstName: lead.FirstName || '',
        lastName: lead.LastName || '',
        company: lead.Company || '',
        email: lead.Email || '',
        status: lead.Status || 'Open - Not Contacted',
        synced: true
      }))

      setOpportunities(transformedOpps)
      setLeads(transformedLeads)
    } catch (err: any) {
      setError(err.message || 'Failed to load data from Salesforce')
      console.error('Error loading data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Load data when dashboard is accessed
  useEffect(() => {
    if (step === 3) {
      loadSalesforceData()
    }
  }, [step])

  // Step 3: Handle Opportunity Creation
  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    setError(null)

    try {
      // Always sync to Salesforce (the toggle is for Raintree sync)
      const salesforceId = await salesforceAPI.createOpportunity({
        Name: oppName,
        StageName: oppStage,
        Amount: parseFloat(oppAmount) || 0,
        CloseDate: oppCloseDate
      }, syncToRaintree)

      const newOpportunity: Opportunity = {
        id: salesforceId,
        name: oppName,
        stage: oppStage,
        amount: parseFloat(oppAmount) || 0,
        closeDate: oppCloseDate,
        synced: syncToRaintree // This indicates if synced to Raintree
      }

      setOpportunities([...opportunities, newOpportunity])
      
      // Reset form
      setOppName('')
      setOppStage('Prospecting')
      setOppAmount('')
      setOppCloseDate('')
      setSyncToRaintree(false)
      setShowOpportunityModal(false)
    } catch (err: any) {
      setError(err.message || 'Failed to create opportunity in Salesforce')
      console.error('Error creating opportunity:', err)
    } finally {
      setIsCreating(false)
    }
  }

  // Handle Lead Creation
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    setError(null)

    try {
      // Always sync to Salesforce (the toggle is for Raintree sync)
      const salesforceId = await salesforceAPI.createLead({
        FirstName: leadFirstName,
        LastName: leadLastName,
        Company: leadCompany,
        Email: leadEmail,
        Status: leadStatus
      })

      const newLead: Lead = {
        id: salesforceId,
        firstName: leadFirstName,
        lastName: leadLastName,
        company: leadCompany,
        email: leadEmail,
        status: leadStatus,
        synced: syncLeadToRaintree // This indicates if synced to Raintree
      }

      setLeads([...leads, newLead])
      
      // Reset form
      setLeadFirstName('')
      setLeadLastName('')
      setLeadCompany('')
      setLeadEmail('')
      setLeadStatus('Open - Not Contacted')
      setSyncLeadToRaintree(false)
      setShowLeadModal(false)
    } catch (err: any) {
      setError(err.message || 'Failed to create lead in Salesforce')
      console.error('Error creating lead:', err)
    } finally {
      setIsCreating(false)
    }
  }

  // Progress Bar Component - Only shown after login
  const ProgressBar = () => {
    const steps = [
      { num: 1, label: 'Connect CRM', active: step >= 2 },
      { num: 2, label: 'Ready', active: step >= 3 }
    ]

    return (
      <div className="w-full max-w-4xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {steps.map((stepItem, index) => (
            <div key={stepItem.num} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    stepItem.active
                      ? 'bg-salesforce-blue text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {stepItem.active ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    stepItem.num
                  )}
                </div>
                <span
                  className={`mt-2 text-sm font-medium ${
                    stepItem.active ? 'text-salesforce-blue' : 'text-gray-500'
                  }`}
                >
                  {stepItem.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-1 flex-1 mx-2 transition-all ${
                    stepItem.active ? 'bg-salesforce-blue' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress Bar - Show only after login (step 2 and 3) */}
      {step >= 2 && <ProgressBar />}

      {/* Step 1: Login Screen */}
      {step === 1 && (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-6">
                <img 
                  src="/image.png" 
                  alt="Raintree Systems" 
                  className="h-16 object-contain"
                />
              </div>
              <CardTitle className="text-3xl font-semibold mb-2">Partner Experience Hub</CardTitle>
              <CardDescription className="text-base">
                Powered by Raintree Systems
              </CardDescription>
              <div className="mt-6 pt-6 border-t">
                <CardTitle className="text-xl font-semibold mb-1">Sign in</CardTitle>
                <CardDescription>
                  Enter your credentials to access your account
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="demo@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-salesforce-blue hover:bg-[#0088C7] text-white"
                >
                  Sign in
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-4">
                  Default credentials: demo@example.com / password123
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: CRM Selection */}
      {step === 2 && (
        <div className="min-h-screen py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Connect your CRM to start syncing
              </h1>
              <p className="text-gray-600 text-lg">
                Select your source of truth to begin synchronizing opportunities
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {/* Salesforce Card - Primary */}
              <div
                onClick={() => setShowAuthModal(true)}
                className="bg-white rounded-xl shadow-lg border-4 border-salesforce-blue p-8 cursor-pointer hover:shadow-2xl transition-all transform hover:scale-105 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 bg-salesforce-blue text-white px-3 py-1 text-xs font-semibold rounded-bl-lg">
                  RECOMMENDED
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center mb-4 p-2">
                    <img 
                      src="/salesforce-logo.png" 
                      alt="Salesforce" 
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Salesforce</h3>
                  <p className="text-gray-600 mb-6">
                    Connect your Salesforce organization to sync opportunities
                  </p>
                  <button className="w-full bg-salesforce-blue text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors">
                    Connect
                  </button>
                </div>
              </div>

              {/* HubSpot Card - Coming Soon */}
              <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-8 opacity-60 cursor-not-allowed relative">
                <div className="absolute top-0 right-0 bg-gray-400 text-white px-3 py-1 text-xs font-semibold rounded-bl-lg">
                  COMING SOON
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                    <Building2 className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-500 mb-2">HubSpot</h3>
                  <p className="text-gray-500 mb-6">
                    HubSpot integration coming soon
                  </p>
                  <button
                    disabled
                    className="w-full bg-gray-300 text-gray-500 py-3 rounded-lg font-semibold cursor-not-allowed"
                  >
                    Coming Soon
                  </button>
                </div>
              </div>

              {/* Zoho Card - Coming Soon */}
              <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-8 opacity-60 cursor-not-allowed relative">
                <div className="absolute top-0 right-0 bg-gray-400 text-white px-3 py-1 text-xs font-semibold rounded-bl-lg">
                  COMING SOON
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                    <Building2 className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-500 mb-2">Zoho</h3>
                  <p className="text-gray-500 mb-6">
                    Zoho integration coming soon
                  </p>
                  <button
                    disabled
                    className="w-full bg-gray-300 text-gray-500 py-3 rounded-lg font-semibold cursor-not-allowed"
                  >
                    Coming Soon
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Dashboard with Sidebar */}
      {step === 3 && (
        <div className="flex h-screen bg-gray-50">
          {/* Sidebar */}
          <Sidebar>
            <SidebarHeader>
              <div className="flex items-center space-x-3">
                <img 
                  src="/salesforce-logo.png" 
                  alt="Salesforce" 
                  className="h-8 object-contain"
                />
                <div>
                  <p className="font-semibold text-sm">Partner Experience</p>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-muted-foreground">Connected</span>
                  </div>
                </div>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarItem
                active={activeSection === 'opportunities'}
                onClick={() => setActiveSection('opportunities')}
              >
                <Briefcase className="w-5 h-5" />
                <span>Opportunities</span>
              </SidebarItem>
              <SidebarItem
                active={activeSection === 'leads'}
                onClick={() => setActiveSection('leads')}
              >
                <Users className="w-5 h-5" />
                <span>Leads</span>
              </SidebarItem>
            </SidebarContent>
            <SidebarFooter>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  salesforceAPI.logout()
                  setStep(1)
                  setOpportunities([])
                  setLeads([])
                  setError(null)
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span>Logout</span>
              </Button>
            </SidebarFooter>
          </Sidebar>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">{error}</p>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Header */}
              <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                      {activeSection === 'opportunities' ? 'Opportunities' : 'Leads'}
                    </h1>
                    <p className="text-gray-600 mt-1">
                      {activeSection === 'opportunities' 
                        ? 'Manage your sales opportunities' 
                        : 'Manage your leads and prospects'}
                    </p>
                  </div>
                  <Button
                    onClick={() => activeSection === 'opportunities' ? setShowOpportunityModal(true) : setShowLeadModal(true)}
                    className="bg-salesforce-blue hover:bg-[#0088C7] text-white"
                  >
                    {activeSection === 'opportunities' ? (
                      <>
                        <TrendingUp className="w-4 h-4 mr-2" />
                        <span>New Opportunity</span>
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4 mr-2" />
                        <span>New Lead</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Opportunities Content */}
              {activeSection === 'opportunities' && (
                <div className="bg-white rounded-xl shadow-md p-6">
                  {opportunities.length === 0 ? (
                    <div className="text-center py-12">
                      <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">No opportunities yet</p>
                      <p className="text-gray-400 mt-2">Click "New Opportunity" to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {opportunities.map((opp) => (
                        <div
                          key={opp.id}
                          className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="text-xl font-semibold text-gray-900">{opp.name}</h3>
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                  {opp.stage}
                                </span>
                                {opp.synced && (
                                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center space-x-1">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Synced</span>
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-6 text-gray-600">
                                <div className="flex items-center space-x-2">
                                  <DollarSign className="w-5 h-5" />
                                  <span className="font-semibold">${opp.amount.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Calendar className="w-5 h-5" />
                                  <span>{new Date(opp.closeDate).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Leads Content */}
              {activeSection === 'leads' && (
                <div className="bg-white rounded-xl shadow-md p-6">
                  {isLoading ? (
                    <div className="text-center py-12">
                      <Loader2 className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
                      <p className="text-gray-500">Loading leads...</p>
                    </div>
                  ) : leads.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">No leads yet</p>
                      <p className="text-gray-400 mt-2">Click "New Lead" to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {leads.map((lead) => (
                        <div
                          key={lead.id}
                          className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="text-xl font-semibold text-gray-900">
                                  {lead.firstName} {lead.lastName}
                                </h3>
                                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                                  {lead.status}
                                </span>
                                {lead.synced && (
                                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center space-x-1">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Synced</span>
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-6 text-gray-600">
                                <div className="flex items-center space-x-2">
                                  <Building2 className="w-5 h-5" />
                                  <span className="font-medium">{lead.company}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm">{lead.email}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Salesforce Authentication Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 relative">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="mb-6">
              <div className="flex items-center justify-center mb-4">
                <img 
                  src="/salesforce-logo.png" 
                  alt="Salesforce" 
                  className="h-10 object-contain"
                />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                Authenticate with Salesforce
              </h2>
              <p className="text-gray-600 text-center">
                Enter your Salesforce credentials to connect your organization
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {showSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-xl font-semibold text-gray-900">Success!</p>
                <p className="text-gray-600 mt-2">Your Salesforce account has been connected</p>
              </div>
            ) : (
              <form onSubmit={handleSalesforceAuth} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="sf-username" className="text-sm font-medium leading-none">
                    Salesforce Username
                  </label>
                  <Input
                    id="sf-username"
                    type="email"
                    value={salesforceUsername}
                    onChange={(e) => setSalesforceUsername(e.target.value)}
                    required
                    placeholder="username@example.com"
                    className="focus:ring-salesforce-blue"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="sf-password" className="text-sm font-medium leading-none">
                    Password
                  </label>
                  <Input
                    id="sf-password"
                    type="password"
                    value={salesforcePassword}
                    onChange={(e) => setSalesforcePassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    className="focus:ring-salesforce-blue"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="sf-token" className="text-sm font-medium leading-none">
                    Security Token
                  </label>
                  <Input
                    id="sf-token"
                    type="text"
                    value={salesforceToken}
                    onChange={(e) => setSalesforceToken(e.target.value)}
                    required
                    placeholder="Enter your security token"
                    className="focus:ring-salesforce-blue font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your security token is required for API authentication
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full bg-salesforce-blue hover:bg-[#0088C7] text-white"
                >
                  {isAuthenticating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <span>Connect Organization</span>
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Log Opportunity Modal */}
      {showOpportunityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-8 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowOpportunityModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Create Opportunity in Salesforce
              </h2>
              <p className="text-gray-600">
                Fill in the details to log a new opportunity
              </p>
            </div>

            <form onSubmit={handleCreateOpportunity} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="opp-name" className="text-sm font-medium leading-none">
                  Opportunity Name
                </label>
                <Input
                  id="opp-name"
                  type="text"
                  value={oppName}
                  onChange={(e) => setOppName(e.target.value)}
                  required
                  placeholder="e.g., Q4 Enterprise Deal"
                  className="focus:ring-salesforce-blue"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="opp-stage" className="text-sm font-medium leading-none">
                  Stage
                </label>
                <select
                  id="opp-stage"
                  value={oppStage}
                  onChange={(e) => setOppStage(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-salesforce-blue focus-visible:ring-offset-2"
                >
                  <option value="Prospecting">Prospecting</option>
                  <option value="Qualification">Qualification</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="opp-amount" className="text-sm font-medium leading-none">
                  Amount ($)
                </label>
                <Input
                  id="opp-amount"
                  type="number"
                  value={oppAmount}
                  onChange={(e) => setOppAmount(e.target.value)}
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="focus:ring-salesforce-blue"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="opp-date" className="text-sm font-medium leading-none">
                  Close Date
                </label>
                <Input
                  id="opp-date"
                  type="date"
                  value={oppCloseDate}
                  onChange={(e) => setOppCloseDate(e.target.value)}
                  required
                  className="focus:ring-salesforce-blue"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label htmlFor="sync-toggle" className="block text-sm font-medium text-gray-700 mb-1">
                    Sync to Raintree Systems immediately
                  </label>
                  <p className="text-xs text-gray-500">
                    Enable automatic synchronization upon creation
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    id="sync-toggle"
                    type="checkbox"
                    checked={syncToRaintree}
                    onChange={(e) => setSyncToRaintree(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-salesforce-blue/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-salesforce-blue"></div>
                </label>
              </div>

              <div className="flex space-x-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowOpportunityModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 bg-salesforce-blue hover:bg-[#0088C7] text-white"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    'Create Opportunity'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Lead Modal */}
      {showLeadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-8 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowLeadModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Create Lead in Salesforce
              </h2>
              <p className="text-gray-600">
                Fill in the details to create a new lead
              </p>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="lead-firstname" className="text-sm font-medium leading-none">
                    First Name
                  </label>
                  <Input
                    id="lead-firstname"
                    type="text"
                    value={leadFirstName}
                    onChange={(e) => setLeadFirstName(e.target.value)}
                    required
                    placeholder="John"
                    className="focus:ring-salesforce-blue"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="lead-lastname" className="text-sm font-medium leading-none">
                    Last Name
                  </label>
                  <Input
                    id="lead-lastname"
                    type="text"
                    value={leadLastName}
                    onChange={(e) => setLeadLastName(e.target.value)}
                    required
                    placeholder="Doe"
                    className="focus:ring-salesforce-blue"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="lead-company" className="text-sm font-medium leading-none">
                  Company
                </label>
                <Input
                  id="lead-company"
                  type="text"
                  value={leadCompany}
                  onChange={(e) => setLeadCompany(e.target.value)}
                  required
                  placeholder="Acme Inc."
                  className="focus:ring-salesforce-blue"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="lead-email" className="text-sm font-medium leading-none">
                  Email
                </label>
                <Input
                  id="lead-email"
                  type="email"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  required
                  placeholder="john.doe@acme.com"
                  className="focus:ring-salesforce-blue"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="lead-status" className="text-sm font-medium leading-none">
                  Status
                </label>
                <select
                  id="lead-status"
                  value={leadStatus}
                  onChange={(e) => setLeadStatus(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-salesforce-blue focus-visible:ring-offset-2"
                >
                  <option value="Open - Not Contacted">Open - Not Contacted</option>
                  <option value="Working - Contacted">Working - Contacted</option>
                  <option value="Closed - Converted">Closed - Converted</option>
                  <option value="Closed - Not Converted">Closed - Not Converted</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label htmlFor="sync-lead-toggle" className="block text-sm font-medium text-gray-700 mb-1">
                    Sync to Raintree Systems immediately
                  </label>
                  <p className="text-xs text-gray-500">
                    Enable automatic synchronization upon creation
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    id="sync-lead-toggle"
                    type="checkbox"
                    checked={syncLeadToRaintree}
                    onChange={(e) => setSyncLeadToRaintree(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-salesforce-blue/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-salesforce-blue"></div>
                </label>
              </div>

              <div className="flex space-x-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowLeadModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 bg-salesforce-blue hover:bg-[#0088C7] text-white"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    'Create Lead'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

